const fs = require('fs');
const path = require('path');
const serverFile = path.join(__dirname, 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

code = code.replace(/req\.write\(\`--\$\{boundary\}\\r\\nContent-Disposition: form-data; name="image";\s*filename="\$\{filename\}"\\r\\nContent-Type: image\/png\\r\\n\\r\\n\`\);/g, 
`const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';
      req.write(\`--\${boundary}\\r\\nContent-Disposition: form-data; name="image"; filename="\${filename}"\\r\\nContent-Type: \${mime}\\r\\n\\r\\n\`);`);

fs.writeFileSync(serverFile, code);
console.log("Mime fix applied");