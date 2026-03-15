import ExcelJS from 'exceljs';
import fs from 'fs';

async function dump() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('d:/APPNHANXETTUDONG/TT27_AutoNhanXet_Extension_v1.4.8/publich/Mẫu nhận xét các môn học và NL-PC HS lớp 4+5.xlsx');
  
  const ws = wb.worksheets[0];
  let out = '';
  for (let i = 1; i <= Math.min(60, ws.rowCount); i++) {
    const row = ws.getRow(i);
    let rowVals = [];
    row.eachCell({ includeEmpty: true }, (cell, cNum) => {
        let text = cell.value;
        if (text && text.richText) text = text.richText.map(r=>r.text).join('');
        else if (text && text.result !== undefined) text = text.result;
        rowVals.push(`[${cNum}] ${String(text).trim()}`);
    });
    out += `Row ${i}: ${rowVals.join(' | ')}\n`;
  }
  fs.writeFileSync('dump_excel.txt', out);
  console.log('Done');
}

dump().catch(console.error);
