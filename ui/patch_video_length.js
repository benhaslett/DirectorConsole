const fs = require('fs');
const path = require('path');
const serverFile = path.join(__dirname, 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

const targetStr = `        // Inject LTX inputs
        if (workflow['269']) workflow['269'].inputs.image = uploadedName; // LoadImage
        if (workflow['267:266']) workflow['267:266'].inputs.value = prompt; // Prompt Gen`;

const newStr = `        // Inject LTX inputs
        if (workflow['269']) workflow['269'].inputs.image = uploadedName; // LoadImage
        if (workflow['267:266']) workflow['267:266'].inputs.value = prompt; // Prompt Gen
        
        // Inject Duration (default to 24fps, duration in seconds * 24 + 1)
        const durationSecs = shot.duration || 10;
        const frameCount = Math.floor(durationSecs * 24) + 1;
        if (workflow['267:225']) workflow['267:225'].inputs.value = frameCount;`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, newStr);
  fs.writeFileSync(serverFile, code);
  console.log("Video length patch applied.");
} else {
  console.log("Could not find target string.");
}