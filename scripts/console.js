const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const uiDir = path.resolve(__dirname, '../ui');
const serverPath = path.join(uiDir, 'server.js');

console.log('🎬 Starting Director Console...');
console.log(`📂 UI Directory: ${uiDir}`);

const server = spawn('node', [serverPath], {
  cwd: uiDir,
  stdio: 'inherit',
  shell: true
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
});

// Open browser after a short delay
setTimeout(() => {
  const url = 'http://localhost:3000';
  const start = (process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open');
  spawn(start, [url], { shell: true });
}, 2000);
