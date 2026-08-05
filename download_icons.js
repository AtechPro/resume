const fs = require('fs');
const path = require('path');
const https = require('https');

const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
const re = /win98icons\.alexmeub\.com\/icons\/png\/([a-zA-Z0-9_\-]+\.png)/g;
const icons = new Set();
let m;
while ((m = re.exec(html)) !== null) {
  icons.add(m[1]);
}

const sorted = [...icons].sort();
console.log(`Found ${sorted.length} unique icons:`);
sorted.forEach(i => console.log(`  ${i}`));

// Create icons directory
const iconsDir = path.join(__dirname, 'public', 'images', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Download each icon
function download(filename) {
  return new Promise((resolve, reject) => {
    const url = `https://win98icons.alexmeub.com/icons/png/${filename}`;
    const dest = path.join(iconsDir, filename);
    if (fs.existsSync(dest)) {
      console.log(`  SKIP (exists): ${filename}`);
      return resolve();
    }
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        console.log(`  FAIL (${response.statusCode}): ${filename}`);
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`  OK: ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function main() {
  console.log('\nDownloading icons...');
  for (const icon of sorted) {
    try {
      await download(icon);
    } catch (e) {
      console.error(`  ERROR: ${icon} - ${e.message}`);
    }
  }
  console.log('\nDone!');
}

main();
