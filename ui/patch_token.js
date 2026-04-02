const fs = require('fs');
const path = require('path');
const serverFile = path.join(__dirname, 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

const regex = /if \(gatewayToken === '__OPENCLAW_REDACTED__'\) \{\n\s*const rawContent.*?\n\s*const tokenMatch.*?\n\s*if \(tokenMatch.*?\n\s*gatewayToken.*?\n\s*\}\n\s*\}/s;
const newCode = `if (gatewayToken === '__OPENCLAW_REDACTED__') {
      const rawContent = fs.readFileSync(openclawConfigPath, 'utf8');
      const tokenMatch = rawContent.match(/"token"\\s*:\\s*"([a-f0-9]{48})"/);
      if (tokenMatch && tokenMatch[1]) {
        gatewayToken = tokenMatch[1];
      }
    }`;
let finalCode = code.replace(regex, newCode);
fs.writeFileSync(serverFile, finalCode);
console.log("Token patch 12 applied.");