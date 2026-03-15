const ExcelJS = require('exceljs');
const path = require('path');

const files = [
  'Mẫu nhận xét các môn học và NL-PC HS lớp 1.xlsx',
  'Mẫu nhận xét các môn học và NL-PC HS lớp 2.xlsx',
  'Mẫu nhận xét các môn học và NL-PC HS lớp 3.xlsx',
  'Mẫu nhận xét các môn học và NL-PC HS lớp 4+5.xlsx',
];

const dir = 'd:/APPNHANXETTUDONG/TT27_AutoNhanXet_Extension_v1.4.8/publich';

async function main() {
  for (const f of files) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path.join(dir, f));
    console.log(`\n${'='.repeat(80)}`);
    console.log(`FILE: ${f}`);
    console.log(`${'='.repeat(80)}`);
    
    wb.eachSheet((ws, id) => {
      console.log(`\n--- SHEET: "${ws.name}" (${ws.rowCount} rows x ${ws.columnCount} cols) ---`);
      const maxRows = Math.min(ws.rowCount, 30);
      for (let r = 1; r <= maxRows; r++) {
        const row = ws.getRow(r);
        const vals = [];
        for (let c = 1; c <= Math.min(ws.columnCount, 8); c++) {
          const v = row.getCell(c).text || '';
          if (v.trim()) vals.push(`C${c}:${v.substring(0, 80)}`);
        }
        if (vals.length) console.log(`R${r}: ${vals.join(' | ')}`);
      }
    });
  }
}

main().catch(console.error);
