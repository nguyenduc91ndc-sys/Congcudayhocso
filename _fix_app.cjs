const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf8');

const searchStr = "onSolarSystem={() => requireLogin(() => setView('SOLAR_SYSTEM'))}\r\n                   isAdmin={user";
const replaceStr = "onSolarSystem={() => requireLogin(() => setView('SOLAR_SYSTEM'))}\r\n                   onKeoCoTriTue={() => requireLogin(() => setView('KEO_CO_TRI_TUE'))}\r\n                   isAdmin={user";

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync('App.tsx', content);
  console.log('SUCCESS: Added onKeoCoTriTue prop');
} else {
  console.log('ERROR: Search string not found');
  // Try without \r
  const searchStr2 = "onSolarSystem={() => requireLogin(() => setView('SOLAR_SYSTEM'))}\n                   isAdmin={user";
  const replaceStr2 = "onSolarSystem={() => requireLogin(() => setView('SOLAR_SYSTEM'))}\n                   onKeoCoTriTue={() => requireLogin(() => setView('KEO_CO_TRI_TUE'))}\n                   isAdmin={user";
  if (content.includes(searchStr2)) {
    content = content.replace(searchStr2, replaceStr2);
    fs.writeFileSync('App.tsx', content);
    console.log('SUCCESS (LF): Added onKeoCoTriTue prop');
  } else {
    console.log('ERROR: Neither CRLF nor LF version found');
  }
}
