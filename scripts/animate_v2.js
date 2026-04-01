const fs = require('fs');
const http = require('http');
const path = require('path');
const FormData = require('form-data');

// CONFIG
const COMFY_URL = '127.0.0.1';
const COMFY_PORT = 8000;
const WORKFLOW_FILE = 'C:\\Users\\benha\\Downloads\\video_ltx2_3_i2v-genvideo.json';
const OUTPUT_DIR = path.join(process.cwd(), 'comfy', 'output');

// Ensure output dir
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Args
const args = process.argv.slice(2);
if (args.length < 2) {
    console.error("Usage: node skills/director/scripts/animate_v2.js <image_path> <prompt>");
    process.exit(1);
}

const imagePath = args[0];
const promptText = args[1];

async function main() {
    console.log(`🎬 Animating (LTX 2.3 i2v): "${path.basename(imagePath)}"`);
    console.log(`📝 Prompt: "${promptText}"`);
    
    // 1. Upload Image
    const uploadedFilename = await uploadImage(imagePath);
    console.log(`✅ Image uploaded as: ${uploadedFilename}`);

    // 2. Load Workflow
    let workflow = JSON.parse(fs.readFileSync(WORKFLOW_FILE, 'utf8'));
    
    // 3. Modify Workflow
    const seed = Math.floor(Math.random() * 1000000000);
    
    // Set Input Image
    if (workflow["269"]) {
        workflow["269"].inputs.image = uploadedFilename;
    } else {
        throw new Error("Node 269 (LoadImage) not found in workflow");
    }

    // Set Prompt
    // The new workflow uses a PrimitiveStringMultiline node (267:266) that feeds into TextGenerateLTX2Prompt
    if (workflow["267:266"]) {
        workflow["267:266"].inputs.value = promptText;
    } else {
        throw new Error("Node 267:266 (Prompt Input) not found in workflow");
    }

    // Set Seed (Update both RandomNoise nodes)
    if (workflow["267:216"]) workflow["267:216"].inputs.noise_seed = seed;
    if (workflow["267:237"]) workflow["267:237"].inputs.noise_seed = seed + 1; // Slight offset for the second noise seed just in case

    // Set Output Filename
    const safeName = path.basename(imagePath, path.extname(imagePath)).substring(0, 20);
    // Node 75 is SaveVideo
    if (workflow["75"]) {
        workflow["75"].inputs.filename_prefix = `LTX23_${safeName}`;
    }

    // 4. Queue Prompt
    try {
        const promptId = await queuePrompt(workflow);
        console.log(`🚀 Queued LTX 2.3! ID: ${promptId}`);
        await trackProgress(promptId);
    } catch (e) {
        console.error("Error:", e.message);
        process.exit(1);
    }
}

async function uploadImage(filepath) {
    return new Promise((resolve, reject) => {
        const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
        const filename = path.basename(filepath);
        const fileStream = fs.createReadStream(filepath);

        const options = {
            hostname: COMFY_URL,
            port: COMFY_PORT,
            path: '/upload/image',
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                if (res.statusCode !== 200) reject(new Error(`Upload Status ${res.statusCode}: ${body}`));
                try {
                    const json = JSON.parse(body);
                    if (json.name) resolve(json.name);
                    else reject(new Error("Upload failed: " + body));
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);

        // Write multipart body
        req.write(`--${boundary}\r\n`);
        req.write(`Content-Disposition: form-data; name="image"; filename="${filename}"\r\n`);
        req.write(`Content-Type: image/png\r\n\r\n`);

        fileStream.pipe(req, { end: false });
        fileStream.on('end', () => {
            req.write(`\r\n--${boundary}\r\n`);
            req.write(`Content-Disposition: form-data; name="overwrite"\r\n\r\n`);
            req.write(`true\r\n`);
            req.write(`--${boundary}--\r\n`);
            req.end();
        });
    });
}

function queuePrompt(workflow) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ prompt: workflow });
        const req = http.request({
            hostname: COMFY_URL,
            port: COMFY_PORT,
            path: '/prompt',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                if (res.statusCode !== 200) reject(new Error(`Status ${res.statusCode}: ${body}`));
                try {
                    const json = JSON.parse(body);
                    resolve(json.prompt_id);
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function trackProgress(promptId) {
    console.log("⏳ Waiting for LTX 2.3 generation...");
    return new Promise((resolve, reject) => {
        const poll = setInterval(() => {
            http.get(`http://${COMFY_URL}:${COMFY_PORT}/history/${promptId}`, (res) => {
                let body = '';
                res.on('data', d => body += d);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(body);
                        if (json[promptId]) {
                            clearInterval(poll);
                            const outputs = json[promptId].outputs;
                            // Node 75 is SaveVideo
                            if (outputs["75"]) {
                                console.log("🔍 Output Debug:", JSON.stringify(outputs["75"], null, 2));
                                const files = outputs["75"].gifs || outputs["75"].videos || outputs["75"].images || [];
                                if (files.length > 0) {
                                    downloadFiles(files).then(resolve).catch(reject);
                                } else {
                                    console.log("⚠️ Output node found but no files listed.");
                                    resolve();
                                }
                            } else {
                                console.log("⚠️ No video output found in history. Available nodes:", Object.keys(outputs));
                                resolve();
                            }
                        }
                    } catch (e) {
                         // Ignore parse errors, just keep polling
                    }
                });
            }).on('error', () => {
                // Ignore connection errors, just keep polling
            });
        }, 5000);
    });
}

async function downloadFiles(files) {
    const promises = files.map(f => {
        return new Promise((resolve, reject) => {
            const filename = f.filename;
            const subfolder = f.subfolder;
            const type = f.type;
            const url = `http://${COMFY_URL}:${COMFY_PORT}/view?filename=${filename}&subfolder=${subfolder}&type=${type}`;
            const dest = path.join(OUTPUT_DIR, filename);
            
            const file = fs.createWriteStream(dest);
            http.get(url, (response) => {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log(`✅ Saved: ${dest}`);
                    freeMemory();
                    resolve();
                });
                file.on('error', (err) => {
                    fs.unlink(dest, () => {}); // Delete the file async
                    reject(err);
                });
            }).on('error', (err) => {
                fs.unlink(dest, () => {}); // Delete the file async
                reject(err);
            });
        });
    });
    return Promise.all(promises);
}

function freeMemory() {
    const req = http.request({
        hostname: COMFY_URL,
        port: COMFY_PORT,
        path: '/free',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    req.write(JSON.stringify({ unload_models: true, free_memory: true }));
    req.end();
}

main();