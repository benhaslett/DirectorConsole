const fs = require('fs');
const path = require('path');
const serverFile = path.join(__dirname, 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

const regex = /\/\/ Turn off audio generation by bypassing the ConcatAVLatent nodes.*?delete workflow\['267:242'\]\.inputs\.audio;\s*\}/s;

if (code.match(regex)) {
  code = code.replace(regex, `// Reverted audio bypass as CreateVideo requires the audio stream and fails without it.`);
  fs.writeFileSync(serverFile, code);
  console.log("Audio bypass removed.");
} else {
  console.log("Regex match not found.");
}