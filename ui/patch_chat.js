const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

const newChatBlock = `app.post('/api/project/:name/chat', async (req, res) => {
  const projectName = req.params.name;
  const { message, history } = req.body;

  const openclawConfigPath = path.resolve(__dirname, '../../../openclaw.json');
  let gatewayToken = '', gatewayPort = 18789;
  if (fs.existsSync(openclawConfigPath)) {
    try {
      const oc = JSON.parse(fs.readFileSync(openclawConfigPath, 'utf8'));
      gatewayToken = oc.gateway?.auth?.token || '';
      gatewayPort = oc.gateway?.port || 18789;
    } catch(e) {}
  }

  const projectDir = path.join(PROJECTS_DIR, projectName);
  if (!fs.existsSync(projectDir)) return res.status(404).json({ error: 'Project not found' });

  const slPath = path.join(projectDir, 'shot_list.json');
  const config = getProjectConfig(projectName);
  const shotList = fs.existsSync(slPath) ? JSON.parse(fs.readFileSync(slPath, 'utf8')) : { shots: [] };
  const shots = shotList.shots || [];

  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (obj) => res.write(JSON.stringify(obj) + '\\n');
  const messages = [...(history || []), { role: 'user', content: message }];

  try {
    let fullText = '';
    
    const sysPrompt = buildKodaSystemPrompt(config, shots);
    const payload = {
      model: 'openclaw', // Route to openclaw main agent
      messages: [{role: 'system', content: sysPrompt}, ...messages],
      stream: true
    };
    
    const resp = await fetch(\`http://127.0.0.1:\${gatewayPort}/v1/chat/completions\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${gatewayToken}\`
      },
      body: JSON.stringify(payload)
    });
    
    if (!resp.ok) {
      throw new Error(\`Gateway returned \${resp.status}: \${await resp.text()}\`);
    }
    
    const { createInterface } = require('readline');
    const rl = createInterface({ input: resp.body });
    
    for await (const line of rl) {
      if (line.startsWith('data: ')) {
        const dataStr = line.slice(6);
        if (dataStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(dataStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            send({ type: 'delta', text: content });
          }
        } catch(e) {}
      }
    }`;

const startIdx = code.indexOf("app.post('/api/project/:name/chat', async (req, res) => {");
const endStr = "// Parse and apply actions";
const endIdx = code.indexOf(endStr, startIdx);

if (startIdx > -1 && endIdx > -1) {
  let finalCode = code.slice(0, startIdx) + newChatBlock + "\n      // Parse and apply actions\n" + code.slice(endIdx + endStr.length);
  finalCode = finalCode.replace("if (!process.env.ANTHROPIC_API_KEY) console.warn('[!] ANTHROPIC_API_KEY not set - chat unavailable');", "");
  fs.writeFileSync(serverFile, finalCode);
  console.log("Patch applied successfully.");
} else {
  console.error("Could not find blocks to patch.");
}
