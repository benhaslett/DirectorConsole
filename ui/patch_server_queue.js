const fs = require('fs');
const path = require('path');
const serverFile = path.join(__dirname, 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

// Update queue-video endpoint
const qVideoRegex = /const child = spawn\('node', \[scriptPath, shot\.image_file, shot\.video_prompt\], \{\s*detached: true,\s*stdio: 'ignore'\s*\}\);/;
const newQVideo = `const args = [scriptPath, shot.image_file, shot.video_prompt];
      if (shot.character_sheets) args.push('--character', shot.character_sheets);
      const child = spawn('node', args, {
        detached: true,
        stdio: 'ignore'
      });`;
code = code.replace(qVideoRegex, newQVideo);

// Update queue-image endpoint
const qImageRegex = /const child = spawn\('node', \[scriptPath, shot\.image_prompt, '--preset', 'ascension'\], \{\s*detached: true,\s*stdio: 'ignore'\s*\}\);/;
const newQImage = `const args = [scriptPath, shot.image_prompt, '--preset', 'ascension'];
      if (shot.character_sheets) args.push('--character', shot.character_sheets);
      const child = spawn('node', args, {
        detached: true,
        stdio: 'ignore'
      });`;
code = code.replace(qImageRegex, newQImage);

// Update queue-audio-video endpoint
const qAVRegex = /const child = spawn\('node', \[scriptPath, shot\.image_file, audioPath, prompt\], \{\s*detached: true,\s*stdio: 'ignore'\s*\}\);/;
const newQAV = `const args = [scriptPath, shot.image_file, audioPath, prompt];
      if (shot.character_sheets) args.push('--character', shot.character_sheets);
      const child = spawn('node', args, {
        detached: true,
        stdio: 'ignore'
      });`;
code = code.replace(qAVRegex, newQAV);

fs.writeFileSync(serverFile, code);
console.log("Server queue patch applied.");