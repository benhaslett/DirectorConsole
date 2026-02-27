const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_DIR = path.resolve(process.cwd(), 'projects');

// 1. Scan Projects
if (!fs.existsSync(PROJECT_DIR)) {
    console.log("No projects directory found.");
    process.exit(0);
}

const projects = fs.readdirSync(PROJECT_DIR).filter(f => fs.statSync(path.join(PROJECT_DIR, f)).isDirectory());

console.log(`🎬 Producer: Scanning ${projects.length} projects...`);

projects.forEach(projectName => {
    const projectPath = path.join(PROJECT_DIR, projectName);
    const shotListPath = path.join(projectPath, 'shot_list.json');

    if (!fs.existsSync(shotListPath)) return;

    try {
        const shotList = JSON.parse(fs.readFileSync(shotListPath, 'utf8'));
        let pendingCount = 0;
        let imageReadyCount = 0;

        shotList.shots.forEach(shot => {
            if (shot.status === 'pending') pendingCount++;
            if (shot.status === 'image_ready') imageReadyCount++;
        });

        // 2. Decide Action
        if (pendingCount > 0) {
            console.log(`Project "${projectName}": Found ${pendingCount} pending shots. Triggering IMAGE generation...`);
            try {
                execSync(`node skills/director/scripts/shoot.js "${projectName}" --phase images`, { stdio: 'inherit' });
            } catch (e) { console.error(`❌ Error generating images for ${projectName}:`, e.message); }
        }

        // Re-read shotlist to see if images finished
        const updatedShotList = JSON.parse(fs.readFileSync(shotListPath, 'utf8'));
        let newImageReadyCount = 0;
        updatedShotList.shots.forEach(shot => {
             if (shot.status === 'image_ready') newImageReadyCount++;
        });

        if (newImageReadyCount > 0) {
            console.log(`Project "${projectName}": Found ${newImageReadyCount} ready for video. Triggering VIDEO generation...`);
            try {
                execSync(`node skills/director/scripts/shoot.js "${projectName}" --phase video`, { stdio: 'inherit' });
            } catch (e) { console.error(`❌ Error animating video for ${projectName}:`, e.message); }
        }

        if (pendingCount === 0 && imageReadyCount === 0) {
            console.log(`Project "${projectName}": All quiet. (Check status with: director status "${projectName}")`);
        }

    } catch (e) {
        console.error(`Error processing project ${projectName}:`, e.message);
    }
});
