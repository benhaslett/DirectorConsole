const fs = require('fs');
const path = require('path');
const serverFile = path.join(__dirname, 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

const regex = /const filename = path\.basename\(imagePath\);\n\s*const fileStream = fs\.createReadStream\(imagePath\);\n\s*const req = http\.request\(\{/s;
const newCode = `const filename = path.basename(imagePath);
      const ext = path.extname(filename).toLowerCase();
      const fileStream = fs.createReadStream(imagePath);
      const req = http.request({`;

code = code.replace(regex, newCode);

const regex2 = /req\.write\(\`--\$\{boundary\}\\\\r\\\\nContent-Disposition: form-data; name="image"; \\r?\\nfilename="\$\{filename\}"\\\\r\\\\nContent-Type: image\/png\\\\r\\\\n\\\\r\\\\n\`\);/s;

const newCode2 = `const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';
      req.write(\`--\${boundary}\\r\\nContent-Disposition: form-data; name="image"; filename="\${filename}"\\r\\nContent-Type: \${mime}\\r\\n\\r\\n\`);`;

code = code.replace(regex2, newCode2);

fs.writeFileSync(serverFile, code);
console.log("Mime patch applied");