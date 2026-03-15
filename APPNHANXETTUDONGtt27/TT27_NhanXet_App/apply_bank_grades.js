import fs from 'fs';

async function updateBankByGrade() {
  const bankStr = fs.readFileSync('extracted_bank_by_grade.json', 'utf8');
  const newBank = JSON.parse(bankStr);
  
  // We will rewrite the entire comment_bank.js to export BANK_BY_GRADE
  let code = `/**
 * Kho nhận xét TT27 - Phân loại theo khối lớp
 */

export const BANK_BY_GRADE = ${JSON.stringify(newBank, null, 2)};

export function scoreToLevel(score) {
  if (score >= 9) return 'T';
  if (score >= 6) return 'H';
  return 'C';
}

export function isLevelValue(val) {
  if (!val) return false;
  const s = String(val).trim().toUpperCase();
  return ['T', 'H', 'C', 'ĐIỂM 10', 'ĐIỂM 9', 'ĐIỂM 8', 'ĐIỂM 7', 'ĐIỂM 6', 'ĐIỂM 5', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1', 'A', 'B', 'TỐT', 'HOÀN THÀNH', 'CHƯA HT', 'CHT', 'ĐẠT', 'CẦN CỐ GẮNG'].includes(s);
}

// grade param is expected to be '1', '2', '3', or '45'
export function getComment(subject, level, idx = 0, grade = '45') {
  if (!subject || !level) return '';
  const bank = BANK_BY_GRADE[grade] || BANK_BY_GRADE['45'];
  const opts = bank[subject]?.[level] || BANK_BY_GRADE['45'][subject]?.[level] || [];
  if (opts.length === 0) return '';
  return opts[idx % opts.length];
}

export function getNlpcComment(nlpcType, level, idx = 0, grade = '45') {
  // nlpcType might be ignored as we just put them all under 'NLPC'
  // Or if we specifically kept it, it would be 'NLPC' subject.
  return getComment('NLPC', level, idx, grade);
}
`;

  fs.writeFileSync('src/comment_bank.js', code);
  console.log('Update done.');
}

updateBankByGrade().catch(console.error);
