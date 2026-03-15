import fs from 'fs';
import { processExcel } from './src/remark_engine.js';

async function main() {
  const fileIn = 'C:/Users/ADMIN/Downloads/filemau_danhgia_dinhkyc1_tt22_sua_doi_5_5_GK1.xlsx';
  const fileOut = 'd:/APPNHANXETTUDONG/test_output.xlsx';
  const buf = fs.readFileSync(fileIn);
  
  console.log("Xử lý file...");
  const outBuf = await processExcel(buf, {
    mode: 'bank',
    onProgress: (done, total) => console.log(`Tiến độ: ${done}/${total}`)
  });
  
  fs.writeFileSync(fileOut, Buffer.from(outBuf));
  console.log("Hoàn tất xử lý, đã lưu ra file test_output.xlsx");
}
main().catch(console.error);
