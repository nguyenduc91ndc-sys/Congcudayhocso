/**
 * remark_engine.js
 * Engine xử lý: đọc Excel, sinh nhận xét (Bank / AI), ghi lại file
 */

import ExcelJS from 'exceljs';
import { getComment, getNlpcComment, scoreToLevel } from './comment_bank.js';

// ===== MAPPING TÊN MÔN =====
const SUBJECT_MAP = {
  'TOÁN': 'TOAN',
  'TIẾNG VIỆT': 'TV',
  'TIẾNG ANH': 'TA', 'NGOẠI NGỮ': 'TA',
  'ĐẠO ĐỨC': 'DD',
  'TỰ NHIÊN VÀ XÃ HỘI': 'TNXH',
  'KHOA HỌC': 'KHOA',
  'LỊCH SỬ': 'LSDL', 'ĐỊA LÍ': 'LSDL', 'ĐỊA LÝ': 'LSDL',
  'ÂM NHẠC': 'AN',
  'MĨ THUẬT': 'MT', 'MỸ THUẬT': 'MT',
  'THỂ CHẤT': 'GDTC', 'THỂ DỤC': 'GDTC',
  'TIN HỌC': 'TIN',
  'CÔNG NGHỆ': 'CN',
  'TRẢI NGHIỆM': 'HDTN',
  // ===== PHẨM CHẤT & NĂNG LỰC (TT27 / GDPT 2018) =====
  'PHẨM CHẤT': 'PC',
  'NĂNG LỰC CHUNG': 'NLC',
  'NĂNG LỰC': 'NLPC',   // fallback cho cột "Năng lực" không rõ loại
};

function normalizeSubject(name) {
  if (!name) return '';
  const up = normalizeVN(name);

  // Ưu tiên kiểm tra Phẩm chất trước (tránh nhầm với Năng lực)
  if (up.includes('PHAM CHAT')) return 'PC';

  // Năng lực chung (NLC) vs Năng lực đặc thù môn học
  if (up.includes('NANG LUC CHUNG')) return 'NLC';

  // Kiểm tra từng môn trong map
  for (const [k, v] of Object.entries(SUBJECT_MAP)) {
    const kn = normalizeVN(k);
    if (up.includes(kn) || kn.includes(up)) return v;
  }

  // Thử lại các từ khóa ngắn
  if (up.includes('TOAN')) return 'TOAN';
  if (up.includes('VIET')) return 'TV';
  if (up.includes('NANG LUC')) return 'NLPC';

  return ''; // Không nhận diện được → trả rỗng, tránh gán sai môn
}

/**
 * Lấy string text chuẩn từ cell (kể cả chứa RichText/Formula)
 */
function getCellText(cell) {
  if (!cell) return '';
  // Xử lý Merge cell (Trộn ô): lấy giá trị từ ô chủ (master)
  if (cell.isMerged && cell.master) {
    cell = cell.master;
  }
  // Nếu là dạng richText
  if (cell.value && cell.value.richText) {
    return cell.value.richText.map(rt => rt.text).join('').trim();
  }
  // Nếu cell.text có giá trị thật sự
  if (cell.text && typeof cell.text === 'string') {
    return cell.text.trim();
  }
  // Ép kiểu giá trị (né '[object Object]')
  const val = cell.value;
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
     // fallback formula result
     if (val.result !== undefined) return String(val.result).trim();
     return ''; // object khác coi như rỗng để cho phép đè
  }
  return String(val).trim();
}

/**
 * Quy đổi mức chữ/điểm sang T/H/C
 */
function toLevel(val) {
  if (!val) return '';
  const s = String(val).trim().toUpperCase();
  if (['T', 'TỐT', 'A', 'ĐIỂM 10', 'ĐIỂM 9', '10', '9'].includes(s)) return 'T';
  if (['H', 'HOÀN THÀNH', 'HT', 'B', 'Đ', 'ĐẠT', 'ĐIỂM 8', 'ĐIỂM 7', 'ĐIỂM 6', '8', '7', '6'].includes(s)) return 'H';
  if (['C', 'CHƯA HT', 'CHT', 'ĐIỂM 5', '5', '4', '3', '2', '1'].includes(s)) return 'C';
  // Số
  const n = parseFloat(s.replace(',', '.'));
  if (!isNaN(n)) return scoreToLevel(n);
  return '';
}

/**
 * Tự động nhận diện khối lớp từ file Excel
 */
function detectGrade(ws) {
  let grade = '45'; // Mặc định nếu không tìm thấy
  for (let r = 1; r <= Math.min(15, ws.rowCount); r++) {
    const row = ws.getRow(r);
    let found = false;
    row.eachCell(c => {
      const text = String(c.value || '').toUpperCase();
      const match = text.match(/L[ỚO]P\s*[:\-]*\s*([12345])/);
      if (match) {
         grade = match[1];
         if (grade === '4' || grade === '5') grade = '45';
         found = true;
      }
    });
    if (found) break;
  }
  return grade;
}

/**
 * Groq API call
 */
async function callGroq(apiKey, model, prompt) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'openai/gpt-oss-20b',
      messages: [
        { role: 'system', content: 'Bạn là trợ lý giáo dục chuyên viết nhận xét học sinh Tiểu học theo Thông tư 27 và Chương trình GDPT 2018 (Thông tư 32). Trả về đúng MỘT câu cụt (hoặc mệnh đề ngắn) bằng tiếng Việt. TUYỆT ĐỐI KHÔNG dùng chủ ngữ (Không dùng "Em", "Học sinh", "Bạn này"). Bắt đầu câu thẳng vào Hành động/Năng lực (Ví dụ: Trình bày, Tính toán, Kĩ năng, Đọc, Viết, Thực hành...). Không ngoặc kép, không giải thích.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 120,
      temperature: 0.9,
    }),
  });
  if (!response.ok) throw new Error(`Groq API lỗi: ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}
function buildGroqPrompt(subject, level, sampleComments = []) {
  const lvMap = { T: 'Tốt', H: 'Hoàn thành', C: 'Chưa hoàn thành' };
  
  // Dựng chuỗi ví dụ từ thư viện mẫu của giáo viên gửi
  let examplesText = "";
  if (sampleComments.length > 0) {
    // Lấy tối đa 3 câu mẫu trộn ngẫu nhiên để làm context cho AI học theo style
    const selectedSamples = sampleComments.sort(() => 0.5 - Math.random()).slice(0, 3);
    examplesText = "\nHãy viết TƯƠNG TỰ CẤU TRÚC như các câu mẫu CỦA GIÁO VIÊN dưới đây nhưng thay đổi linh hoạt từ vựng:\n- " 
      + selectedSamples.join("\n- ");
  }

  return `Hãy sinh đúng 1 câu nhận xét khác biệt, mang tính cá nhân hóa (nhưng không dùng tên học sinh), dưới 15 từ, môn ${subject}, mức ${lvMap[level] || level}.
TUYỆT ĐỐI CẤM BẮT ĐẦU VÀ CẤM DÙNG các đại từ/danh từ/bổ ngữ: "Em", "Vì", "Trường hợp", "Học sinh", "Trong", "Bạn ấy", "Với", "Môn", "Năng lực...". 
CẤM GIẢI THÍCH (Vd cấm đoạn "để phát triển thêm..."). Phải đi vào thẳng động từ/cụm danh từ phản ánh đúng chuẩn kiến thức kĩ năng theo GDPT 2018. Dùng "i ngắn" (kĩ năng, mĩ thuật). Nghĩ ra một nhận xét MỚI LẠ, dùng từ vựng thay thế đa dạng để tránh trùng lặp gữa các học sinh.${examplesText}`;
}

/**
 * Main: xử lý file Excel
 * @param {ArrayBuffer} buffer - nội dung file
 * @param {Object} options - { mode: 'bank'|'ai', apiKey, model, bookSet, onProgress }
 * @returns {ArrayBuffer} - file đã điền nhận xét
 */
export async function processExcel(buffer, options = {}) {
  const { mode = 'bank', apiKey, model, onProgress, forceSubject, forceGrade } = options;

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  let totalCells = 0;
  let doneCells = 0;

  // Đếm tổng ô cần điền
  wb.eachSheet(ws => {
    ws.eachRow(row => {
      row.eachCell(cell => {
        const v = getCellText(cell);
        if (isLevelValue(v)) totalCells++;
      });
    });
  });

  const report = { total: 0, filled: 0, sheets: [] };

  for (const ws of wb.worksheets) {
    const sheetInfo = { name: ws.name, filled: 0 };
    
    // Phát hiện cấu trúc: trả về mảng các cặp cột Mức - Nhận xét
    let headers = detectHeaders(ws);
    
    // Nếu không detect được header chuẩn VÀ đang ở mode đơn môn → fallback detect đơn giản
    if ((!headers || headers.length === 0) && forceSubject) {
      headers = detectHeadersFallback(ws);
    }
    if (!headers || headers.length === 0) { report.sheets.push(sheetInfo); continue; }
    
    // Khối lớp: ưu tiên forceGrade nếu có, nếu không thì tự nhận diện
    const grade = forceGrade || detectGrade(ws);

    for (const header of headers) {
        const { subjectCol, levelCol, remarkCol, subjectName } = header;
        // Ưu tiên forceSubject nếu có (GV bộ môn đã chọn sẵn)
        const subject = forceSubject || normalizeSubject(subjectName);

        let studentIndex = 0;
        ws.eachRow((row, rowNum) => {
          if (rowNum <= header.headerRow) return;

          let level = '';
          if (levelCol > 0) {
             const levelCell = row.getCell(levelCol);
             level = toLevel(getCellText(levelCell));
          } else {
             // Heuristic: đếm số lượng T, H, C từ các ô phía trước trong cùng một dòng
             let counts = { 'T': 0, 'H': 0, 'C': 0 };
             row.eachCell((cell, colNum) => {
                 if (colNum >= remarkCol) return;
                 const v = toLevel(getCellText(cell));
                 if (v && counts[v] !== undefined) counts[v]++;
             });
             if (counts.T >= counts.H && counts.T >= counts.C && counts.T > 0) level = 'T';
             else if (counts.H >= counts.C && counts.H > 0) level = 'H';
             else if (counts.C > 0) level = 'C';
          }
          
          if (!level) return;

          const remarkCell = row.getCell(remarkCol);
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
    }

    report.sheets.push(sheetInfo);
    if (onProgress) onProgress(report.filled, totalCells || 1);
  }

  // AI mode: xử lý sau (vì async)
  if (mode === 'ai' && apiKey) {
    await processAiMode(wb, options, report);
  }

  const out = await wb.xlsx.writeBuffer();
  return out;
}

async function processAiMode(wb, options, report) {
  const { apiKey, model, bookSet, onProgress, forceSubject, forceGrade } = options;

  for (const ws of wb.worksheets) {
    let headers = detectHeaders(ws);
    if ((!headers || headers.length === 0) && forceSubject) {
      headers = detectHeadersFallback(ws);
    }
    if (!headers || headers.length === 0) continue;
    
    const grade = forceGrade || detectGrade(ws); // Khối lớp
    
    const tasks = [];
    
    for (const header of headers) {
        const { levelCol, remarkCol, subjectName } = header;
        const subject = subjectName || 'Môn học';

        ws.eachRow((row, rowNum) => {
          if (rowNum <= header.headerRow) return;
          
          let level = '';
          if (levelCol > 0) {
             const levelCell = row.getCell(levelCol);
             level = toLevel(getCellText(levelCell));
          } else {
             let counts = { 'T': 0, 'H': 0, 'C': 0 };
             row.eachCell((cell, cNum) => {
                 if (cNum >= remarkCol) return;
                 const v = toLevel(getCellText(cell));
                 if (v && counts[v] !== undefined) counts[v]++;
             });
             if (counts.T >= counts.H && counts.T >= counts.C && counts.T > 0) level = 'T';
             else if (counts.H >= counts.C && counts.H > 0) level = 'H';
             else if (counts.C > 0) level = 'C';
          }
          
          if (!level) return;
          
          const remarkCell = row.getCell(remarkCol);
          if (getCellText(remarkCell)) return;
          // Ưu tiên forceSubject nếu có
          tasks.push({ row, remarkCell, subject: forceSubject || normalizeSubject(subject), level, grade });
        });
    }

    // Batch gọi AI (5 cùng lúc)
    for (let i = 0; i < tasks.length; i += 5) {
      const batch = tasks.slice(i, i + 5);
      const results = await Promise.allSettled(batch.map(t => {
        // Lấy 2 câu mẫu ngẫu nhiên từ thư viện làm ví dụ
        let samples = [];
        try {
          const s = t.subject;
          // Để đa dạng, ta lấy index ngẫu nhiên hoặc dựa trên Time
          const randID1 = Math.floor(Math.random() * 50);
          const randID2 = Math.floor(Math.random() * 50);
          if (s === 'NLPC') {
            samples.push(getNlpcComment('NLPC', t.level, randID1, t.grade), getNlpcComment('NLPC', t.level, randID2, t.grade));
          } else {
            samples.push(getComment(s, t.level, randID1, t.grade), getComment(s, t.level, randID2, t.grade));
          }
          samples = samples.filter(x => x); // xoá rỗng
        } catch(e) {}
        
        return callGroq(apiKey, model, buildGroqPrompt(t.subject, t.level, samples));
      }));
      results.forEach((r, j) => {
        if (r.status === 'fulfilled' && r.value) {
          // Làm sạch chuỗi do AI trả về (xoá ngoặc kép ở 2 đầu)
          let cleanVal = r.value.replace(/^["']|["']$/g, '').trim();
          setCellText(batch[j].remarkCell, cleanVal);
          report.filled++;
        } else {
          // fallback bank
          const c = getComment(batch[j].subject, batch[j].level, i + j, batch[j].grade);
          if (c) { 
            setCellText(batch[j].remarkCell, c);
            report.filled++; 
          }
        }
      });
      if (onProgress) onProgress(report.filled, report.total || 1);
    }
  }
}

/**
 * Phát hiện danh sách các cột nhận xét trên sheet
 * Trả về mảng: [{ headerRow, subjectCol, levelCol, remarkCol, subjectName }]
 */
function detectHeaders(ws) {
  const headers = [];
  const remarkCols = [];
  
  // Pass 1: Tìm các cột "Mã nhận xét" để loại bỏ hoàn toàn
  const skipCols = new Set();
  ws.eachRow((row, rowNum) => {
    if (rowNum > 5) return;
    row.eachCell((cell, colNum) => {
      const v = normalizeVN(getCellText(cell));
      if (v.includes('MA NHAN XET')) {
        skipCols.add(colNum);
      }
    });
  });

  // Pass 2: Trích xuất các cột Nhận xét hợp lệ
  ws.eachRow((row, rowNum) => {
    if (rowNum > 5) return;
    row.eachCell((cell, colNum) => {
      if (skipCols.has(colNum)) return; // Bỏ qua cột "Mã nhận xét"

      const v = normalizeVN(getCellText(cell));
      const rawName = getCellText(cell);
      
      // Tìm các cột Nhận xét
      if (['NOI DUNG', 'NHAN XET', 'GHI CHU', 'NX'].some(k => v.includes(k)) && !v.includes('NHAN XET CHUNG')) {
        // Tránh lưu trùng lặp 1 cột nhiều lần
        if (!remarkCols.some(rc => rc.colNum === colNum)) {
          remarkCols.push({ colNum, rowNum, name: v, rawName });
        }
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
        if (['A', 'B', 'C', 'T', 'H'].includes(v) || /^Điểm \d+$/i.test(v)) {
          if (lCol < 0) lCol = colNum;
          if (rCol < 0) rCol = colNum + 1;
        }
      });
    });
    if (rCol > 0) remarkCols.push({ colNum: rCol, rowNum: 2, rawName: 'NHẬN XÉT' });
  }

  if (remarkCols.length === 0) return [];

  remarkCols.forEach(rc => {
    let r1 = getCellText(ws.getCell(1, rc.colNum));
    let r2 = getCellText(ws.getCell(2, rc.colNum));
    let r1c1 = getCellText(ws.getCell(1, 1));
    let r2c1 = getCellText(ws.getCell(2, 1));

    let megaHeader = `${ws.name} ${r1c1} ${r2c1} ${r1} ${r2} ${rc.rawName}`;
    let subjectName = megaHeader;

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
      headerRow: rc.rowNum || 2,
      remarkCol: rc.colNum,
      levelCol: levelCol, // Nếu -1, sẽ quét toàn bộ dòng
      subjectName: subjectName
    });
  });

  return headers;
}

/**
 * Fallback detect cho file đơn môn đơn giản
 * Tìm cột có chứa T/H/C (level) và cột trống ngay sau (remark)
 */
function detectHeadersFallback(ws) {
  // Tìm hàng header: dòng đầu tiên có chứa text
  let headerRow = 1;
  for (let r = 1; r <= Math.min(5, ws.rowCount); r++) {
    const row = ws.getRow(r);
    let hasText = false;
    row.eachCell(c => { if (getCellText(c)) hasText = true; });
    if (hasText) { headerRow = r; break; }
  }

  // Quét các dòng data để tìm cột chứa giá trị T/H/C
  let levelCol = -1;
  let remarkCol = -1;
  const maxCol = Math.min(ws.columnCount || 20, 30);

  // Đếm số lần xuất hiện T/H/C theo từng cột
  const colLevelCount = {};
  for (let r = headerRow + 1; r <= Math.min(ws.rowCount, 20); r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= maxCol; c++) {
      const val = getCellText(row.getCell(c));
      if (toLevel(val)) {
        colLevelCount[c] = (colLevelCount[c] || 0) + 1;
      }
    }
  }

  // Cột level = cột có nhiều giá trị T/H/C nhất
  let maxCount = 0;
  for (const [col, count] of Object.entries(colLevelCount)) {
    if (count > maxCount) {
      maxCount = count;
      levelCol = parseInt(col);
    }
  }

  if (levelCol < 0) return [];

  // Cột nhận xét = cột trống ngay sau cột level (hoặc cột cuối cùng + 1)
  // Tìm cột trống tiếp theo sau levelCol
  for (let c = levelCol + 1; c <= maxCol + 1; c++) {
    let isEmpty = true;
    for (let r = headerRow + 1; r <= Math.min(ws.rowCount, 10); r++) {
      const val = getCellText(ws.getRow(r).getCell(c));
      if (val && !isLevelValue(val)) { isEmpty = false; break; }
      // Nếu val là level thì cũng không phải remark
      if (val && isLevelValue(val)) { isEmpty = false; break; }
    }
    if (isEmpty) {
      remarkCol = c;
      break;
    }
  }

  // Nếu không tìm được cột trống, lấy cột ngay sau level
  if (remarkCol < 0) remarkCol = levelCol + 1;

  return [{
    headerRow: headerRow,
    remarkCol: remarkCol,
    levelCol: levelCol,
    subjectName: '' // Sẽ được override bởi forceSubject
  }];
}

function isLevelValue(v) {
  const s = v.trim().toUpperCase();
  return ['A', 'B', 'C', 'T', 'H'].includes(s) || /^(ĐIỂM\s*)?\d+$/.test(s);
}

function normalizeVN(s) {
  return String(s).toUpperCase()
    .replace(/[ÀÁẢÃẠÂẤẦẨẪẬĂẮẰẲẴẶ]/g, 'A')
    .replace(/[ÈÉẺẼẸÊẾỀỂỄỆ]/g, 'E')
    .replace(/[ÌÍỈĨỊ]/g, 'I')
    .replace(/[ÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢ]/g, 'O')
    .replace(/[ÙÚỦŨỤƯỨỪỬỮỰ]/g, 'U')
    .replace(/[ỲÝỶỸỴ]/g, 'Y')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Z0-9 ]/g, ''); // chỉ giữ lại chữ cái, số và khoảng trắng
}

/**
 * Ghi đè text vào cell mà không làm mất font (nếu ô gốc đang dùng richText)
 */
function setCellText(cell, text) {
  // Nếu ô đang chứa đối tượng richText
  if (cell.value && cell.value.richText) {
    // Lấy định dạng font từ dòng đầu tiên của richText
    const font = cell.value.richText[0]?.font || {};
    cell.value = {
      richText: [
        { font: font, text: text }
      ]
    };
  } else {
    // Không phải richText, gán chuỗi thông thường
    cell.value = text;
  }
}

export { detectHeaders, toLevel, getCellText, normalizeSubject };
