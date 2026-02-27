const fs = require('fs');
const path = require('path');

const PROJECT_DIR = path.resolve(process.cwd(), 'projects');
const args = process.argv.slice(2);
const projectName = args[0] || 'Untitled_Project';
const safeName = projectName.replace(/[^a-z0-9]/gi, '_');
const projectPath = path.join(PROJECT_DIR, safeName);

// Ensure projects dir
if (!fs.existsSync(PROJECT_DIR)) {
    fs.mkdirSync(PROJECT_DIR, { recursive: true });
}

// Create Project Structure
if (fs.existsSync(projectPath)) {
    console.log(`⚠️ Project "${safeName}" already exists at: ${projectPath}`);
} else {
    fs.mkdirSync(projectPath);
    console.log(`🎬 Creating project "${projectName}" at: ${projectPath}`);
}

// Scaffold Config
const config = {
    name: projectName,
    fps: 24,
    duration: 240, // 4 mins
    preset: "ascension",
    comfy_url: "127.0.0.1:8000"
};

fs.writeFileSync(path.join(projectPath, 'config.json'), JSON.stringify(config, null, 2));
console.log(`✅ Created config.json`);

// Scaffold Shot List Template
const shotList = {
    concept: "Describe your concept here...",
    shots: [
        {
            id: 1,
            name: "Shot 01",
            duration: 10,
            image_prompt: "Enter visual description for ComfyUI...",
            video_prompt: "Enter motion description for LTX.2...",
            status: "pending"
        },
        // Add more shots here...
    ]
};

fs.writeFileSync(path.join(projectPath, 'shot_list.json'), JSON.stringify(shotList, null, 2));
console.log(`✅ Created shot_list.json template`);
console.log(`\n🚀 Ready! Open ${projectPath}\\shot_list.json and start planning!`);
