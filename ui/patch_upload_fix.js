const fs = require('fs');
const path = require('path');
const htmlFile = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(htmlFile, 'utf8');

const inputStr = `<input type="file" x-ref="bulkUploadRef" class="hidden" multiple accept="image/*,video/*" @change="bulkUpload($event)">`;
if (html.includes(inputStr)) {
  html = html.replace(inputStr, '');
  html = html.replace('<!-- Bottom spacer -->', `<!-- Bottom spacer -->\n              ${inputStr}`);
  console.log("HTML bulk upload input moved out of details/summary block.");
}

const newUploadImage = `async uploadImage(shotId, event) {
          const file = event.target.files[0];
          if (!file) return;
          const formData = new FormData();
          formData.append('image', file);
          event.target.value = '';`;
html = html.replace(/async uploadImage\(shotId, event\) \{\n\s*const file = event\.target\.files\[0\];\n\s*if \(!file\) return;\n\s*const formData = new FormData\(\);\n\s*formData\.append\('image', file\);/s, newUploadImage);

const newBulkUpload = `async bulkUpload(event) {
          const files = event.target.files;
          if (!files.length) return;
          const formData = new FormData();
          for (const f of files) formData.append('images', f);
          event.target.value = '';`;
html = html.replace(/async bulkUpload\(event\) \{\n\s*const files = event\.target\.files;\n\s*if \(!files\.length\) return;\n\s*const formData = new FormData\(\);\n\s*for \(const f of files\) formData\.append\('images', f\);/s, newBulkUpload);

fs.writeFileSync(htmlFile, html);
console.log("HTML upload patch applied.");