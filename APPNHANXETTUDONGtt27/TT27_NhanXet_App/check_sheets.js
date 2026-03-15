import ExcelJS from 'exceljs';

async function checkSheets() {
  const files = [
    'd:/APPNHANXETTUDONG/TT27_AutoNhanXet_Extension_v1.4.8/publich/Mẫu nhận xét các môn học và NL-PC HS lớp 1.xlsx',
    'd:/APPNHANXETTUDONG/TT27_AutoNhanXet_Extension_v1.4.8/publich/Mẫu nhận xét các môn học và NL-PC HS lớp 2.xlsx',
    'd:/APPNHANXETTUDONG/TT27_AutoNhanXet_Extension_v1.4.8/publich/Mẫu nhận xét các môn học và NL-PC HS lớp 3.xlsx',
    'd:/APPNHANXETTUDONG/TT27_AutoNhanXet_Extension_v1.4.8/publich/Mẫu nhận xét các môn học và NL-PC HS lớp 4+5.xlsx'
  ];

  for (const file of files) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file);
    console.log(`\nFile: ${file}`);
    for (const ws of wb.worksheets) {
        console.log(` - Sheet: ${ws.name} (Rows: ${ws.rowCount})`);
    }
  }
}

checkSheets().catch(console.error);
