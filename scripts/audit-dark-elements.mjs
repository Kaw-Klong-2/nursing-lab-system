import fs from 'fs';
import path from 'path';

function getFiles(dir, exts = ['.tsx', '.jsx']) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      files = files.concat(getFiles(fullPath, exts));
    } else if (exts.includes(path.extname(file))) {
      files.push(fullPath);
    }
  });
  return files;
}

const allFiles = getFiles('src');

// Regex patterns to identify dark backgrounds in light mode:
// e.g. bg-slate-900, bg-slate-950, bg-black, from-slate-900, to-slate-900, bg-gray-900, etc.
// NOT preceded by dark:
const results = {};

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

    // Look for className containing dark tokens
    // We want to detect things that render dark in Light Mode:
    // e.g., bg-slate-900 without dark:bg-slate-900
    // or from-slate-900, to-slate-900, bg-black, bg-slate-950
    const classMatches = line.match(/(?:className|class)\s*=\s*["'`]([^"'`]+)["'`]/g);
    if (!classMatches) return;

    classMatches.forEach(classAttr => {
      const classStr = classAttr.replace(/^(?:className|class)\s*=\s*["'`]/, '').replace(/["'`]$/, '');
      const classes = classStr.split(/\s+/);

      classes.forEach(cls => {
        // If it starts with dark: or hover: or focus:, skip or handle
        if (cls.startsWith('dark:')) return;

        // Check if class is a dark background or dark gradient stop
        const isDarkBg = /^(bg-(?:slate|zinc|gray|neutral)-(?:900|950)|bg-black)$/.test(cls);
        const isDarkGradient = /^(?:from|via|to)-(?:slate|zinc|gray|neutral)-(?:900|950|850)$/.test(cls);
        const isVeryDarkTealOrIndigo = /^(bg-(?:teal|indigo|cyan|blue)-(?:900|950))$/.test(cls);
        const isVeryDarkGradient = /^(?:from|via|to)-(?:teal|indigo|cyan|blue)-(?:900|950)$/.test(cls);

        if (isDarkBg || isDarkGradient || isVeryDarkTealOrIndigo || isVeryDarkGradient) {
          if (!results[file]) results[file] = [];
          results[file].push({
            lineNum: idx + 1,
            cls,
            lineSnippet: trimmed
          });
        }
      });
    });
  });
});

console.log(JSON.stringify(results, null, 2));
