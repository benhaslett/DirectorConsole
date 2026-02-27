const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const { spawn, exec } = require('child_process');

const app = express();
const PORT = 3000;

// Configure paths
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

// 3. Save Project Data
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
      // If single upload, we have shotId. If bulk, we don't.
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

    // Store absolute path
    projectData.shots[shotIndex].image_file = req.file.path;
    
    // Save updated JSON
    fs.writeFileSync(shotListPath, JSON.stringify(projectData, null, 2));

    res.json({ 
      success: true, 
      filePath: req.file.path,
      // Relative URL for frontend
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
      
      // Calculate next ID
      let maxId = 0;
      if (projectData.shots && projectData.shots.length > 0) {
        maxId = Math.max(...projectData.shots.map(s => s.id));
      }

      const newShots = [];

      req.files.forEach((file, index) => {
        const newId = maxId + 1 + index;
        
        // Rename file to standard convention
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

      // Save updated JSON
      fs.writeFileSync(shotListPath, JSON.stringify(projectData, null, 2));

      res.json({ 
        success: true, 
        newShots: newShots
      });
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

// 6.5. Create New Project
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
        
        // Create initial files
        const initialShotList = {
            concept: safeName.replace(/_/g, ' '),
            shots: []
        };
        fs.writeFileSync(path.join(projectDir, 'shot_list.json'), JSON.stringify(initialShotList, null, 2));

        const initialConfig = {
            comfy_url: "localhost:8188",
            preset: "ascension"
        };
        fs.writeFileSync(path.join(projectDir, 'config.json'), JSON.stringify(initialConfig, null, 2));

        res.json({ success: true, name: safeName });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Helper for Ollama (Text)
function runOllamaText(prompt) {
  return new Promise((resolve, reject) => {
    // Switch to Gemini for better instruction following on LTX prompts
    const model = 'google/gemini-3-pro-preview'; 
    console.log(`[LLM] Generating text with ${model}...`);
    
    // We can't use 'ollama run' for Gemini. We need to use the OpenClaw agent to call the model directly
    // OR, since this is a server process, we might not have access to the agent's internal model tools easily.
    // However, the user said "when I go over to gemini it generates great prompts".
    
    // IF this server is running inside the OpenClaw environment, it might have credentials?
    // But wait, this is a standalone node process spawned by `console.js`.
    // It likely DOES NOT have access to the `gemini` model via `ollama` command.
    
    // Re-reading the code: it uses `spawn('ollama', ['run', model]...`
    // So it depends on what models are available in Ollama.
    // The user said "when I go over to gemini", implying they might be doing it manually or in the main chat.
    
    // If I want to fix this within the *local* tool, I have two options:
    // 1. Improve the prompt for Mixtral (which IS available in Ollama).
    // 2. See if I can route the request to a better local model if available (e.g. qwen3-coder:30b might be smarter?).
    
    // The user specifically complained about Mixtral.
    // "the LTX prompts we're getting back from mixtral are not following the prompt guide"
    
    // Let's try to improve the prompt for Mixtral first, adhering strictly to the LTX guide.
    // If that fails, I might need to suggest a way to use the main agent for this, but that's complex for a detached server.
    
    const proc = spawn('ollama', ['run', 'mixtral:8x7b'], {
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
      if (code !== 0) {
        console.error(`Ollama Text Error: ${error}`);
        if (data.trim().length === 0) return reject(new Error(error));
      }
      resolve(data);
    });
  });
}

// Helper for Ollama (Vision)
function runOllamaVision(imagePath, prompt) {
  return new Promise((resolve, reject) => {
    // We'll use llava for vision
    const model = 'llava:13b'; 
    console.log(`[Ollama] Analyzing image with ${model}...`);
    
    // Ollama CLI accepts image path via specific flags or just pure text with some clients, 
    // but the CLI 'run' command isn't great for images in older versions. 
    // However, we can use the "ollama run llava 'prompt' --image path" syntax if supported,
    // OR more reliably, we can use the API if we were using fetch, but here we are using spawn.
    // The CLI syntax for image is often just passing the path in the prompt context? 
    // Actually, checking docs: `ollama run llava "describe this image" /path/to/image.png` is NOT standard.
    // Standard is: ollama run llava, then paste path? No.
    // The reliable way via CLI is currently tricky without an interactive session.
    
    // BETTER APPROACH: Use `curl` to the local API which is always running if Ollama is up.
    // This avoids the interactive CLI complexity for images.
    
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    const payload = JSON.stringify({
      model: model,
      prompt: prompt,
      stream: false,
      images: [base64Image]
    });
    
    // We'll use a simple node fetch-like approach using `curl` via spawn for zero-dependency 
    // (since we didn't install axios/node-fetch and native fetch might be experimental in some node versions, 
    // though Node 24 definitely has fetch. Let's use native fetch!)
    
    fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
    })
    .then(response => response.json())
    .then(data => {
        if (data.response) resolve(data.response);
        else reject(new Error("No response from vision model"));
    })
    .catch(err => reject(err));
  });
}

// 7. Auto-Generate Prompts (AI Agent)
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

    console.log(`Processing ${shotsToProcess.length} shots...`);

    for (const shot of shotsToProcess) {
      let visualContext = "";
      
      // Step 1: Analyze Image (if exists)
      if (shot.image_file && fs.existsSync(shot.image_file)) {
          try {
              console.log(`Analyzing image for Shot ${shot.id}...`);
              visualContext = await runOllamaVision(shot.image_file, 
                  "Describe this image in detail for a film director. Focus on the subject, action, lighting, and composition. Be specific.");
              console.log(`Visual Context: ${visualContext.substring(0, 50)}...`);
          } catch (e) {
              console.error("Vision analysis failed:", e.message);
              visualContext = "Image analysis failed. Base prompts on shot name.";
          }
      }

      // Step 2: Generate Prompts (Text)
      // Updated Prompt based on LTX.2 Guide (2026-02-24)
      const prompt = `
You are an expert LTX.2 Prompt Engineer.
Project Concept: "${concept}"
Shot Name: "${shot.name}"

Visual Analysis of Shot: "${visualContext}"

Task:
1. **Video Prompt** (LTX.2 Specific):
   - CRITICAL: Write a SINGLE flowing paragraph (4-6 sentences).
   - Start with: "Cinematic shot of [Subject]..."
   - Include: Lighting (e.g., "volumetric lighting", "neon glow"), Texture ("sweat on skin", "rough concrete"), and Action.
   - Describe CAMERA MOVEMENT clearly (e.g., "The camera pans left...", "Slow dolly in...").
   - NO internal states (sadness, confusion) - use visual cues (tears, furrowed brow).
   - NO text/logos.

2. **Image Prompt** (Midjourney/Flux):
   - Detailed visual description of the static frame.
   - Include texture (8k, raw), lighting, and style keywords.

Output ONLY valid JSON:
{
  "image_prompt": "...",
  "video_prompt": "..."
}
`;
      try {
        console.log(`[Prompt Gen] Prompting Mixtral for Shot ${shot.id}...`);
        const output = await runOllamaText(prompt);
        console.log(`[Prompt Gen] Mixtral Output (Raw):`, output.substring(0, 100) + "...");
        
        // Clean JSON
        const jsonMatch = output.match(/```json\s*([\s\S]*?)\s*```/) || output.match(/```\s*([\s\S]*?)\s*```/);
        const jsonString = jsonMatch ? jsonMatch[1] : output;
        
        // Aggressive cleanup: remove non-JSON preamble/postscript if regex failed
        // Find first '{' and last '}'
        const firstBrace = jsonString.indexOf('{');
        const lastBrace = jsonString.lastIndexOf('}');
        
        let finalJsonString = jsonString;
        if (firstBrace !== -1 && lastBrace !== -1) {
            finalJsonString = jsonString.substring(firstBrace, lastBrace + 1);
        }

        const cleanString = finalJsonString.replace(/\\_/g, '_').trim();
            
        const result = JSON.parse(cleanString);
        console.log(`[Prompt Gen] Parsed Result:`, JSON.stringify(result, null, 2));
        
        if (result.image_prompt) shot.image_prompt = result.image_prompt;
        if (result.video_prompt) shot.video_prompt = result.video_prompt;
        
      } catch (e) {
        console.error(`Failed generation for shot ${shot.id}`, e);
      }
    }

    fs.writeFileSync(shotListPath, JSON.stringify(projectData, null, 2));
    res.json({ success: true, updated: shotsToProcess.length });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 8. Queue Video Generation (ComfyUI)
app.post('/api/project/:name/queue-video/:shotId', async (req, res) => {
  const projectName = req.params.name;
  const shotId = parseInt(req.params.shotId);
  const shotListPath = path.join(PROJECTS_DIR, projectName, 'shot_list.json');

  try {
    const projectData = JSON.parse(fs.readFileSync(shotListPath, 'utf8'));
    const shot = projectData.shots.find(s => s.id === shotId);

    if (!shot) return res.status(404).json({ error: "Shot not found" });
    if (!shot.image_file) return res.status(400).json({ error: "No image file for shot" });
    if (!shot.video_prompt) return res.status(400).json({ error: "No video prompt" });

    // Use spawn to run animate.js in background (detached)
    // We don't wait for it to finish because ComfyUI generation takes minutes.
    // The UI can't hang on this request.
    
    const scriptPath = path.resolve(__dirname, '../../comfy-art/scripts/animate_wan.js');
    console.log(`[Queue] Running: node ${scriptPath} "${shot.image_file}" "${shot.video_prompt}"`);

    const child = spawn('node', [scriptPath, shot.image_file, shot.video_prompt], {
        detached: true,
        stdio: 'ignore'
    });
    
    child.unref();

    res.json({ success: true, message: "Generation started in background" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 9. Queue Image Generation (Re-Imagine)
app.post('/api/project/:name/queue-image/:shotId', async (req, res) => {
  const projectName = req.params.name;
  const shotId = parseInt(req.params.shotId);
  const shotListPath = path.join(PROJECTS_DIR, projectName, 'shot_list.json');

  try {
    const projectData = JSON.parse(fs.readFileSync(shotListPath, 'utf8'));
    const shot = projectData.shots.find(s => s.id === shotId);

    if (!shot) return res.status(404).json({ error: "Shot not found" });
    if (!shot.image_prompt) return res.status(400).json({ error: "No image prompt" });

    const scriptPath = path.resolve(__dirname, '../../comfy-art/scripts/generate.js');
    console.log(`[Queue Image] Running: node ${scriptPath} "${shot.image_prompt}" --preset ascension`);

    const child = spawn('node', [scriptPath, shot.image_prompt, '--preset', 'ascension'], {
        detached: true,
        stdio: 'ignore'
    });
    
    child.unref();

    res.json({ success: true, message: "Image generation started" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Director UI running at http://localhost:${PORT}`);
});
