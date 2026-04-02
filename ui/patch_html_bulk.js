const fs = require('fs');
const path = require('path');
const htmlFile = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(htmlFile, 'utf8');

const regex = /<input type="file" x-ref="bulkUploadRef" class="hidden" multiple accept="image\/\*" @change="bulkUpload\(\$event\)">/s;
const newCode = `<input type="file" x-ref="bulkUploadRef" class="hidden" multiple accept="image/*,video/*" @change="bulkUpload($event)">`;

if (html.includes('accept="image/*" @change="bulkUpload($event)"')) {
  let finalCode = html.replace(regex, newCode);
  fs.writeFileSync(htmlFile, finalCode);
  console.log("HTML bulk patch applied.");
} else {
  console.log("HTML bulk patch failed to find replace target.");
}