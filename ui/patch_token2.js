const fs = require('fs');
const path = require('path');
const serverFile = path.join(__dirname, 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');
const regex = /const openclawConfigPath = path\.resolve\(__dirname, '\.\.\/\.\.\/\.\.\/openclaw\.json'\);\n\s*let gatewayToken = '', gatewayPort = 18789;[\s\S]*?\}\n\s*if \(gatewayToken === '__OPENCLAW_REDACTED__'\) \{[\s\S]*?\}\n\s*\}/s;
const newCode = `let gatewayToken = '', gatewayPort = 18789;
  const ocConfigPath = path.resolve(__dirname, '../../../../.openclaw/openclaw.json');
  if (fs.existsSync(ocConfigPath)) {
    try {
      const oc = JSON.parse(fs.readFileSync(ocConfigPath, 'utf8'));
      gatewayPort = oc.gateway?.port || 18789;
    } catch(e) {}
    try {
      const rawContent = fs.readFileSync(ocConfigPath, 'utf8');
      const tokenMatch = rawContent.match(/"token"\\s*:\\s*"([a-f0-9]{48})"/);
      if (tokenMatch && tokenMatch[1]) {
        gatewayToken = tokenMatch[1];
      }
    } catch(e) {}
  }`;
let finalCode = code.replace(regex, newCode);
fs.writeFileSync(serverFile, finalCode);
console.log("Token patch 14 applied.");