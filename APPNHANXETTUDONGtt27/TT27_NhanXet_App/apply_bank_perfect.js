import fs from 'fs';

async function updateBank() {
  const bankStr = fs.readFileSync('extracted_bank_perfect.json', 'utf8');
  const newBank = JSON.parse(bankStr);
  
  let code = fs.readFileSync('src/comment_bank.js', 'utf8');
  
  const allSubjects = ['TOAN', 'TV', 'TA', 'TNXH', 'HDTN', 'KHOA', 'LSDL', 'AN', 'MT', 'GDTC', 'TIN', 'CN', 'DD', 'NLPC'];
  
  const bankModule = await import('./src/comment_bank.js');
  const oldBank = bankModule.BANK;
  
  for (const subj of allSubjects) {
     if (newBank[subj]) {
         oldBank[subj] = newBank[subj];
     } else if (!oldBank[subj]) {
         oldBank[subj] = { T: [], H: [], C: [] };
     }
  }
  
  let replacement = "export const BANK = " + JSON.stringify(oldBank, null, 2) + ";";
  const newCode = code.replace(/export const BANK = [\s\S]+?;\n+(?=export function)/, replacement + '\n\n');
  
  fs.writeFileSync('src/comment_bank.js', newCode);
  console.log('Update done.');
}

updateBank().catch(console.error);
