const fs = require('fs');
const path = require('path');
const serverFile = path.join(__dirname, 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

const regex = /const \{ Readable \} = require\('stream'\);\n\s*const \{ createInterface \} = require\('readline'\);\n\s*const bodyStream = Readable\.fromWeb\(resp\.body\);\n\s*const rl = createInterface\(\{ input: bodyStream \}\);\n\s*for await \(const line of rl\) \{/s;
const newCode = `const { Readable } = require('stream');
    const { createInterface } = require('readline');
    const bodyStream = resp.body.getReader ? Readable.fromWeb(resp.body) : resp.body;
    const rl = createInterface({ input: bodyStream });
    for await (const line of rl) {`;
let finalCode = code.replace(regex, newCode);
fs.writeFileSync(serverFile, finalCode);
console.log("Token patch 19 applied.");