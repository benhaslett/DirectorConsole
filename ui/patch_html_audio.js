const fs = require('fs');
const path = require('path');
const htmlFile = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(htmlFile, 'utf8');

const targetStr = `                <div>
                  <label class="section-label block mb-1.5">ComfyUI URL</label>
                  <input type="text" x-model="projectConfig.comfy_url" placeholder="localhost:8000">
                </div>`;
                
const replacementStr = `                <div>
                  <label class="section-label block mb-1.5">Audio Tracks Path</label>
                  <input type="text" x-model="projectConfig.audio_path" placeholder="C:\\\\path\\\\to\\\\audio">
                </div>
                <div>
                  <label class="section-label block mb-1.5">ComfyUI URL</label>
                  <input type="text" x-model="projectConfig.comfy_url" placeholder="localhost:8000">
                </div>`;

if (!html.includes('x-model="projectConfig.audio_path"')) {
  html = html.replace(targetStr, replacementStr);
  fs.writeFileSync(htmlFile, html);
  console.log("HTML audio path patch applied.");
} else {
  console.log("HTML already contains audio path.");
}