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

  // Match all object blocks with title and audioUrl
  const trackRegex = /\{\s*id:\s*"([^"]+)",\s*title:\s*"([^"]+)",\s*artist:\s*"([^"]+)"[\s\S]*?audioUrl:\s*"([^"]+)"/g;

  let match;
  const updates = [];

  while ((match = trackRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const id = match[1];
    const title = match[2];
    const artist = match[3];
    const oldUrl = match[4];

    updates.push({ fullMatch, id, title, artist, oldUrl });
  }

  console.log(`Found ${updates.length} tracks in ${path.basename(filePath)}`);

  for (const item of updates) {
    const newUrl = await findVlinkForTrack(item.title, item.artist);
    if (newUrl) {
      console.log(`✓ Fixed [${item.title}] -> ${newUrl}`);
      content = content.replace(item.oldUrl, newUrl);
    } else {
      console.log(`✗ No stream found for [${item.title}]`);
    }
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Done updating ${path.basename(filePath)}\n`);
}

async function run() {
  await fixFile(path.join(__dirname, '../src/data/indianMusicData.js'));
  await fixFile(path.join(__dirname, '../src/data/tamilTracks.js'));
}

run();
