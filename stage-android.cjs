const { cpSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');

const webDir = join(__dirname, 'www');
mkdirSync(join(webDir, 'firebase'), { recursive: true });
for (const entry of ['index.html', 'app.js', 'style.css', 'images', 'firebase/config.js', 'firebase/auth.js', 'firebase/store.js']) {
  cpSync(join(__dirname, entry), join(webDir, entry), { recursive: true });
}
