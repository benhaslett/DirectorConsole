const fs = require('fs');
const path = require('path');

const audioVideoScript = path.join(__dirname, '../../comfy-art/scripts/animate_ltx23_audio.js');
let code = fs.readFileSync(audioVideoScript, 'utf8');

const targetStr1 = `const audioPath = args[1];\nconst promptText = args[2];`;
const newStr1 = `const audioPath = args[1];\nconst promptText = args[2];\nconst durationSecs = parseFloat(args[3]) || 5;`;
code = code.replace(targetStr1, newStr1);

const targetStr2 = `// Frame count (~5 seconds at 24fps)\n    workflow["167:146"].inputs.value = 121;`;
const newStr2 = `// Frame count (duration * 24fps + 1)\n    const frameCount = Math.floor(durationSecs * 24) + 1;\n    if (workflow["167:146"]) workflow["167:146"].inputs.value = frameCount;`;
code = code.replace(targetStr2, newStr2);

fs.writeFileSync(audioVideoScript, code);

const serverFile = path.join(__dirname, 'server.js');
let serverCode = fs.readFileSync(serverFile, 'utf8');
const avArgsStr = `const args = [scriptPath, shot.image_file, audioPath, prompt];`;
const newAvArgsStr = `const args = [scriptPath, shot.image_file, audioPath, prompt, (shot.duration || 10).toString()];`;
serverCode = serverCode.replace(avArgsStr, newAvArgsStr);
fs.writeFileSync(serverFile, serverCode);

console.log("Audio video length patch applied.");