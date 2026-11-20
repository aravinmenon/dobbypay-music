const fs = require('fs');
const path = require('path');

const SAAVN_API_BASE = 'https://jiosaavn-api-v3.vercel.app';

function cleanStr(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function findVlinkForTrack(title, artist) {
  const targetTitle = cleanStr(title);
  const q = title + ' ' + (artist || '');
  try {
    const res = await fetch(SAAVN_API_BASE + '/search?query=' + encodeURIComponent(q));
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const match = data.results.find(item => {
          const s = cleanStr(item.title);
          return s.includes(targetTitle) || targetTitle.includes(s);
        }) || data.results[0];

        if (match && match.more_info?.vlink) {
          return match.more_info.vlink;
        }
      }
    }
  } catch (e) {}

  try {
    const res = await fetch('https://itunes.apple.com/search?term=' + encodeURIComponent(q) + '&media=music&entity=song&limit=5');
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const match = data.results.find(item => {
          const s = cleanStr(item.trackName);
          return s.includes(targetTitle) || targetTitle.includes(s);
        }) || data.results[0];

        if (match && match.previewUrl) {
          return match.previewUrl;
        }
      }
    }
  } catch (e) {}

  return null;
}

async function fixFile(filePath) {
  console.log('Processing file:', filePath);
  let content = fs.readFileSync(filePath, 'utf8');

  // Regex to match audioUrl lines in objects
  const audioUrlRegex = /audioUrl:\s*["'](https?:\/\/[^"']+)["']/g;
  
  // Replace all archive.org or inaccurate URLs
  const lines = content.split('\n');
  let currentTitle = '';
  let currentArtist = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('title:')) {
      const tm = line.match(/title:\s*["']([^"']+)["']/);
      if (tm) currentTitle = tm[1];
    }
    if (line.includes('artist:')) {
      const am = line.match(/artist:\s*["']([^"']+)["']/);
      if (am) currentArtist = am[1];
    }

    if (line.includes('audioUrl:') && currentTitle) {
      const urlMatch = line.match(/audioUrl:\s*["']([^"']+)["']/);
      if (urlMatch) {
        const oldUrl = urlMatch[1];
        const newUrl = await findVlinkForTrack(currentTitle, currentArtist);
        if (newUrl) {
          console.log(`✓ Fixed [${currentTitle}] -> ${newUrl}`);
          lines[i] = line.replace(oldUrl, newUrl);
        } else {
          console.log(`- Retained [${currentTitle}]`);
        }
      }
    }
  }

  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log(`Done updating ${path.basename(filePath)}\n`);
}

async function run() {
  await fixFile(path.join(__dirname, '../src/data/indianMusicData.js'));
  await fixFile(path.join(__dirname, '../src/data/tamilTracks.js'));
}

run();
