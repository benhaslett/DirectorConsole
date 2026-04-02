const fs = require('fs');
const path = require('path');

// 1. Patch server.js to use config.audio_path
const serverFile = path.join(__dirname, 'server.js');
let serverCode = fs.readFileSync(serverFile, 'utf8');

const apiTracksRegex = /\/\/ 10\. List available audio tracks\napp\.get\('\/api\/tracks', \(req, res\) => \{\n\s*const trackDirs = \[\n\s*'C:\\\\Users\\\\benha\\\\OneDrive\\\\03_CREATIVE\\\\Music\\\\My Ways of Songs\\\\Static Weather\\\\tracks',\n\s*'C:\\\\Users\\\\benha\\\\OneDrive\\\\03_CREATIVE\\\\Music\\\\My Ways of Songs'\n\s*\];[\s\S]*?res\.json\(tracks\);\n\s*\}\);/s;

const newApiTracks = `// 10. List available audio tracks
app.get('/api/project/:name/tracks', (req, res) => {
  const config = getProjectConfig(req.params.name);
  const trackDirs = config.audio_path ? [config.audio_path] : [
    'C:\\\\Users\\\\benha\\\\OneDrive\\\\03_CREATIVE\\\\Music\\\\My Ways of Songs\\\\Static Weather\\\\tracks',
    'C:\\\\Users\\\\benha\\\\OneDrive\\\\03_CREATIVE\\\\Music\\\\My Ways of Songs'
  ];
  const tracks = [];
  trackDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      try {
        fs.readdirSync(dir)
          .filter(f => f.match(/\\.(wav|mp3|flac|aiff|ogg)$/i))
          .forEach(f => tracks.push({ name: f, path: path.join(dir, f) }));
      } catch(e) {}
    }
  });
  res.json(tracks);
});`;

serverCode = serverCode.replace(apiTracksRegex, newApiTracks);

// Add audio_path to Koda actions and system prompt
serverCode = serverCode.replace("const CONFIG_FIELDS = ['concept', 'visual_style', 'character_sheet_path', 'mode'];", "const CONFIG_FIELDS = ['concept', 'visual_style', 'character_sheet_path', 'audio_path', 'mode'];");
serverCode = serverCode.replace("- **Character Sheet:** ${config.character_sheet_path || DEFAULT_CHAR_PATH}", "- **Character Sheet:** ${config.character_sheet_path || DEFAULT_CHAR_PATH}\\n  - **Audio Path:** ${config.audio_path || '(not set)'}");

fs.writeFileSync(serverFile, serverCode);

// 2. Patch HTML to add audio_path field and load from new endpoint
const htmlFile = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(htmlFile, 'utf8');

const htmlCharInput = `<div>
                  <label class="section-label block mb-1.5">Character Sheet Path</label>
                  <input type="text" x-model="projectConfig.character_sheet_path" placeholder="C:\\path\\to\\characters">
                </div>`;
const htmlAudioInput = `<div>
                  <label class="section-label block mb-1.5">Character Sheet Path</label>
                  <input type="text" x-model="projectConfig.character_sheet_path" placeholder="C:\\path\\to\\characters">
                </div>
                <div>
                  <label class="section-label block mb-1.5">Audio Tracks Path</label>
                  <input type="text" x-model="projectConfig.audio_path" placeholder="C:\\path\\to\\audio">
                </div>`;
html = html.replace(htmlCharInput, htmlAudioInput);

// Replace /api/tracks fetch with /api/project/:name/tracks inside onProjectChange
const oldFetchTracks = `const res = await fetch('/api/tracks');
            this.audioTracks = await res.json();`;
const newFetchTracks = `const res = await fetch(\`/api/project/\${this.selectedProject}/tracks\`);
            this.audioTracks = await res.json();`;
html = html.replace(oldFetchTracks, newFetchTracks);

// Also add it to projectConfig init
const oldConfigInit = `character_sheet_path: config.character_sheet_path || 'C:\\\\Users\\\\benha\\\\OneDrive\\\\03_CREATIVE\\\\Music\\\\My Ways of Songs\\\\_Assets\\\\Characters',
              comfy_url: config.comfy_url || 'localhost:8000',`;
const newConfigInit = `character_sheet_path: config.character_sheet_path || 'C:\\\\Users\\\\benha\\\\OneDrive\\\\03_CREATIVE\\\\Music\\\\My Ways of Songs\\\\_Assets\\\\Characters',
              audio_path: config.audio_path || '',
              comfy_url: config.comfy_url || 'localhost:8000',`;
html = html.replace(oldConfigInit, newConfigInit);

fs.writeFileSync(htmlFile, html);
console.log("Audio Path UI patch applied.");