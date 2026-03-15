import ExcelJS from 'exceljs';
import fs from 'fs';
import glob from 'glob';

function normalizeSubject(name) {
  if (!name) return '';
  const up = name.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (up.includes('TOAN')) return 'TOAN';
  if (up.includes('TIENG VIET') || up.includes('VIET')) return 'TV';
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
  if (['H', 'B', 'HOÀN THÀNH', 'ĐẠT'].includes(s) || s.includes('8') || s.includes('7') || s.includes('6')) return 'H';
  if (['C', 'DƯỚI 5', 'CHƯA HOÀN THÀNH', 'CẦN CỐ GẮNG'].includes(s) || s.includes('5') || s.includes('4') || s.includes('3')) return 'C';
  return '';
}

async function extract() {
  const files = [
    'd:/APPNHANXETTUDONG/TT27_AutoNhanXet_Extension_v1.4.8/publich/Mẫu nhận xét các môn học và NL-PC HS lớp 1.xlsx',
    'd:/APPNHANXETTUDONG/TT27_AutoNhanXet_Extension_v1.4.8/publich/Mẫu nhận xét các môn học và NL-PC HS lớp 2.xlsx',
    'd:/APPNHANXETTUDONG/TT27_AutoNhanXet_Extension_v1.4.8/publich/Mẫu nhận xét các môn học và NL-PC HS lớp 3.xlsx',
    'd:/APPNHANXETTUDONG/TT27_AutoNhanXet_Extension_v1.4.8/publich/Mẫu nhận xét các môn học và NL-PC HS lớp 4+5.xlsx'
  ];

  const bank = {};

  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file);
    const ws = wb.worksheets[0];

    // Find groups by checking row 1 and row 2 headers
    // We will scan cols 1 to 50
    const colGroups = []; 
    // Format: { commentCol, levelCol, subject }
    
    // Instead of header grouping, let's identify Comment columns simply as:
    // Any column where row 3 has > 15 chars text.
    // And level column is (Comment col - 2).
    // The subject name is in row 1 or row 2 of the Comment col (or its surrounding merge blocks).
    
    for (let c = 1; c <= 50; c++) {
      const cRow3Cell = ws.getCell(3, c).value;
      const cRow4Cell = ws.getCell(4, c).value;
      
      const isCommentCol = (typeof cRow3Cell === 'string' && cRow3Cell.length > 20) || 
                           (cRow3Cell && cRow3Cell.richText) ||
                           (typeof cRow4Cell === 'string' && cRow4Cell.length > 20) ||
                           (cRow4Cell && cRow4Cell.richText);
                           
      if (isCommentCol) {
         // Level col is usually c-2
         let levelCol = c - 2;
         if (levelCol < 1) continue;
         
         // Find subject name by looking up in row 1 and 2, scanning backward to find non-empty
         let headerStr = '';
         for (let walkCol = c; walkCol >= levelCol; walkCol--) {
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
    
    // We only want unique colGroups 
    const uniqueGroups = [];
    const seenC = new Set();
    colGroups.forEach(g => {
       if (!seenC.has(g.commentCol)) {
          seenC.add(g.commentCol);
          uniqueGroups.push(g);
       }
    });

    for (let i = 2; i <= ws.rowCount; i++) {
       for (const g of uniqueGroups) {
          let levelRaw = ws.getCell(i, g.levelCol).text;
          let commentRaw = ws.getCell(i, g.commentCol).value;
          
          if (!levelRaw) continue;
          if (commentRaw && commentRaw.richText) {
             commentRaw = commentRaw.richText.map(r => r.text).join('').trim();
          } else if (commentRaw && commentRaw.result !== undefined) {
             commentRaw = String(commentRaw.result).trim();
          } else if (typeof commentRaw === 'string') {
             commentRaw = commentRaw.trim();
          } else {
             continue; // Empty parsing
          }
          
          if (!commentRaw || commentRaw.length < 5) continue;
          
          const level = parseLevel(levelRaw);
          if (level) {
             if (!bank[g.subject]) bank[g.subject] = { T: new Set(), H: new Set(), C: new Set() };
             let destLevel = level;
             // HDTN, NLPC use T, D, C (we map to T,H,C internally or T,D,C)
             // I'll store them as T, H, C for consistency
             // Let comment_bank.js handle reading them
             bank[g.subject][level].add(commentRaw);
          }
       }
    }
  }

  // Convert Sets to Arrays
  const finalBank = {};
  for (const subj in bank) {
      finalBank[subj] = {
         T: Array.from(bank[subj].T),
         H: Array.from(bank[subj].H),
         C: Array.from(bank[subj].C)
      };
  }

  fs.writeFileSync('extracted_bank.json', JSON.stringify(finalBank, null, 2));
  console.log('Successfully extracted', Object.keys(finalBank).length, 'subjects');
}

extract().catch(console.error);
