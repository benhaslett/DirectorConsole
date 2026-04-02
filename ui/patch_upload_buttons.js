const fs = require('fs');
const path = require('path');
const htmlFile = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(htmlFile, 'utf8');

console.log("Looking for single image upload click handler...");
const regexClickFile = /@click="\$el\.querySelector\('input\\[type=file\\]'\)\.click\(\)"/g;
console.log("Matched?", html.match(/@click="\$el\.querySelector\('input\[type=file\]'\)\.click\(\)"/g));

console.log("Looking for bulk upload button...");
console.log("Matched bulk?", html.match(/@click="\$refs\.bulkUploadRef\.click\(\)"/g));

console.log("Looking for bulk input...");
console.log("Matched input?", html.match(/<input type="file" x-ref="bulkUploadRef"/g));