const fs = require('fs');
const path = require('path');
const htmlFile = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(htmlFile, 'utf8');

const regexDisabled = /:disabled="!selectedAudio"/g;
const regexClass = /:class="!selectedAudio && 'opacity-30'"/g;

html = html.replace(regexDisabled, `:disabled="!(shot.audio_file || selectedAudio)"`);
html = html.replace(regexClass, `:class="!(shot.audio_file || selectedAudio) && 'opacity-30'"`);

fs.writeFileSync(htmlFile, html);
console.log("Audio button patch applied.");