import fs from 'fs';

async function updateBank() {
  const bankStr = fs.readFileSync('extracted_bank.json', 'utf8');
  const newBank = JSON.parse(bankStr);
  
  let code = fs.readFileSync('src/comment_bank.js', 'utf8');
  
  // Extract the current BANK object from JS code using a simple eval trick 
  // Wait, better to construct the replacement string manually
  
  let newObjStr = "export const BANK = {\n";
  
  // We will iterate through all possible subjects to merge
  const allSubjects = ['TOAN', 'TV', 'TA', 'TNXH', 'HDTN', 'KHOA', 'LSDL', 'AN', 'MT', 'GDTC', 'TIN', 'CN', 'DD', 'NLPC'];
  
  // Because parsing JS object safely from string is tricky without AST, 
  // I will just use regex to extract the old bank roughly, or just regenerate the whole BANK object 
  // if some subjects are missing from newBank, they will be empty arrays to prevent crashes.
  
  // Wait, I can extract the old BANK using Function constructor if I module exports it? No, it's an ES module.
  // I can just import it dynamically!
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
  
  // Replace the old export const BANK = { ... }; with the new one
  // Assuming the `export const BANK = {` starts at the beginning of the file and ends before `export function getComment`
  
  const parts = code.split('export function getComment');
  const newCode = parts[0].replace(/export const BANK = [\s\S]*?(?=\n\nexport function)/, replacement) + '\nexport function getComment' + parts[1];
  
  // Actually, parts[0] might not match exactly. Better regex:
  const newCode2 = code.replace(/export const BANK = [\s\S]+?;\n+(?=export function)/, replacement + '\n\n');
  
  fs.writeFileSync('src/comment_bank.js', newCode2);
  console.log('Update done.');
}

updateBank().catch(console.error);
