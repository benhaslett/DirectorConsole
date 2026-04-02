const fs = require('fs');
const path = require('path');
const htmlFile = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(htmlFile, 'utf8');

// 1. Add fields to HTML
const promptSectionRegex = /<div>\s*<label class="section-label block mb-1"[^>]*>Video Prompt[^<]*<\/label>\s*<textarea x-model="shot\.video_prompt".*?<\/textarea>\s*<\/div>/s;

const newFields = `
                      <div class="flex gap-2 mt-2">
                        <div class="flex-1">
                          <label class="section-label block mb-1">Audio File</label>
                          <select x-model="shot.audio_file" class="text-xs" style="font-size:12px;background:var(--bg);border-color:var(--border);">
                            <option value="">None</option>
                            <template x-for="t in audioTracks" :key="t.path">
                              <option :value="t.path" x-text="t.name"></option>
                            </template>
                          </select>
                        </div>
                        <div class="flex-1">
                          <label class="section-label block mb-1">Character Sheet</label>
                          <select x-model="shot.character_sheets" class="text-xs" style="font-size:12px;background:var(--bg);border-color:var(--border);">
                            <option value="">None</option>
                            <template x-for="c in projectCharacters" :key="c.path">
                              <option :value="c.path" x-text="c.name"></option>
                            </template>
                          </select>
                        </div>
                      </div>`;

html = html.replace(promptSectionRegex, match => match + newFields);

// 2. Add projectCharacters data prop and load logic
const dataPropsRegex = /audioTracks:\s*\[\],/;
html = html.replace(dataPropsRegex, `audioTracks: [],\n        projectCharacters: [],`);

const promiseAllRegex = /const \[proj, config, history\] = await Promise\.all\(\[/;
const newPromiseAllLine = `const [proj, config, chars, history] = await Promise.all([`;
html = html.replace(promiseAllRegex, newPromiseAllLine);

const loadConfigRegex = /fetch\(\`\/api\/project\/\$\{this\.selectedProject\}\/config\`\)\.then\(r => r\.json\(\)\),/;
const loadCharsLine = `\n              fetch(\`/api/project/\${this.selectedProject}/characters\`).then(r => r.json()).catch(()=>([])),`;
html = html.replace(loadConfigRegex, match => match + loadCharsLine);

const historyAssignRegex = /this\.chatMessages\s*=\s*\(history \|\| \[\]\)\.map\(m => \(\{ role: m\.role, content: m\.content \}\)\);/;
const newHistoryAssignLine = `this.projectCharacters = chars || [];\n            this.chatMessages = (history || []).map(m => ({ role: m.role, content: m.content }));`;
html = html.replace(historyAssignRegex, newHistoryAssignLine);

// 3. New shot defaults
const newShotDefaultRegex = /duration:\s*10,/;
const newShotFields = `duration: 10,
            audio_file: '',
            character_sheets: '',`;
if (!html.includes('audio_file: \'\',')) {
  html = html.replace(newShotDefaultRegex, newShotFields);
}

fs.writeFileSync(htmlFile, html);
console.log("HTML patch applied.");