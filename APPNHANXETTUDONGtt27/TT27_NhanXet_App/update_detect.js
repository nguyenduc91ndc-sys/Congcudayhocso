import fs from 'fs';

let content = fs.readFileSync('src/remark_engine.js', 'utf8');

// Thay thế khai báo detectHeader thành detectHeaders
const newDetectHeader = `
/**
 * Phát hiện danh sách các cột nhận xét trên sheet
 * Trả về mảng: [{ headerRow, subjectCol, levelCol, remarkCol, subjectName }]
 */
function detectHeaders(ws) {
  const headers = [];
  let headerRow = 1;
  const remarkCols = [];

  ws.eachRow((row, rowNum) => {
    if (rowNum > 5) return;
    row.eachCell((cell, colNum) => {
      const v = normalizeVN(getCellText(cell));
      const rawName = getCellText(cell);
      // Tìm các cột Nhận xét
      if (['NOI DUNG', 'NHAN XET', 'GHI CHU', 'NX'].some(k => v.includes(k)) && !v.includes('MA NHAN XET') && !v.includes('NHAN XET CHUNG')) {
        remarkCols.push({ colNum, rowNum, name: v, rawName });
      }
    });
  });

  // Fallback: nếu không có cột nào rõ ràng thì tìm A, B, C, T, H
  if (remarkCols.length === 0) {
    let rCol = -1, lCol = -1;
    ws.eachRow((row, rowNum) => {
      if (rowNum < 2 || rowNum > 15) return;
      row.eachCell((cell, colNum) => {
        const v = getCellText(cell);
        if (['A', 'B', 'C', 'T', 'H'].includes(v) || /^Điểm \\d+$/i.test(v)) {
          if (lCol < 0) lCol = colNum;
          if (rCol < 0) rCol = colNum + 1;
        }
      });
    });
    if (rCol > 0) remarkCols.push({ colNum: rCol, rowNum: 1, rawName: 'NHẬN XÉT' });
  }

  if (remarkCols.length === 0) return [];

  remarkCols.forEach(rc => {
    let subjectName = ws.name;
    let r1 = getCellText(ws.getCell(1, rc.colNum));
    let r2 = getCellText(ws.getCell(2, rc.colNum));
    let r1c1 = getCellText(ws.getCell(1, 1));
    let r2c1 = getCellText(ws.getCell(2, 1));

    let megaHeader = \`\${ws.name} \${r1c1} \${r2c1} \${r1} \${r2} \${rc.rawName}\`;
    subjectName = megaHeader;

    let levelCol = -1;
    // Tìm cột level gần nhất bên trái có chữ MUC, XEP LOAI, v.v.
    for (let c = rc.colNum - 1; c >= Math.max(1, rc.colNum - 5); c--) {
      const v1 = normalizeVN(getCellText(ws.getCell(1, c)));
      const v2 = normalizeVN(getCellText(ws.getCell(2, c)));
      const v3 = normalizeVN(getCellText(ws.getCell(3, c)));
      if (['MUC', 'XEP LOAI', 'KET QUA', 'DANH GIA'].some(k => v1.includes(k) || v2.includes(k) || v3.includes(k))) {
        levelCol = c; break;
      }
    }

    headers.push({
      headerRow: rc.rowNum || 1,
      remarkCol: rc.colNum,
      levelCol: levelCol, // Nếu -1, sẽ quét toàn bộ dòng
      subjectName: subjectName
    });
  });

  return headers;
}
`;

content = content.replace(/\/\*\*\n \* Phát hiện cấu trúc bảng[\s\S]+?(?=function isLevelValue)/, newDetectHeader);

// Update export
content = content.replace('export { detectHeader, toLevel, getCellText, normalizeSubject };', 'export { detectHeaders, toLevel, getCellText, normalizeSubject };');

// Update processExcel
const oldProcessExcelBody = `
    // Phát hiện cấu trúc: tìm header row
    const header = detectHeader(ws);
    if (!header) { report.sheets.push(sheetInfo); continue; }
    
    const grade = detectGrade(ws); // Nhận diện khối lớp từ trang tính

    const { subjectCol, levelCol, remarkCol, subjectName } = header;
    const subject = normalizeSubject(subjectName);

    let studentIndex = 0;
    ws.eachRow((row, rowNum) => {
      if (rowNum <= header.headerRow) return;

      const levelCell = row.getCell(levelCol);
      const remarkCell = row.getCell(remarkCol);

      const levelVal = getCellText(levelCell);
      const level = toLevel(levelVal);
      if (!level) return;

      // Chỉ điền nếu ô nhận xét đang trống
      const currentRemark = getCellText(remarkCell);
      if (currentRemark) { studentIndex++; return; }

      report.total++;
      // Bank mode - sync
      let comment = '';
      if (mode === 'bank') {
        comment = getComment(subject, level, studentIndex, grade);
      }
      // AI mode sẽ được xử lý riêng ở dưới (async batch)
      if (comment) {
        setCellText(remarkCell, comment);
        // Giữ font và fill gốc
        sheetInfo.filled++;
        report.filled++;
      }
      studentIndex++;
    });

    report.sheets.push(sheetInfo);
    if (onProgress) onProgress(report.filled, totalCells || 1);
`;

const newProcessExcelBody = `
    const headers = detectHeaders(ws);
    if (!headers || headers.length === 0) { report.sheets.push(sheetInfo); continue; }
    
    const grade = detectGrade(ws); // Nhận diện khối lớp từ trang tính

    for (const header of headers) {
        const { levelCol, remarkCol, subjectName } = header;
        const subject = normalizeSubject(subjectName);

        let studentIndex = 0;
        ws.eachRow((row, rowNum) => {
          if (rowNum <= header.headerRow) return;

          let level = '';
          if (levelCol > 0) {
             const levelCell = row.getCell(levelCol);
             level = toLevel(getCellText(levelCell));
          } else {
             // Heuristic: đếm số lượng T, H(Đ), C từ các cột phía trước remarkCol trên dòng này
             let counts = { 'T': 0, 'H': 0, 'C': 0 };
             row.eachCell((cell, cNum) => {
                if (cNum >= remarkCol) return;
                const v = toLevel(getCellText(cell));
                if (v && counts[v] !== undefined) counts[v]++;
             });
             if (counts.T >= counts.H && counts.T >= counts.C && counts.T > 0) level = 'T';
             else if (counts.H >= counts.T && counts.H >= counts.C && counts.H > 0) level = 'H';
             else if (counts.C > 0) level = 'C';
          }
          
          if (!level) return;

          const remarkCell = row.getCell(remarkCol);
          const currentRemark = getCellText(remarkCell);
          if (currentRemark) { studentIndex++; return; }

          report.total++;
          let comment = '';
          if (mode === 'bank') {
            comment = getComment(subject, level, studentIndex, grade);
          }
          if (comment) {
            setCellText(remarkCell, comment);
            sheetInfo.filled++;
            report.filled++;
          }
          studentIndex++;
        });
    }

    report.sheets.push(sheetInfo);
    if (onProgress) onProgress(report.filled, totalCells || 1);
`;
content = content.replace(oldProcessExcelBody, newProcessExcelBody);

// Update processAiMode
const oldAiBody = `
  for (const ws of wb.worksheets) {
    const header = detectHeader(ws);
    if (!header) continue;
    
    const grade = detectGrade(ws); // Khối lớp
    const { levelCol, remarkCol, subjectName } = header;
    const subject = subjectName || 'Môn học';

    const tasks = [];
    ws.eachRow((row, rowNum) => {
      if (rowNum <= header.headerRow) return;
      const levelCell = row.getCell(levelCol);
      const remarkCell = row.getCell(remarkCol);
      const level = toLevel(getCellText(levelCell));
      if (!level) return;
      if (getCellText(remarkCell)) return;
      tasks.push({ row, remarkCell, subject, level });
    });
`;

const newAiBody = `
  for (const ws of wb.worksheets) {
    const headers = detectHeaders(ws);
    if (!headers || headers.length === 0) continue;
    
    const grade = detectGrade(ws); // Khối lớp
    
    const tasks = [];
    
    for (const header of headers) {
        const { levelCol, remarkCol, subjectName } = header;
        const subject = normalizeSubject(subjectName) || 'Môn học';

        ws.eachRow((row, rowNum) => {
          if (rowNum <= header.headerRow) return;

          let level = '';
          if (levelCol > 0) {
             const levelCell = row.getCell(levelCol);
             level = toLevel(getCellText(levelCell));
          } else {
             // Heuristic: đếm số lượng T, H, C từ các cột
             let counts = { 'T': 0, 'H': 0, 'C': 0 };
             row.eachCell((cell, cNum) => {
                if (cNum >= remarkCol) return;
                const v = toLevel(getCellText(cell));
                if (v && counts[v] !== undefined) counts[v]++;
             });
             if (counts.T >= counts.H && counts.T >= counts.C && counts.T > 0) level = 'T';
             else if (counts.H >= counts.T && counts.H >= counts.C && counts.H > 0) level = 'H';
             else if (counts.C > 0) level = 'C';
          }

          if (!level) return;
          const remarkCell = row.getCell(remarkCol);
          if (getCellText(remarkCell)) return;
          
          tasks.push({ row, remarkCell, subject, level, grade });
        });
    }
`;
content = content.replace(oldAiBody, newAiBody);

// Inside AI batch, grade is now part of t.grade instead of global grade, but grade is same per sheet so grade works or t.grade works.
content = content.replace(/grade\)/g, "t.grade)");

fs.writeFileSync('src/remark_engine.js', content);
console.log('remark_engine.js updated');

// Update main.js
let mainCode = fs.readFileSync('src/main.js', 'utf8');
mainCode = mainCode.replace(/import \{ processExcel, getCellText, detectHeader \} from '.\/remark_engine.js';/, "import { processExcel, getCellText, detectHeaders } from './remark_engine.js';");
mainCode = mainCode.replace(/if \(ws.rowCount > 0 && detectHeader\(ws\)\) \{/, "if (ws.rowCount > 0 && detectHeaders(ws).length > 0) {");
fs.writeFileSync('src/main.js', mainCode);
console.log('main.js updated');

