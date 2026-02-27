const fs = require('fs');
const path = require('path');
const http = require('http');

// Config
const PROJECT_DIR = path.resolve(process.cwd(), 'projects');
const args = process.argv.slice(2);
const projectName = args[0];
let phase = null;

// Parse args for --phase
const phaseIndex = args.indexOf('--phase');
if (phaseIndex !== -1 && args[phaseIndex + 1]) {
    phase = args[phaseIndex + 1];
} else {
    // Fallback: assume 2nd arg is phase if not flagged
    phase = args[1];
}

const safeName = projectName.replace(/[^a-z0-9]/gi, '_');
const projectPath = path.join(PROJECT_DIR, safeName);

// Validate
if (!projectName || !phase) {
    console.error("Usage: node skills/director/scripts/shoot.js <ProjectName> --phase [images|video]");
    process.exit(1);
}

// Load Project
const shotListPath = path.join(projectPath, 'shot_list.json');
if (!fs.existsSync(shotListPath)) {
    console.error(`Project "${projectName}" not found.`);
    process.exit(1);
}

const shotList = JSON.parse(fs.readFileSync(shotListPath, 'utf8'));
const config = JSON.parse(fs.readFileSync(path.join(projectPath, 'config.json'), 'utf8'));
const comfyUrl = config.comfy_url.split(':');
const COMFY_HOST = comfyUrl[0];
const COMFY_PORT = parseInt(comfyUrl[1]);

async function main() {
    console.log(`🎬 Shooting Phase: ${phase} for project "${projectName}"`);
    console.log(`🎥 Total Shots: ${shotList.shots.length}`);
    
    // Create Output Dirs
    const imageDir = path.join(projectPath, 'images');
    const videoDir = path.join(projectPath, 'videos');
    if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir, { recursive: true });
    if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

    // Iterate Shots
    for (const shot of shotList.shots) {
        if (shot.status === 'done') {
            console.log(`✅ Shot ${shot.id} already done. Skipping.`);
            continue;
        }

        try {
            if (phase === 'images') {
                await generateImage(shot, imageDir);
            } else if (phase === 'video') {
                await animateShot(shot, imageDir, videoDir);
            }
        } catch (err) {
            console.error(`⚠️ Critical error on Shot ${shot.id}, skipping to next:`, err.message);
            shot.status = 'error_skipped';
        }
    }
}

// Reuse Comfy Image Logic (simplified)
async function generateImage(shot, outputDir) {
    console.log(`🖼️ Generating Image for Shot ${shot.id}: "${shot.name}"`);
    // Need to call comfy-art generate logic here.
    // Ideally, we'd import the function, but for now we'll shell out to the existing script?
    // Or replicate the logic. Replicating is cleaner for dependency management.
    // ... Actually, better to shell out to keep `comfy-art` separate.
    const { execSync } = require('child_process');
    try {
        const cmd = `node skills/comfy-art/scripts/generate.js "${shot.image_prompt}" --preset ${config.preset}`;
        console.log(`> Executing: ${cmd}`);
        execSync(cmd, { stdio: 'inherit' });
        
        // Find the generated file (it goes to comfy/output by default)
        // Move it to project/images/
        const comfyOutput = path.join(process.cwd(), 'comfy', 'output');
        const files = fs.readdirSync(comfyOutput).filter(f => f.endsWith('.png')).sort((a,b) => fs.statSync(path.join(comfyOutput,b)).mtime - fs.statSync(path.join(comfyOutput,a)).mtime);
        if (files.length > 0) {
            const latest = files[0];
            const src = path.join(comfyOutput, latest);
            const dest = path.join(outputDir, `Shot_${shot.id}_${latest}`);
            fs.renameSync(src, dest);
            console.log(`✅ Saved Image: ${dest}`);
            shot.image_file = dest;
            shot.status = 'image_ready'; // Update status
        }
    } catch (e) {
        console.error(`❌ Failed Shot ${shot.id}: ${e.message}`);
        shot.status = 'failed';
    }
    // Update shot list
    fs.writeFileSync(shotListPath, JSON.stringify(shotList, null, 2));
}

// Reuse LTX Video Logic
async function animateShot(shot, imageDir, videoDir) {
    if (!shot.image_file) {
        console.warn(`⚠️ Shot ${shot.id} has no source image. Run --phase images first.`);
        return;
    }
    console.log(`🎞️ Animating Shot ${shot.id}: "${shot.name}"`);
    const { execSync } = require('child_process');
    try {
        const cmd = `node skills/comfy-art/scripts/animate.js "${shot.image_file}" "${shot.video_prompt}"`;
        console.log(`> Executing: ${cmd}`);
        execSync(cmd, { stdio: 'inherit' });

        // Find Generated Video
        const comfyOutput = path.join(process.cwd(), 'comfy', 'output');
        const files = fs.readdirSync(comfyOutput).filter(f => f.endsWith('.mp4')).sort((a,b) => fs.statSync(path.join(comfyOutput,b)).mtime - fs.statSync(path.join(comfyOutput,a)).mtime);
        if (files.length > 0) {
            const latest = files[0];
            const src = path.join(comfyOutput, latest);
            const dest = path.join(videoDir, `Shot_${shot.id}.mp4`);
            fs.renameSync(src, dest);
            console.log(`✅ Saved Video: ${dest}`);
            shot.video_file = dest;
            shot.status = 'done';
        }
    } catch (e) {
        console.error(`❌ Failed Shot ${shot.id}: ${e.message}`);
        shot.status = 'failed';
    }
    // Update shot list
    fs.writeFileSync(shotListPath, JSON.stringify(shotList, null, 2));
}

main();
