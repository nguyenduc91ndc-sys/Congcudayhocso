import ExcelJS from 'exceljs';
import fs from 'fs';

function normalizeSubject(name) {
  if (!name) return '';
  const up = name.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (up.includes('TOAN')) return 'TOAN';
  if (up.includes('TIENG VIET') || up.includes('VIET') || up.includes('TLV') || up.includes('CHINH TA') || up.includes('TAP DOC') || up.includes('KE CHUYEN') || up.includes('LT&C')) return 'TV';
  if (up.includes('TIENG ANH') || up.includes('NGOAI NGU')) return 'TA';
  if (up.includes('DAO DUC')) return 'DD';
  if (up.includes('TU NHIEN') || up.includes('TNXH')) return 'TNXH';
  if (up.includes('KHOA HOC')) return 'KHOA';
  if (up.includes('LICH SU') || up.includes('DIA LI') || up.includes('LSDL')) return 'LSDL';
  if (up.includes('AM NHAC')) return 'AN';
  if (up.includes('MI THUAT') || up.includes('MY THUAT')) return 'MT';
  if (up.includes('THE CHAT') || up.includes('THE DUC')) return 'GDTC';
  if (up.includes('TIN HOC')) return 'TIN';
  if (up.includes('CONG NGHE')) return 'CN';
  if (up.includes('TRAI NGHIEM')) return 'HDTN';
  if (up.includes('NANG LUC') || up.includes('PHAM CHAT')) return 'NLPC';
  return 'UNKNOWN';
}

function parseLevel(val) {
  if (!val) return '';
  const s = String(val).toUpperCase().trim();
  if (['T', 'A', 'TỐT', 'HOÀN THÀNH TỐT'].includes(s) || s.includes('10') || s.includes('9')) return 'T';
  if (['H', 'B', 'HOÀN THÀNH', 'Đ', 'ĐẠT'].includes(s) || s.includes('8') || s.includes('7') || s.includes('6')) return 'H';
  if (['C', 'DƯỚI 5', 'CHƯA HOÀN THÀNH', 'CẦN CỐ GẮNG'].includes(s) || s.includes('5') || s.includes('4') || s.includes('3')) return 'C';
  return '';
}

async function extract() {
  const files = [
    { grade: '1', path: 'd:/APPNHANXETTUDONG/TT27_AutoNhanXet_Extension_v1.4.8/publich/Mẫu nhận xét các môn học và NL-PC HS lớp 1.xlsx' },
    { grade: '2', path: 'd:/APPNHANXETTUDONG/TT27_AutoNhanXet_Extension_v1.4.8/publich/Mẫu nhận xét các môn học và NL-PC HS lớp 2.xlsx' },
    { grade: '3', path: 'd:/APPNHANXETTUDONG/TT27_AutoNhanXet_Extension_v1.4.8/publich/Mẫu nhận xét các môn học và NL-PC HS lớp 3.xlsx' },
    { grade: '45', path: 'd:/APPNHANXETTUDONG/TT27_AutoNhanXet_Extension_v1.4.8/publich/Mẫu nhận xét các môn học và NL-PC HS lớp 4+5.xlsx' }
  ];

  const blocks = { '1': {}, '2': {}, '3': {}, '45': {} };

  for (const fileObj of files) {
    if (!fs.existsSync(fileObj.path)) continue;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(fileObj.path);
    const bank = blocks[fileObj.grade];
    
    for (const ws of wb.worksheets) {
       const cCount = ws.columnCount;
       const colGroups = [];
       
       for (let c = 1; c <= cCount; c++) {
          let hasLongText = false;
          for (let r = 2; r <= Math.min(15, ws.rowCount); r++) {
             let txt = ws.getCell(r, c).text;
             if (txt && txt.length > 20) { hasLongText = true; break; }
          }
          if (hasLongText) {
             let levelCol = c - 2;
             if (levelCol < 1) levelCol = c - 1; 
             if (levelCol < 1) levelCol = c; 
             
             let headerStr = '';
             for (let walkCol = c; walkCol >= levelCol; walkCol--) {
                if (walkCol < 1) continue;
                let r1 = ws.getCell(1, walkCol).text;
                let r2 = ws.getCell(2, walkCol).text;
                if (r1) headerStr += r1 + ' ';
                if (r2) headerStr += r2 + ' ';
             }
             const subject = normalizeSubject(headerStr);
             if (subject !== 'UNKNOWN') {
                colGroups.push({ commentCol: c, levelCol: levelCol, subject });
             }
          }
       }
       
       const uniqueGroups = [];
       const seenC = new Set();
       colGroups.forEach(g => {
          if (!seenC.has(g.commentCol)) {
             seenC.add(g.commentCol);
             uniqueGroups.push(g);
          }
       });
       
       for (const g of uniqueGroups) {
          for (let i = 2; i <= ws.rowCount; i++) {
             let levelRaw = ws.getCell(i, g.levelCol).text;
             if (!levelRaw && g.levelCol - 1 > 0) levelRaw = ws.getCell(i, g.levelCol-1)?.text;
             if (!levelRaw && g.levelCol - 2 > 0) levelRaw = ws.getCell(i, g.levelCol-2)?.text; 
             
             let commentRaw = ws.getCell(i, g.commentCol).value;
             if (!levelRaw) continue;
             if (commentRaw && commentRaw.richText) {
                commentRaw = commentRaw.richText.map(r => r.text).join('').trim();
             } else if (commentRaw && commentRaw.result !== undefined) {
                commentRaw = String(commentRaw.result).trim();
             } else if (typeof commentRaw === 'string') {
                commentRaw = commentRaw.trim();
             } else {
                continue;
             }
             
             if (!commentRaw || commentRaw.length < 5) continue;
             
             const level = parseLevel(levelRaw);
             if (level) {
                if (!bank[g.subject]) bank[g.subject] = { T: new Set(), H: new Set(), C: new Set() };
                bank[g.subject][level].add(commentRaw);
             }
          }
       }
    }
  }

  const finalBank = { '1': {}, '2': {}, '3': {}, '45': {} };
  for (const grade in blocks) {
    for (const subj in blocks[grade]) {
        finalBank[grade][subj] = {
           T: Array.from(blocks[grade][subj].T),
           H: Array.from(blocks[grade][subj].H),
           C: Array.from(blocks[grade][subj].C)
        };
    }
  }

  fs.writeFileSync('extracted_bank_by_grade.json', JSON.stringify(finalBank, null, 2));
  console.log('Successfully extracted by grades');
}

extract().catch(console.error);
