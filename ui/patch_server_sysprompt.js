const fs = require('fs');
const path = require('path');
const serverFile = path.join(__dirname, 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

const regex = /- \*\*Video prompts \(LTX 2\.3\):\*\* Present tense, motion-centric, explicit camera movement\. E\.g\..*?- Be direct\. Think like a DP\. No filler\./s;

const newRules = `- **Video prompts (LTX 2.3) Rules:**
    1. Single flowing paragraph (4 to 8 sentences). Present tense.
    2. Establish shot scale and scene (lighting, color, textures, mood).
    3. Describe the core action flowing naturally from beginning to end.
    4. Define characters (age, styling, emotion via physical cues).
    5. Identify camera language (follows, pans left, pushes in, handheld). Describe how objects look *after* the camera moves.
    6. Include Audio/Dialogue (e.g. Woman: "Stop being so dramatic").
    7. Avoid internal states ("sad") - use physical cues. Avoid text/logos. Do not mix conflicting lighting.
  - **Image prompts:** Composition, lighting, mood, subject placement. Cinematic still (match video style).
  - Be direct, use cinematic terminology. Think like a Director of Photography.`;

if (code.match(regex)) {
    let finalCode = code.replace(regex, newRules);
    fs.writeFileSync(serverFile, finalCode);
    console.log("System prompt patched.");
} else {
    console.log("Could not find prompt regex to replace.");
}