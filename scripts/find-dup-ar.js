const fs = require('fs');
const path = require('path');

function main() {
  const filePath = path.join(__dirname, '..', 'utils', 'i18n.ts');
  const s = fs.readFileSync(filePath, 'utf8');

  const marker = '\n  ar: {';
  const start = s.indexOf(marker);
  if (start < 0) {
    throw new Error('Arabic (ar) block not found');
  }

  let i = s.indexOf('{', start);
  let depth = 0;
  let j = i;
  for (; j < s.length; j++) {
    const c = s[j];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        j++;
        break;
      }
    }
  }

  const block = s.slice(i + 1, j - 1);
  const re = /\n\s*(?:'([^']+)'|"([^"]+)")\s*:/g;
  const counts = new Map();

  let m;
  while ((m = re.exec(block))) {
    const k = m[1] ?? m[2];
    counts.set(k, (counts.get(k) || 0) + 1);
  }

  const dups = [...counts.entries()]
    .filter(([, c]) => c > 1)
    .sort((a, b) => b[1] - a[1]);

  console.log(`duplicates ${dups.length}`);
  for (const [k, c] of dups) {
    console.log(`${c}\t${k}`);
  }
}

main();
