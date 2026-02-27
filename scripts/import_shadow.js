const fs = require('fs');
const path = require('path');

const SOURCE_DIR = "C:\\Users\\benha\\OneDrive\\03_CREATIVE\\Music\\My Ways of Songs\\Shadow of the Blues";
const DEST_DIR = "C:\\Users\\benha\\.openclaw\\workspace\\projects\\Shadow_of_the_Blues\\images";
const JSON_PATH = "C:\\Users\\benha\\.openclaw\\workspace\\projects\\Shadow_of_the_Blues\\shot_list.json";

if (!fs.existsSync(DEST_DIR)) fs.mkdirSync(DEST_DIR, { recursive: true });

const files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.png'));
const shots = [];

files.forEach((file, index) => {
    const src = path.join(SOURCE_DIR, file);
    const dest = path.join(DEST_DIR, file); // Keep original name for clarity
    fs.copyFileSync(src, dest);
    
    shots.push({
        id: index + 1,
        name: file.replace('.png', '').replace(/_/g, ' '),
        duration: 4,
        image_prompt: "",
        video_prompt: "",
        status: "pending",
        image_file: dest,
        video_file: ""
    });
});

const json = {
    concept: "Shadow of the Blues - Cinematic Remakes",
    shots: shots
};

fs.writeFileSync(JSON_PATH, JSON.stringify(json, null, 2));
console.log(`Imported ${shots.length} shots.`);
