const fs = require('fs');
const path = require('path');
const serverFile = path.join(__dirname, 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

// 1. Add /api/project/:name/characters endpoint
if (!code.includes('/api/project/:name/characters')) {
  const charApiBlock = `// 11. List available character sheets
app.get('/api/project/:name/characters', (req, res) => {
  const config = getProjectConfig(req.params.name);
  const charDir = config.character_sheet_path || DEFAULT_CHAR_PATH;
  const chars = [];
  if (fs.existsSync(charDir)) {
    try {
      fs.readdirSync(charDir)
        .filter(f => f.match(/\\.(png|jpg|jpeg|webp)$/i))
        .forEach(f => chars.push({ name: f, path: path.join(charDir, f) }));
    } catch(e) {}
  }
  res.json(chars);
});\n\n`;

  code = code.replace("app.get('/api/project/:name/chat-history',", charApiBlock + "app.get('/api/project/:name/chat-history',");
}

const oldKodaActions = "const SHOT_FIELDS = ['name', 'image_prompt', 'video_prompt', 'duration'];";
const newKodaActions = "const SHOT_FIELDS = ['name', 'image_prompt', 'video_prompt', 'duration', 'audio_file', 'character_sheets'];";
code = code.replace(oldKodaActions, newKodaActions);

fs.writeFileSync(serverFile, code);
console.log("Server patch applied.");