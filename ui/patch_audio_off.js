const fs = require('fs');
const path = require('path');
const serverFile = path.join(__dirname, 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

const targetRegex = /const uploadedName = await comfyUploadImage\(shot\.image_file\);\s*\/\/ Inject LTX inputs\s*if \(workflow\['269'\]\) workflow\['269'\]\.inputs\.image = uploadedName; \/\/ LoadImage\s*if \(workflow\['267:266'\]\) workflow\['267:266'\]\.inputs\.value = prompt; \/\/ Prompt Gen/g;

const replacementStr = `const uploadedName = await comfyUploadImage(shot.image_file);
        
        // Turn off audio generation by bypassing the ConcatAVLatent nodes 
        // to pass just the video latent to the sampler
        if (workflow['267:215']) workflow['267:215'].inputs.latent_image = ["267:249", 0];
        if (workflow['267:246']) workflow['267:246'].inputs.latent_image = ["267:230", 0];

        // Also bypass audio decode step by hooking up VAE Decode straight to the video latent
        if (workflow['267:242']) workflow['267:242'].inputs.samples = ["267:246", 0]; // VAEDecode samples
        if (workflow['267:248']) workflow['267:248'].inputs.samples = ["267:215", 0];

        // Inject LTX inputs
        if (workflow['269']) workflow['269'].inputs.image = uploadedName; // LoadImage
        if (workflow['267:266']) workflow['267:266'].inputs.value = prompt; // Prompt Gen`;

if (code.match(targetRegex)) {
  code = code.replace(targetRegex, replacementStr);
  fs.writeFileSync(serverFile, code);
  console.log("Patched server queue-video to bypass audio generation.");
} else {
  console.log("Could not find regex match in server.js");
}