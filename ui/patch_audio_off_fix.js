const fs = require('fs');
const path = require('path');
const serverFile = path.join(__dirname, 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

const targetRegex = /\/\/ Turn off audio generation by bypassing the ConcatAVLatent nodes.*?if \(workflow\['267:248'\]\) workflow\['267:248'\]\.inputs\.samples = \["267:215", 0\];/s;

const newBlock = `// Turn off audio generation by bypassing the ConcatAVLatent nodes
          // 267:215 is the SamplerCustomAdvanced that takes the latent.
          // 267:249 is LTXVImgToVideoInplace which outputs the latent we want.
          if (workflow['267:215']) workflow['267:215'].inputs.latent_image = ["267:249", 0];
          
          // And the refiner SamplerCustomAdvanced (267:219 or 267:209? No, let's just bypass the concat nodes).
          // 267:229 is a Concat node, we just route around it. It feeds into 267:219 maybe?
          // Let's just remove the audio input from the CreateVideo node!
          if (workflow['267:242'] && workflow['267:242'].inputs.audio) {
             delete workflow['267:242'].inputs.audio;
          }`;

if (code.match(targetRegex)) {
  code = code.replace(targetRegex, newBlock);
  fs.writeFileSync(serverFile, code);
  console.log("Audio bypass fix applied.");
} else {
  console.log("Could not find regex match in server.js");
}