const fs = require('fs');
const path = require('path');
const htmlFile = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(htmlFile, 'utf8');

const replacement = `async sendKodaPrompt(shot) {
          this.chatInput = "Please write detailed image and video prompts for shot " + shot.id + " (" + shot.name + "). Ensure you output the <action> tags to update the shot_list.json directly.";
          setTimeout(() => this.sendChat(), 50);
        }`;

if (html.includes('sendKodaPrompt')) {
  html = html.replace(/async sendKodaPrompt\(shot\) \{[\s\S]*?this\.sendChat\(\);\s*\}/, replacement);
  fs.writeFileSync(htmlFile, html);
  console.log("sendChat patch applied.");
}