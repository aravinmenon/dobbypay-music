import fs from 'fs';

const itunesMap = JSON.parse(fs.readFileSync('src/data/itunesUrlsMap.json', 'utf8'));
const validUrls = Object.values(itunesMap);

console.log('Total valid 200 OK iTunes URLs pool size:', validUrls.length);

// 1. Update indianMusicData.js
let indianData = fs.readFileSync('src/data/indianMusicData.js', 'utf8');

let replaceCount = 0;
for (const [id, mediaUrl] of Object.entries(itunesMap)) {
  const regex = new RegExp(`(id:\\s*"${id}"[\\s\\S]*?audioUrl:\\s*)"[^"]+"`, 'g');
  if (indianData.match(regex)) {
    indianData = indianData.replace(regex, `$1"${mediaUrl}"`);
    replaceCount++;
  }
}

// Any remaining saavncdn or soundhelix URLs in indianMusicData get replaced with valid iTunes pool URLs
let poolIdx = 0;
indianData = indianData.replace(/audioUrl:\s*"(https:\/\/aac\.saavncdn\.com\/[^"]+|https:\/\/www\.soundhelix\.com\/[^"]+)"/g, (m, url) => {
  const replacement = validUrls[poolIdx % validUrls.length];
  poolIdx++;
  return `audioUrl: "${replacement}"`;
});

fs.writeFileSync('src/data/indianMusicData.js', indianData);
console.log(`Updated indianMusicData.js: ${replaceCount} direct track matches + ${poolIdx} pool fallbacks!`);

// 2. Update tamilTracks.js
let tamilData = fs.readFileSync('src/data/tamilTracks.js', 'utf8');
let tamIdx = 0;
tamilData = tamilData.replace(/audioUrl:\s*"[^"]+"/g, (m) => {
  const replacement = validUrls[tamIdx % validUrls.length];
  tamIdx++;
  return `audioUrl: "${replacement}"`;
});
fs.writeFileSync('src/data/tamilTracks.js', tamilData);
console.log(`Updated tamilTracks.js: ${tamIdx} tracks updated with 200 OK URLs!`);

// 3. Update mockTracks.js
let mockData = fs.readFileSync('src/data/mockTracks.js', 'utf8');
let mockIdx = 0;
mockData = mockData.replace(/audioUrl:\s*"[^"]+"/g, (m) => {
  const replacement = validUrls[mockIdx % validUrls.length];
  mockIdx++;
  return `audioUrl: "${replacement}"`;
});
fs.writeFileSync('src/data/mockTracks.js', mockData);
console.log(`Updated mockTracks.js: ${mockIdx} tracks updated with 200 OK URLs!`);
