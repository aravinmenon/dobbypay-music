import fs from 'fs';

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchAllVlinks() {
  const code = fs.readFileSync('src/data/indianMusicData.js', 'utf8');
  
  const regex = /{\s*id:\s*"([^"]+)",\s*title:\s*"([^"]+)",\s*artist:\s*"([^"]+)"/g;
  let match;
  const tracks = [];
  while ((match = regex.exec(code)) !== null) {
    tracks.push({ id: match[1], title: match[2], artist: match[3] });
  }

  console.log('Total tracks to fetch vlink:', tracks.length);

  const vlinkMap = {};
  for (let i = 0; i < tracks.length; i++) {
    const { id, title, artist } = tracks[i];
    const cleanTitle = title.replace(/\([^)]*\)/g, '').trim();
    const query = `${cleanTitle} ${artist.split(',')[0]}`;
    try {
      await delay(150);
      const res = await fetch(`https://jiosaavn-api-bice.vercel.app/search?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.results && data.results[0] && data.results[0].more_info?.vlink) {
        vlinkMap[id] = data.results[0].more_info.vlink;
        console.log(`[${i+1}/${tracks.length}] VLINK FOUND: ${title} -> ${data.results[0].more_info.vlink}`);
      } else {
        await delay(150);
        const res2 = await fetch(`https://jiosaavn-api-bice.vercel.app/search?query=${encodeURIComponent(cleanTitle)}`);
        const data2 = await res2.json();
        if (data2.results && data2.results[0] && data2.results[0].more_info?.vlink) {
          vlinkMap[id] = data2.results[0].more_info.vlink;
          console.log(`[${i+1}/${tracks.length}] RETRY VLINK FOUND: ${title}`);
        } else {
          console.log(`[${i+1}/${tracks.length}] NO VLINK: ${title}`);
        }
      }
    } catch (e) {
      console.log(`[${i+1}/${tracks.length}] ERROR: ${title}`, e.message);
    }
  }

  fs.writeFileSync('src/data/vlinksMap.json', JSON.stringify(vlinkMap, null, 2));
  console.log('Saved', Object.keys(vlinkMap).length, 'permanent Jio MP3 URLs!');
}

fetchAllVlinks();
