const fs = require('fs');
const path = require('path');
const htmlFile = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(htmlFile, 'utf8');

const queueAudioRegex = /async queueAudioVideo\(shotId\) \{\s*if \(!this\.currentProject\) return;\s*const shot = this\.currentProject\.shots\.find\(s => s\.id === shotId\);\s*if \(!this\.selectedAudio\) return this\.notify\('Select an audio track first', 'error'\);/;

const newQueueAudio = `async queueAudioVideo(shotId) {
          if (!this.currentProject) return;
          const shot = this.currentProject.shots.find(s => s.id === shotId);
          const audioPath = shot?.audio_file || this.selectedAudio;
          if (!audioPath) return this.notify('Select an audio track first', 'error');`;

html = html.replace(queueAudioRegex, newQueueAudio);
html = html.replace(/body: JSON\.stringify\(\{ audioPath: this\.selectedAudio \}\)/g, `body: JSON.stringify({ audioPath })`);

fs.writeFileSync(htmlFile, html);
console.log("HTML patch 2 applied.");