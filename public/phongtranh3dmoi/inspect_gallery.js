const fs = require('fs');
const content = fs.readFileSync('Phòng tranh 3dmoi.html', 'utf8');

// The string might be encoded, let's look for "PH"
const match1 = content.match(/.{0,100}T.O PH.NG TR.NG.{0,100}/i);
console.log("Tìm TẠO PHÒNG:", match1 ? match1[0] : "Không thấy");

const match2 = content.match(/.{0,100}LOAD FILE.{0,100}/i);
console.log("Tìm LOAD FILE:", match2 ? match2[0] : "Không thấy");

const match3 = content.match(/.{0,100}PH.NG TR.NG B.Y.{0,100}/i);
console.log("Tìm PHÒNG TRƯNG BÀY:", match3 ? match3[0] : "Không thấy");
