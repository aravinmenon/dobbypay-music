import fs from 'fs';

const urlMap = JSON.parse(fs.readFileSync('src/data/curatedUrlsMap.json', 'utf8'));

// 1. Update indianMusicData.js
let indianData = fs.readFileSync('src/data/indianMusicData.js', 'utf8');

// Replace soundhelix function getAudio(idx) with real url lookup or fallback
for (const [id, mediaUrl] of Object.entries(urlMap)) {
  // Find track block by id
  const regex = new RegExp(`(id:\\s*"${id}"[\\s\\S]*?audioUrl:\\s*)(getAudio\\([^)]+\\)|"[^"]+")`, 'g');
  indianData = indianData.replace(regex, `$1"${mediaUrl}"`);
}

fs.writeFileSync('src/data/indianMusicData.js', indianData);
console.log('Updated indianMusicData.js with real vocal song URLs!');

// 2. Update tamilTracks.js
let tamilData = fs.readFileSync('src/data/tamilTracks.js', 'utf8');
let tamCount = 0;
for (const [id, mediaUrl] of Object.entries(urlMap)) {
  if (tamilData.includes(mediaUrl)) continue;
  // match title in tamilTracks
  const titleRegex = /title:\s*"([^"]+)"/g;
}
// Replace any remaining SoundHelix in tamilTracks with real song stream URLs
tamilData = tamilData.replace(/https:\/\/www\.soundhelix\.com\/examples\/mp3\/SoundHelix-Song-\d+\.mp3/g, (match, offset) => {
  tamCount++;
  // Provide real vocal song fallback stream URLs
  const realVocalStreams = [
    "https://aac.saavncdn.com/415/BXZWebHzlkW7fkrTfcoVjhNSpFT6FMEYYp_160.mp4",
    "https://aac.saavncdn.com/702/8DBsAcx2kDUH90US2ud61IajFmK5hmb1gwvYAPKL_160.mp4",
    "https://aac.saavncdn.com/595/DOEaN71GOfNVjQVYNLsIvoYEqyBNJtVpx_160.mp4",
    "https://aac.saavncdn.com/137/QeIBDBioUtHiqf2g7vbXpWiUeDZdfPfSL0XO4_160.mp4",
    "https://aac.saavncdn.com/932/egoySvnnExBSDD0l25XCHZlZEfYG4GW9UB_160.mp4",
    "https://aac.saavncdn.com/733/uGnpFwXrvCR3SWDCz79vARZ3feKpV3hOjsZfit3xo_160.mp4",
    "https://aac.saavncdn.com/510/J4n2TiHOuE9i0vmYRq6YQFPw886zEMnU0lYbqIr2Kzwwn_160.mp4",
    "https://aac.saavncdn.com/940/0pzlVw2dMvZvlmh8BIz2dI8rYIzMyUGcGehorU_160.mp4",
    "https://aac.saavncdn.com/347/HJjKblInwZceWv61l6eRgbJAzaYJeG9bf27ZpFN5RVGTwS_160.mp4",
    "https://aac.saavncdn.com/187/Y6GR4lnxwcoKeqrM4uaGu5VyXdcpqitA5ztwuqP_160.mp4"
  ];
  return realVocalStreams[tamCount % realVocalStreams.length];
});

fs.writeFileSync('src/data/tamilTracks.js', tamilData);
console.log('Updated tamilTracks.js with real vocal song URLs!');

// 3. Update mockTracks.js
let mockData = fs.readFileSync('src/data/mockTracks.js', 'utf8');
let mockCount = 0;
mockData = mockData.replace(/https:\/\/www\.soundhelix\.com\/examples\/mp3\/SoundHelix-Song-\d+\.mp3/g, () => {
  mockCount++;
  const realVocalStreams = [
    "https://aac.saavncdn.com/415/BXZWebHzlkW7fkrTfcoVjhNSpFT6FMEYYp_160.mp4",
    "https://aac.saavncdn.com/702/8DBsAcx2kDUH90US2ud61IajFmK5hmb1gwvYAPKL_160.mp4",
    "https://aac.saavncdn.com/595/DOEaN71GOfNVjQVYNLsIvoYEqyBNJtVpx_160.mp4",
    "https://aac.saavncdn.com/137/QeIBDBioUtHiqf2g7vbXpWiUeDZdfPfSL0XO4_160.mp4",
    "https://aac.saavncdn.com/932/egoySvnnExBSDD0l25XCHZlZEfYG4GW9UB_160.mp4"
  ];
  return realVocalStreams[mockCount % realVocalStreams.length];
});

fs.writeFileSync('src/data/mockTracks.js', mockData);
console.log('Updated mockTracks.js!');
