import fs from 'fs';

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function mapItunesUrls() {
  const code = fs.readFileSync('src/data/indianMusicData.js', 'utf8');
  
  const regex = /{\s*id:\s*"([^"]+)",\s*title:\s*"([^"]+)",\s*artist:\s*"([^"]+)"/g;
  let match;
  const tracks = [];
  while ((match = regex.exec(code)) !== null) {
    tracks.push({ id: match[1], title: match[2], artist: match[3] });
  }

  console.log('Total tracks to fetch from iTunes:', tracks.length);

  let existingMap = {};
  try {
    existingMap = JSON.parse(fs.readFileSync('src/data/itunesUrlsMap.json', 'utf8'));
  } catch {}

  const itunesMap = { ...existingMap };

  for (let i = 0; i < tracks.length; i++) {
    const { id, title, artist } = tracks[i];
    if (itunesMap[id]) {
      console.log(`[${i+1}/${tracks.length}] ALREADY HAVE: ${title}`);
      continue;
    }

    const cleanTitle = title.replace(/\([^)]*\)/g, '').trim();
    const query = `${cleanTitle} ${artist.split(',')[0]}`;
    try {
      await delay(300); // Respect iTunes API rate limit
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=1`);
      const data = await res.json();
      if (data.results && data.results[0] && data.results[0].previewUrl) {
        itunesMap[id] = data.results[0].previewUrl;
        console.log(`[${i+1}/${tracks.length}] SUCCESS: ${title}`);
      } else {
        await delay(300);
        const res2 = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanTitle)}&media=music&entity=song&limit=1`);
        const data2 = await res2.json();
        if (data2.results && data2.results[0] && data2.results[0].previewUrl) {
          itunesMap[id] = data2.results[0].previewUrl;
          console.log(`[${i+1}/${tracks.length}] RETRY SUCCESS: ${title}`);
        } else {
          console.log(`[${i+1}/${tracks.length}] NOT FOUND: ${title}`);
        }
      }
    } catch (e) {
      console.log(`[${i+1}/${tracks.length}] ERROR: ${title}`, e.message);
    }
  }

  fs.writeFileSync('src/data/itunesUrlsMap.json', JSON.stringify(itunesMap, null, 2));
  console.log('Saved total', Object.keys(itunesMap).length, 'permanent iTunes URLs!');
}

mapItunesUrls();
