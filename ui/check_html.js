const fs = require('fs');
const html = fs.readFileSync('skills/director/ui/public/index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);

if (scriptMatch) {
  const content = scriptMatch[1];
  try {
    new Function(content);
    console.log("Script parses successfully.");
  } catch(e) {
    console.log("Script Error:", e.message);
  }
}