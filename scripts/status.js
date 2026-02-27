const fs = require('fs');
const path = require('path');

const PROJECT_DIR = path.resolve(process.cwd(), 'projects');
const args = process.argv.slice(2);
const projectName = args[0] || 'Untitled_Project';
const safeName = projectName.replace(/[^a-z0-9]/gi, '_');
const projectPath = path.join(PROJECT_DIR, safeName);
const shotListPath = path.join(projectPath, 'shot_list.json');

if (!fs.existsSync(shotListPath)) {
    console.error(`Project "${projectName}" not found.`);
    process.exit(1);
}

const shotList = JSON.parse(fs.readFileSync(shotListPath, 'utf8'));

console.log(`🎬 Project: ${shotList.concept}`);
console.log(`🎥 Shots: ${shotList.shots.length}`);
console.log(`-----------------------------------`);
console.log(`ID | Status     | Name`);
console.log(`-----------------------------------`);

shotList.shots.forEach(shot => {
    let statusIcon = '⏳';
    if (shot.status === 'done') statusIcon = '✅';
    if (shot.status === 'failed') statusIcon = '❌';
    if (shot.status === 'image_ready') statusIcon = '🖼️ ';

    console.log(`${shot.id.toString().padEnd(3)}| ${statusIcon} ${shot.status.padEnd(10)} | ${shot.name}`);
});

console.log(`\nTo execute next steps:`);
console.log(`node skills/director/scripts/shoot.js "${projectName}" --phase [images|video]`);
