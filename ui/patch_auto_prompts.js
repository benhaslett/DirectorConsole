const fs = require('fs');
const path = require('path');
const htmlFile = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(htmlFile, 'utf8');

const targetRegex = /<button @click="generatePrompts\(shot\.id\)" class="btn btn-ghost btn-sm" title="Auto-generate [\s\S]*?Auto Prompts\s*<\/button>/s;

const newBtn = `<button @click="sendKodaPrompt(shot)" class="btn btn-ghost btn-sm" title="Ask Koda to write a prompt">
                      <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"/></svg>
                      Auto Prompts
                    </button>`;

if (html.match(targetRegex)) {
  html = html.replace(targetRegex, newBtn);
  
  const funcRegex = /async sendChat\(\) \{/s;
  const newFunc = `async sendKodaPrompt(shot) {
          const msg = "Please write detailed image and video prompts for shot " + shot.id + " (" + shot.name + "). Ensure you output the <action> tags to update the shot_list.json directly.";
          this.chatInput = msg;
          this.sendChat();
        }

        async sendChat() {`;
  
  if (html.match(funcRegex)) {
    html = html.replace(funcRegex, newFunc);
    fs.writeFileSync(htmlFile, html);
    console.log("Auto Prompts button mapped to Koda chat.");
  } else {
    console.log("Could not find sendChat function.");
  }
} else {
  console.log("Could not find Auto Prompts button.");
}