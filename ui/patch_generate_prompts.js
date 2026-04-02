const fs = require('fs');
const path = require('path');
const serverFile = path.join(__dirname, 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

const regex = /'x-openclaw-scopes': 'operator\.read,operator\.write,operator\.admin'/g;
if (code.match(regex)) {
    console.log("Token scopes look correct in runOllamaText.");
} else {
    console.log("Token scopes NOT FOUND in runOllamaText. Let's patch it.");
}

const checkRegex = /async function runOllamaText\(prompt\) \{[\s\S]*?const resp = await fetch\(`http:\/\/127\.0\.0\.1:\$\{gatewayPort\}\/v1\/chat\/completions`, \{[\s\S]*?body: JSON\.stringify\(payload\)/s;
const newCode = `async function runOllamaText(prompt) {
    const openclawConfigPath = require('path').resolve(require('os').homedir(), '.openclaw', 'openclaw.json');
    let gatewayToken = '', gatewayPort = 18789;
    if (fs.existsSync(openclawConfigPath)) {
      try {
        const oc = JSON.parse(fs.readFileSync(openclawConfigPath, 'utf8'));
        gatewayPort = oc.gateway?.port || 18789;
        const rawContent = fs.readFileSync(openclawConfigPath, 'utf8');
        const tokenMatch = rawContent.match(/"token"\\s*:\\s*"([a-f0-9]{48})"/);
        if (tokenMatch && tokenMatch[1]) gatewayToken = tokenMatch[1];
      } catch(e) {}
    }

    const payload = {
      model: 'qwen-portal/coder-model',
      messages: [{role: 'user', content: prompt}],
      stream: false
    };

    const resp = await fetch(\`http://127.0.0.1:\${gatewayPort}/v1/chat/completions\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${gatewayToken}\`,
        'x-openclaw-scopes': 'operator.read,operator.write,operator.admin'
      },
      body: JSON.stringify(payload)`;

if (code.match(checkRegex)) {
    code = code.replace(checkRegex, newCode);
    fs.writeFileSync(serverFile, code);
    console.log("Patched runOllamaText.");
} else {
    console.log("Could not find runOllamaText regex.");
}