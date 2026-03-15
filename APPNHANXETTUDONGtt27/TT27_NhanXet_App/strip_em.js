import fs from 'fs';

async function stripEm() {
  const filePath = 'src/comment_bank.js';
  let code = fs.readFileSync(filePath, 'utf8');

  // We want to remove "Em " at the beginning of the string, or ", em" inside.
  // We can do this safely by matching strings in the arrays.
  // Actually, let's just use string replace on the file for specific patterns:
  // Match "Em " at the beginning of a quote, e.g., "Em nắm..." -> "Nắm..."
  // Match "Học sinh " at the beginning of a quote
  
  // To deal with capitalization after "Em ":
  // "Em hoàn thành..." -> "Hoàn thành..."
  // We can write a simple regex replacement callback
  code = code.replace(/"(Em |Học sinh |em )(.*?)"/g, (match, prefix, rest) => {
      // capitalize the first letter of rest
      if (!rest) return match;
      const firstChar = rest.charAt(0).toUpperCase();
      const newRest = firstChar + rest.slice(1);
      return `"${newRest}"`;
  });

  // Also catch lowercase "em " if it sneaks in at the beginning of a sentence.
  
  fs.writeFileSync(filePath, code);
  console.log('Stripped all "Em " from comment_bank.js');
}

stripEm().catch(console.error);
