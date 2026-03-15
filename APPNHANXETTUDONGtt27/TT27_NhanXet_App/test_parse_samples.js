const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function analyzeFile(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.worksheets[0];
  
  console.log('File:', path.basename(filePath));
  console.log('Sheet count:', wb.worksheets.length);
  
  for (let i = 1; i <= 5; i++) {
    const row = ws.getRow(i);
    const rowData = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      rowData.push(`Col ${colNumber}: ${cell.text}`);
    });
    console.log(`Row ${i}:`, rowData);
  }
}

analyzeFile(process.argv[2]).catch(console.error);
