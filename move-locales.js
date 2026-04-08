const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, 'src', 'app');
const localeDir = path.join(appDir, '[locale]');

// Create [locale] directory
if (!fs.existsSync(localeDir)) {
  fs.mkdirSync(localeDir);
}

const itemsToMove = [
  'dashboard',
  'login',
  'register',
  'internships',
  'page.js',
  'layout.js'
];

itemsToMove.forEach(item => {
  const oldPath = path.join(appDir, item);
  const newPath = path.join(localeDir, item);
  
  if (fs.existsSync(oldPath)) {
    try {
      // Recursive copy
      fs.cpSync(oldPath, newPath, { recursive: true });
      // Delete old
      fs.rmSync(oldPath, { recursive: true, force: true });
      console.log(`Moved ${item} to [locale] successfully using cp/rm`);
    } catch (e) {
      console.error(`Failed to move ${item}. Error: ${e.message}`);
    }
  } else {
    console.log(`${item} does not exist`);
  }
});
