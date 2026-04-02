const fs = require('fs');
const path = require('path');
const htmlFile = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(htmlFile, 'utf8');

const regex = /async loadAudioTracks\(\) \{[\s\S]*?\}\s*\},/s;
html = html.replace(regex, `async loadAudioTracks() {\n          // Now relies on onProjectChange to fetch /api/project/:name/tracks\n        },`);

const initRegex = /await this\.loadAudioTracks\(\);/s;
html = html.replace(initRegex, '');

fs.writeFileSync(htmlFile, html);
console.log("Audio Tracks UI init patch applied.");