const fs = require('fs');
const path = require('path');
const htmlFile = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(htmlFile, 'utf8');

// 1. Add this.saveProject() to addShot
const addShotRegex = /addShot\(\) \{\s*if \(!this\.currentProject\) return;\s*const shots = this\.currentProject\.shots \|\| \[\];\s*const maxId = shots\.reduce\(\(m, s\) => Math\.max\(m, s\.id\), 0\);\s*shots\.push\(\{[\s\S]*?\}\);\s*this\.currentProject = \{ \.\.\.this\.currentProject, shots \};\s*\}/s;

const newAddShot = `async addShot() {
          if (!this.currentProject) return;
          const shots = this.currentProject.shots || [];
          const maxId = shots.reduce((m, s) => Math.max(m, s.id), 0);
          shots.push({
            id: maxId + 1,
            name: \`Shot \${String(maxId + 1).padStart(2, '0')}\`,
            duration: 10,
            audio_file: '',
            character_sheets: '',
            image_prompt: '',
            video_prompt: '',
            status: 'pending',
            image_file: null,
            video_file: ''
          });
          this.currentProject = { ...this.currentProject, shots };
          await this.saveProject();
        }`;
html = html.replace(addShotRegex, newAddShot);

// 2. Add this.saveProject() to deleteShot
const delShotRegex = /deleteShot\(id\) \{\s*if \(!this\.currentProject\) return;\s*this\.currentProject = \{ \.\.\.this\.currentProject, shots: this\.currentProject\.shots\.filter\(s => s\.id !== id\) \};\s*\}/s;
const newDelShot = `async deleteShot(id) {
          if (!this.currentProject) return;
          this.currentProject = { ...this.currentProject, shots: this.currentProject.shots.filter(s => s.id !== id) };
          await this.saveProject();
        }`;
html = html.replace(delShotRegex, newDelShot);

// 3. Add this.saveProject() to uploadImage
const uploadImgRegex = /async uploadImage\(shotId, event\) \{\s*const file = event\.target\.files\[0\];/s;
const newUploadImg = `async uploadImage(shotId, event) {
          await this.saveProject();
          const file = event.target.files[0];`;
html = html.replace(uploadImgRegex, newUploadImg);

fs.writeFileSync(htmlFile, html);
console.log("HTML save sync patch applied.");