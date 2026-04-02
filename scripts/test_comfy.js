const http = require('http');

const COMFY_HOST = '127.0.0.1';
const COMFY_PORT = 8000;

console.log(`[Test] Checking ComfyUI connection at http://${COMFY_HOST}:${COMFY_PORT}...`);

const req = http.get(`http://${COMFY_HOST}:${COMFY_PORT}/system_stats`, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log(`[Test] SUCCESS: Connected to ComfyUI. Status: 200 OK.`);
      console.log(`[Test] ComfyUI is up and running. Integration is ready.`);
    } else {
      console.error(`[Test] FAILED: Received status code ${res.statusCode}`);
      console.error(`[Test] Response: ${data}`);
    }
  });
});

req.on('error', (err) => {
  console.error(`[Test] ERROR: Could not connect to ComfyUI.`);
  console.error(`[Test] Make sure ComfyUI is running on port ${COMFY_PORT}.`);
  console.error(`[Test] Details: ${err.message}`);
});
