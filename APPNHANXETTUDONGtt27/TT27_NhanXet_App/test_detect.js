import fs from 'fs';
import ExcelJS from 'exceljs';
import { detectHeader, normalizeSubject } from './src/remark_engine.js';

async function main() {
  const file = 'C:/Users/ADMIN/Downloads/filemau_danhgia_dinhkyc1_tt22_sua_doi_5_5_GK1.xlsx';
  const buf = fs.readFileSync(file);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  
  wb.eachSheet(ws => {
      const h = detectHeader(ws);
      if (h) {
          const norm = normalizeSubject(h.subjectName);
          console.log(`Sheet: "${ws.name}" -> Header Subject: "${h.subjectName}" -> Normalized: "${norm}"`);
      }
  });
}
main().catch(console.error);
