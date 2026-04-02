const fs = require('fs');
const path = require('path');
const serverFile = path.join(__dirname, 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

const regex = /const scriptPath = path\.resolve\(__dirname, '\.\.\/\.\.\/comfy-art\/scripts\/generate_zturbo\.js'\);/;
const newCode = `let scriptPath = path.resolve(__dirname, '../../comfy-art/scripts/generate_zturbo.js');
      if (shot.character_sheets) {
        scriptPath = path.resolve(__dirname, '../../comfy-art/scripts/generate_ipadapter.js');
      }`;

if (code.match(regex)) {
  code = code.replace(regex, newCode);
  fs.writeFileSync(serverFile, code);
  console.log("Image generation patch applied.");
} else {
  console.log("Image generation script regex not found.");
}