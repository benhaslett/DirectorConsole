const fs = require('fs');
const path = require('path');
const serverFile = path.join(__dirname, 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

const runOllamaTextRegex = /function runOllamaText\(prompt\) \{\n\s*return new Promise\(\(resolve, reject\) => \{\n\s*const proc = spawn\('ollama', \['run', 'qwen3:8b'\], \{\n\s*stdio: \['pipe', 'pipe', 'pipe'\],\n\s*shell: true\n\s*\}\);\n\n\s*let data = '';\n\s*let error = '';\n\n\s*proc\.stdout\.on\('data', \(chunk\) => \{ data \+= chunk\.toString\(\); \}\);\n\s*proc\.stderr\.on\('data', \(chunk\) => \{ error \+= chunk\.toString\(\); \}\);\n\n\s*proc\.stdin\.write\(prompt\);\n\s*proc\.stdin\.end\(\);\n\n\s*proc\.on\('close', \(code\) => \{\n\s*if \(code !== 0 && data\.trim\(\)\.length === 0\) return reject\(new Error\(error\)\);\n\s*resolve\(data\);\n\s*\}\);\n\s*\}\);\n\s*\}/;

const runOpenClawTextStr = `async function runOllamaText(prompt) {
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
      body: JSON.stringify(payload)
    });

    if (!resp.ok) throw new Error(\`Gateway returned \${resp.status}\`);
    const data = await resp.json();
    return data.choices[0].message.content;
  }`;

if (code.match(runOllamaTextRegex)) {
  code = code.replace(runOllamaTextRegex, runOpenClawTextStr);

  const oldPrompt = /Write a video_prompt for Wan 2\.2 i2v\. Rules:\n\s*- Single flowing paragraph, 3-5 sentences\n\s*- Start with camera movement \(e\.g\. "Camera slowly pushes in,"\)[\s\S]*?- End with lighting\/mood note/;
  const newPrompt = `Write a video_prompt for LTX 2.3 i2v. Rules:
  - Single flowing paragraph, 4-8 sentences. Present tense.
  - Start with shot scale and scene (lighting, color, textures).
  - Describe core action flowing naturally.
  - Explicit camera language (pans left, pushes in).
  - Avoid internal states - use visual cues only. No text/logos.
  - Audio description can be included.`;
  code = code.replace(oldPrompt, newPrompt);

  fs.writeFileSync(serverFile, code);
  console.log("Ollama to OpenClaw patch applied.");
} else {
  console.log("Could not find runOllamaText regex.");
}