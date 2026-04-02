const fs = require('fs');
const path = require('path');
const htmlFile = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(htmlFile, 'utf8');

const regex = /async sendKodaPrompt\(shot\) \{[\s\S]*?this\.chatInput.*?;[\s\S]*?setTimeout\(\(\) => this\.sendChat\(\), 50\);\s*\}/s;

const newCode = `async sendKodaPrompt(shot) {
          let msg = "Please write detailed image and video prompts for shot " + shot.id + " (" + shot.name + "). Ensure you output the <action> tags to update the shot_list.json directly.";
          
          if (shot.image_file) {
              msg = "Please write detailed image and video prompts for shot " + shot.id + " (" + shot.name + "). I have an existing plate image for this shot located at: " + shot.image_file + "\\n\\nPlease use your tools to 'read' or 'image' analyze that file path first, then write a detailed LTX 2.3 video prompt that perfectly matches the visual context of the image. Ensure you output the <action> tags to update the shot_list.json directly.";
          }
          
          this.chatInput = msg;
          setTimeout(() => this.sendChat(), 50);
      }`;

if (html.match(regex)) {
  html = html.replace(regex, newCode);
  fs.writeFileSync(htmlFile, html);
  console.log("sendKodaPrompt patched to include image path");
} else {
  console.log("Could not find regex match");
}