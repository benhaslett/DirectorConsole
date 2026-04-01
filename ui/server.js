const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const cors = require('cors');
const multer = require('multer');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;

// Configure paths — resolve to workspace/projects regardless of cwd
const PROJECTS_DIR = path.resolve(__dirname, '../../../projects');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Ensure projects directory exists
if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// Serve projects statically to access images/videos directly
app.use('/projects-static', express.static(PROJECTS_DIR));

// --- API Routes ---

// 1. List Projects
app.get('/api/projects', (req, res) => {
  try {
    const items = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
    const projects = items
      .filter(item => item.isDirectory())
      .map(item => item.name);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get Project Data (shot_list.json)
app.get('/api/project/:name', (req, res) => {
  const projectName = req.params.name;
  const filePath = path.join(PROJECTS_DIR, projectName, 'shot_list.json');

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Project not found' });
  }

  try {
    const data = fs.readFileSync(filePath, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Create New Project (MUST be before /:name to avoid wildcard collision)
app.post('/api/project/create', (req, res) => {
  const name = req.body.name;
  if (!name || name.length < 3) {
    return res.status(400).json({ error: 'Project name required (min 3 chars)' });
  }

  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const projectDir = path.join(PROJECTS_DIR, safeName);

  if (fs.existsSync(projectDir)) {
    return res.status(400).json({ error: 'Project already exists' });
  }

  try {
    fs.mkdirSync(projectDir, { recursive: true });

    const initialShotList = { concept: safeName.replace(/_/g, ' '), shots: [] };
    fs.writeFileSync(path.join(projectDir, 'shot_list.json'), JSON.stringify(initialShotList, null, 2));

    const initialConfig = { comfy_url: "localhost:8000", preset: "ascension" };
    fs.writeFileSync(path.join(projectDir, 'config.json'), JSON.stringify(initialConfig, null, 2));

    res.json({ success: true, name: safeName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Save Project Data
app.post('/api/project/:name', (req, res) => {
  const projectName = req.params.name;
  const filePath = path.join(PROJECTS_DIR, projectName, 'shot_list.json');

  try {
    fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Configure Multer
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const projectName = req.params.name;
      const uploadDir = path.join(PROJECTS_DIR, projectName, 'images');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const shotId = req.params.shotId || 'bulk_temp';
      const timestamp = Date.now();
      cb(null, `Shot_${shotId}_uploaded_${timestamp}${ext}`);
    }
  })
});

// 4. Upload Image for a Shot
app.post('/api/project/:name/upload/:shotId', upload.single('image'), (req, res) => {
  const projectName = req.params.name;
  const shotId = parseInt(req.params.shotId);
  const shotListPath = path.join(PROJECTS_DIR, projectName, 'shot_list.json');

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const projectData = JSON.parse(fs.readFileSync(shotListPath, 'utf8'));
    const shotIndex = projectData.shots.findIndex(s => s.id === shotId);

    if (shotIndex === -1) {
      return res.status(404).json({ error: 'Shot not found' });
    }

    projectData.shots[shotIndex].image_file = req.file.path;
    fs.writeFileSync(shotListPath, JSON.stringify(projectData, null, 2));

    res.json({
      success: true,
      filePath: req.file.path,
      url: `/projects-static/${projectName}/images/${req.file.filename}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Bulk Upload (New Shots)
const bulkUpload = upload.array('images');
app.post('/api/project/:name/bulk-upload', (req, res) => {
  bulkUpload(req, res, (err) => {
    if (err) return res.status(500).json({ error: err.message });

    const projectName = req.params.name;
    const shotListPath = path.join(PROJECTS_DIR, projectName, 'shot_list.json');

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    try {
      let projectData = JSON.parse(fs.readFileSync(shotListPath, 'utf8'));
      if (!projectData.shots) projectData.shots = [];

      let maxId = 0;
      if (projectData.shots && projectData.shots.length > 0) {
        maxId = Math.max(...projectData.shots.map(s => s.id));
      }

      const newShots = [];

      req.files.forEach((file, index) => {
        const newId = maxId + 1 + index;
        const dir = path.dirname(file.path);
        const ext = path.extname(file.originalname);
        const timestamp = Date.now();
        const newFilename = `Shot_${newId}_bulk_${timestamp}${ext}`;
        const newPath = path.join(dir, newFilename);

        fs.renameSync(file.path, newPath);

        const shot = {
          id: newId,
          name: `Imported Shot ${newId}`,
          duration: 4,
          image_prompt: "",
          video_prompt: "",
          status: "pending",
          image_file: newPath,
          video_file: ""
        };

        projectData.shots.push(shot);
        newShots.push(shot);
      });

      fs.writeFileSync(shotListPath, JSON.stringify(projectData, null, 2));

      res.json({ success: true, newShots: newShots });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

// 6. Export to director.md
app.post('/api/project/:name/export', (req, res) => {
  const projectName = req.params.name;
  const projectDir = path.join(PROJECTS_DIR, projectName);
  const mdPath = path.join(projectDir, 'director.md');
  const shotListPath = path.join(projectDir, 'shot_list.json');

  try {
    const projectData = JSON.parse(fs.readFileSync(shotListPath, 'utf8'));

    let mdContent = `# ${projectData.concept || projectName}\n\n`;
    mdContent += `Generated: ${new Date().toISOString()}\n\n`;

    projectData.shots.forEach(shot => {
      mdContent += `## Shot ${shot.id}: ${shot.name}\n`;
      mdContent += `- **Status**: ${shot.status}\n`;
      mdContent += `- **Duration**: ${shot.duration}s\n`;
      mdContent += `- **Image Prompt**: ${shot.image_prompt}\n`;
      mdContent += `- **Video Prompt**: ${shot.video_prompt}\n`;
      if (shot.image_file) mdContent += `- **Image**: ![Image](${shot.image_file})\n`;
      if (shot.video_file) mdContent += `- **Video**: [Video](${shot.video_file})\n`;
      mdContent += `\n---\n\n`;
    });

    fs.writeFileSync(mdPath, mdContent);
    res.json({ success: true, path: mdPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// (Create New Project moved above /:name routes — see top of route section)

// Helper: Ollama vision analysis
function runOllamaVision(imagePath, prompt) {
  return new Promise((resolve, reject) => {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const payload = JSON.stringify({
      model: 'llava:13b',
      prompt: prompt,
      stream: false,
      images: [base64Image]
    });

    fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    })
    .then(r => r.json())
    .then(data => {
      if (data.response) resolve(data.response);
      else reject(new Error("No response from vision model"));
    })
    .catch(err => reject(err));
  });
}

// Helper: Ollama text generation
function runOllamaText(prompt) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ollama', ['run', 'qwen3:8b'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    let data = '';
    let error = '';

    proc.stdout.on('data', (chunk) => { data += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { error += chunk.toString(); });

    proc.stdin.write(prompt);
    proc.stdin.end();

    proc.on('close', (code) => {
      if (code !== 0 && data.trim().length === 0) return reject(new Error(error));
      resolve(data);
    });
  });
}

// 7. Auto-Generate Prompts (AI)
app.post('/api/project/:name/generate-prompts', async (req, res) => {
  const projectName = req.params.name;
  const shotId = req.body.shotId;
  const shotListPath = path.join(PROJECTS_DIR, projectName, 'shot_list.json');

  try {
    const projectData = JSON.parse(fs.readFileSync(shotListPath, 'utf8'));
    const concept = projectData.concept || "Cinematic Video";

    const shotsToProcess = shotId
      ? projectData.shots.filter(s => s.id === parseInt(shotId))
      : projectData.shots.filter(s => !s.video_prompt || s.video_prompt.length < 5);

    if (shotsToProcess.length === 0) {
      return res.json({ success: true, message: "No shots needed updating.", updated: 0 });
    }

    for (const shot of shotsToProcess) {
      let visualContext = "";

      if (shot.image_file && fs.existsSync(shot.image_file)) {
        try {
          visualContext = await runOllamaVision(shot.image_file,
            "Describe this image in detail for a film director. Focus on the subject, action, lighting, and composition. Be specific.");
        } catch (e) {
          console.error("Vision analysis failed:", e.message);
          visualContext = shot.name;
        }
      }

      const prompt = `You are an expert Wan 2.2 video prompt engineer.
Project Concept: "${concept}"
Shot Name: "${shot.name}"
Visual Analysis: "${visualContext}"

Write a video_prompt for Wan 2.2 i2v. Rules:
- Single flowing paragraph, 3-5 sentences
- Start with camera movement (e.g. "Camera slowly pushes in,")
- Describe subject motion and atmosphere
- No internal states — use visual cues only
- No text or logos
- End with lighting/mood note

Also write an image_prompt for Flux/SDXL (static frame, detailed, cinematic).

Output ONLY valid JSON: { "image_prompt": "...", "video_prompt": "..." }`;

      try {
        const raw = await runOllamaText(prompt);
        // Strip <think>...</think> blocks (qwen3 thinking model output)
        const output = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        const firstBrace = output.indexOf('{');
        const lastBrace = output.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          const result = JSON.parse(output.substring(firstBrace, lastBrace + 1));
          if (result.image_prompt) shot.image_prompt = result.image_prompt;
          if (result.video_prompt) shot.video_prompt = result.video_prompt;
        }
      } catch (e) {
        console.error(`Prompt gen failed for shot ${shot.id}:`, e.message);
      }
    }

    fs.writeFileSync(shotListPath, JSON.stringify(projectData, null, 2));
    res.json({ success: true, updated: shotsToProcess.length });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: upload image to ComfyUI and return the uploaded filename
function comfyUploadImage(imagePath) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const filename = path.basename(imagePath);
    const fileStream = fs.createReadStream(imagePath);
    const req = http.request({
      hostname: '127.0.0.1', port: 8000, path: '/upload/image', method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.name) resolve(json.name);
          else reject(new Error('Upload failed: ' + body));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\nContent-Type: image/png\r\n\r\n`);
    fileStream.pipe(req, { end: false });
    fileStream.on('end', () => {
      req.write(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="overwrite"\r\n\r\ntrue\r\n--${boundary}--\r\n`);
      req.end();
    });
  });
}

// Helper: submit workflow to ComfyUI queue, returns prompt_id
function comfyQueuePrompt(workflow) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ prompt: workflow });
    const req = http.request({
      hostname: '127.0.0.1', port: 8000, path: '/prompt', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.prompt_id) resolve(json.prompt_id);
          else reject(new Error('Queue failed: ' + body));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// 8. Queue Video Generation — direct ComfyUI submission, no child process
app.post('/api/project/:name/queue-video/:shotId', async (req, res) => {
  const projectName = req.params.name;
  const shotId = parseInt(req.params.shotId);
  const shotListPath = path.join(PROJECTS_DIR, projectName, 'shot_list.json');
  const targetModel = req.body.model || 'wan'; // 'ltx' or 'wan'

  try {
    const projectData = JSON.parse(fs.readFileSync(shotListPath, 'utf8'));
    const shot = projectData.shots.find(s => s.id === shotId);

    if (!shot) return res.status(404).json({ error: 'Shot not found' });
    if (!shot.image_file) return res.status(400).json({ error: 'No image file for shot' });
    if (!fs.existsSync(shot.image_file)) return res.status(400).json({ error: `Image file not found: ${shot.image_file}` });

    const prompt = (shot.video_prompt && shot.video_prompt.trim().length > 0)
      ? shot.video_prompt
      : shot.image_prompt || 'cinematic motion, atmospheric, slow subtle movement';

    let workflowFile;
    let workflow;

    if (targetModel === 'ltx') {
      // Use LTX 2.3 i2v workflow
      workflowFile = 'C:\\Users\\benha\\Downloads\\video_ltx2_3_i2v-genvideo.json';
      workflow = JSON.parse(fs.readFileSync(workflowFile, 'utf8'));
      
      const uploadedName = await comfyUploadImage(shot.image_file);
      
      // Inject LTX inputs
      if (workflow['269']) workflow['269'].inputs.image = uploadedName; // LoadImage
      if (workflow['267:266']) workflow['267:266'].inputs.value = prompt; // Prompt Gen
      
      const seed = Math.floor(Math.random() * 1000000000000000);
      if (workflow['267:216']) workflow['267:216'].inputs.noise_seed = seed;
      if (workflow['267:237']) workflow['267:237'].inputs.noise_seed = seed + 1; // Different seed
      
      if (workflow['75']) { // SaveVideo
        const safeName = path.basename(shot.image_file, path.extname(shot.image_file)).substring(0, 30).replace(/[^a-zA-Z0-9_-]/g, '_');
        workflow['75'].inputs.filename_prefix = `LTX23_${safeName}`;
      }
    } else {
      // Use Wan 2.2 workflow
      workflowFile = path.resolve(__dirname, '../../comfy-art/assets/workflows/wan_video_workflow.json');
      workflow = JSON.parse(fs.readFileSync(workflowFile, 'utf8'));

      const uploadedName = await comfyUploadImage(shot.image_file);

      // Inject Wan inputs
      if (workflow['97']) workflow['97'].inputs.image = uploadedName;
      if (workflow['129:93']) workflow['129:93'].inputs.text = prompt;
      if (workflow['129:86']) workflow['129:86'].inputs.noise_seed = Math.floor(Math.random() * 1000000000000000);
      if (workflow['108']) {
        const safeName = path.basename(shot.image_file, path.extname(shot.image_file)).substring(0, 30).replace(/[^a-zA-Z0-9_-]/g, '_');
        workflow['108'].inputs.filename_prefix = `Wan_${safeName}`;
      }
    }

    // Submit to ComfyUI
    const promptId = await comfyQueuePrompt(workflow);
    console.log(`[Queue Video] Shot ${shotId} (${targetModel.toUpperCase()}) submitted. ComfyUI prompt_id: ${promptId}`);

    res.json({ success: true, promptId, message: `Shot ${shotId} queued for ${targetModel.toUpperCase()}` });

  } catch (err) {
    console.error('[Queue Video Error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 9. Queue Image Generation (Z-Turbo)
app.post('/api/project/:name/queue-image/:shotId', async (req, res) => {
  const projectName = req.params.name;
  const shotId = parseInt(req.params.shotId);
  const shotListPath = path.join(PROJECTS_DIR, projectName, 'shot_list.json');

  try {
    const projectData = JSON.parse(fs.readFileSync(shotListPath, 'utf8'));
    const shot = projectData.shots.find(s => s.id === shotId);

    if (!shot) return res.status(404).json({ error: "Shot not found" });
    if (!shot.image_prompt) return res.status(400).json({ error: "No image prompt" });

    const scriptPath = path.resolve(__dirname, '../../comfy-art/scripts/generate_zturbo.js');
    console.log(`[Queue Image] Shot ${shotId}: node ${scriptPath}`);

    const child = spawn('node', [scriptPath, shot.image_prompt, '--preset', 'ascension'], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();

    res.json({ success: true, message: `Image queued for Shot ${shotId}` });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. List available audio tracks
app.get('/api/tracks', (req, res) => {
  const trackDirs = [
    'C:\\Users\\benha\\OneDrive\\03_CREATIVE\\Music\\My Ways of Songs\\Static Weather\\tracks',
    'C:\\Users\\benha\\OneDrive\\03_CREATIVE\\Music\\My Ways of Songs'
  ];
  const tracks = [];
  trackDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir)
        .filter(f => f.match(/\.(wav|mp3|flac|aiff|ogg)$/i))
        .forEach(f => tracks.push({ name: f, path: path.join(dir, f) }));
    }
  });
  res.json(tracks);
});

// 11. Queue Audio Video (LTX 2.3 i2v + Audio)
app.post('/api/project/:name/queue-audio-video/:shotId', async (req, res) => {
  const projectName = req.params.name;
  const shotId = parseInt(req.params.shotId);
  const audioPath = req.body.audioPath;
  const shotListPath = path.join(PROJECTS_DIR, projectName, 'shot_list.json');

  if (!audioPath) return res.status(400).json({ error: 'No audio path provided' });
  if (!fs.existsSync(audioPath)) return res.status(400).json({ error: `Audio file not found: ${audioPath}` });

  try {
    const projectData = JSON.parse(fs.readFileSync(shotListPath, 'utf8'));
    const shot = projectData.shots.find(s => s.id === shotId);

    if (!shot) return res.status(404).json({ error: 'Shot not found' });
    if (!shot.image_file) return res.status(400).json({ error: 'No image file for shot' });

    const prompt = (shot.video_prompt && shot.video_prompt.trim().length > 0)
      ? shot.video_prompt
      : shot.image_prompt || 'cinematic motion, subtle movement, atmospheric lighting';

    const scriptPath = path.resolve(__dirname, '../../comfy-art/scripts/animate_ltx23_audio.js');
    console.log(`[Queue Audio Video] Shot ${shotId} + audio: ${path.basename(audioPath)}`);

    const child = spawn('node', [scriptPath, shot.image_file, audioPath, prompt], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();

    res.json({ success: true, message: `Audio video queued for Shot ${shotId}: "${shot.name}"` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 12. Serve arbitrary local files (images/videos) by absolute path
// Security: only image/video extensions allowed
app.get('/api/file', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).send('No path provided');

  const ext = path.extname(filePath).toLowerCase();
  const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.webm', '.mov'];
  if (!allowed.includes(ext)) return res.status(403).send('File type not allowed');

  if (!fs.existsSync(filePath)) return res.status(404).send('File not found: ' + filePath);

  res.sendFile(path.resolve(filePath));
});

// Start Server
app.listen(PORT, () => {
  console.log(`Director UI running at http://localhost:${PORT}`);
  console.log(`Projects dir: ${PROJECTS_DIR}`);
});
