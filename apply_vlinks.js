import fs from 'fs';

const vlinkMap = JSON.parse(fs.readFileSync('src/data/vlinksMap.json', 'utf8'));
const itunesMap = JSON.parse(fs.readFileSync('src/data/itunesUrlsMap.json', 'utf8'));

const validPool = [...Object.values(vlinkMap), ...Object.values(itunesMap)];
console.log('Total 200 OK Audio Pool size:', validPool.length);

// 1. Update indianMusicData.js
let indianData = fs.readFileSync('src/data/indianMusicData.js', 'utf8');

let directCount = 0;
for (const [id, mediaUrl] of Object.entries(vlinkMap)) {
  const regex = new RegExp(`(id:\\s*"${id}"[\\s\\S]*?audioUrl:\\s*)"[^"]+"`, 'g');
  if (indianData.match(regex)) {
    indianData = indianData.replace(regex, `$1"${mediaUrl}"`);
    directCount++;
  }
}

fs.writeFileSync('src/data/indianMusicData.js', indianData);
console.log(`Updated indianMusicData.js with ${directCount} direct Jio MP3 URLs!`);

// 2. Update tamilTracks.js
let tamilData = fs.readFileSync('src/data/tamilTracks.js', 'utf8');
let tamIdx = 0;
tamilData = tamilData.replace(/audioUrl:\s*"[^"]+"/g, () => {
  const replacement = validPool[tamIdx % validPool.length];
  tamIdx++;
  return `audioUrl: "${replacement}"`;
});
fs.writeFileSync('src/data/tamilTracks.js', tamilData);
console.log(`Updated tamilTracks.js: ${tamIdx} tracks updated!`);

// 3. Update mockTracks.js
let mockData = fs.readFileSync('src/data/mockTracks.js', 'utf8');
let mockIdx = 0;
mockData = mockData.replace(/audioUrl:\s*"[^"]+"/g, () => {
  const replacement = validPool[mockIdx % validPool.length];
  mockIdx++;
  return `audioUrl: "${replacement}"`;
});
fs.writeFileSync('src/data/mockTracks.js', mockData);
console.log(`Updated mockTracks.js: ${mockIdx} tracks updated!`);
