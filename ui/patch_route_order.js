const fs = require('fs');
const path = require('path');
const serverFile = path.join(__dirname, 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

const lines = code.split('\n');
lines.forEach((l, i) => {
  if (l.match(/^app\.(get|post)/)) console.log(`line ${i}: ${l}`);
});