const fs = require('fs');
const path = require('path');
const serverFile = path.join(__dirname, 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

const bypassTarget = `// Inject LTX inputs
          if (workflow['269']) workflow['269'].inputs.image = uploadedName; // LoadImage
          if (workflow['267:266']) workflow['267:266'].inputs.value = prompt; // Prompt Gen`;

const bypassReplacement = `// Inject LTX inputs
          if (workflow['269']) workflow['269'].inputs.image = uploadedName; // LoadImage
          if (workflow['267:266']) workflow['267:266'].inputs.value = prompt; // Prompt Gen
          
          // Bypass TextGenerateLTX2Prompt so Comfy uses EXACTLY our prompt without Florence/LLM rewriting it
          if (workflow['267:240']) {
              workflow['267:240'].inputs.text = ["267:266", 0];
          }`;

if (code.includes('if (workflow[\'269\']) workflow[\'269\'].inputs.image = uploadedName; // LoadImage')) {
    code = code.replace(/if \(workflow\['269'\]\) workflow\['269'\]\.inputs\.image = uploadedName; \/\/ LoadImage\s*if \(workflow\['267:266'\]\) workflow\['267:266'\]\.inputs\.value = prompt; \/\/ Prompt Gen/s, 
`if (workflow['269']) workflow['269'].inputs.image = uploadedName; // LoadImage
          if (workflow['267:266']) workflow['267:266'].inputs.value = prompt; // Prompt Gen
          
          // Bypass TextGenerateLTX2Prompt so Comfy uses EXACTLY our prompt without Florence/LLM rewriting it
          if (workflow['267:240']) {
              workflow['267:240'].inputs.text = ["267:266", 0];
          }`);
    fs.writeFileSync(serverFile, code);
    console.log("ComfyUI prompt bypass patched for 'Gen Video'.");
} else {
    console.log("Could not find the target string in 'Gen Video'.");
}