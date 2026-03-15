import ExcelJS from 'exceljs';

async function main() {
  const file = 'C:/Users/ADMIN/Downloads/filemau_danhgia_dinhkyc1_tt22_sua_doi_5_5_GK1.xlsx';
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  
  wb.eachSheet((ws) => {
    console.log(`\nSheet: ${ws.name}`);
    for(let i=1; i<=10; i++) {
        let rowVals = [];
        ws.getRow(i).eachCell((cell, c) => {
            rowVals.push(`C${c}: ` + (cell.text || String(cell.value)));
        });
        if (rowVals.length) console.log(`R${i}: `, rowVals.join(' | '));
    }
  });
}
main().catch(console.error);
