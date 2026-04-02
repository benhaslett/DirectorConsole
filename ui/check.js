const f = require('fs').readFileSync('C:/Users/benha/.openclaw/openclaw.json', 'utf8');
console.log(f.match(/"token"\s*:\s*"([a-f0-9]{48})"/));