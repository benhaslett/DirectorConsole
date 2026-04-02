const fs = require('fs');
const path = require('path');
const htmlFile = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(htmlFile, 'utf8');

const refCall = `bulkUploadRef.click()`;
const newRefCall = `$refs.bulkUploadRef.click()`;

if (html.includes(refCall)) {
    html = html.replace(refCall, newRefCall);
    fs.writeFileSync(htmlFile, html);
    console.log('Fixed x-ref call for bulkUploadRef');
} else {
    console.log('No x-ref fix needed');
}

const singleUploadRef = `uploadRef.click()`;
const singleNewRefCall = `$refs.uploadRef.click()`;
if (html.includes(singleUploadRef)) {
    html = html.replace(singleUploadRef, singleNewRefCall);
    fs.writeFileSync(htmlFile, html);
    console.log('Fixed x-ref call for single uploadRef');
}

// Look for a single upload ref usage dynamically
html = html.replace(/@click="\$refs\.([a-zA-Z0-9]+)\.click\(\)"/g, (m, ref) => {
    return m;
});
fs.writeFileSync(htmlFile, html);