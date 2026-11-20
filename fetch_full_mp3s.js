import fs from 'fs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchFullMp3s() {
  const code = fs.readFileSync('src/data/indianMusicData.js', 'utf8');
  const regex = /{\s*id:\s*"([^"]+)",\s*title:\s*"([^"]+)",\s*artist:\s*"([^"]+)"/g;
  let match;
  const tracks = [];
  while ((match = regex.exec(code)) !== null) {
    tracks.push({ id: match[1], title: match[2], artist: match[3] });
  }

  console.log('Total tracks to fetch FULL MP3 from Internet Archive:', tracks.length);

  const fullMap = {};

  for (let i = 0; i < tracks.length; i++) {
    const { id, title, artist } = tracks[i];
    const cleanTitle = title.replace(/\([^)]*\)/g, '').trim();
    const query = `${cleanTitle} ${artist.split(',')[0]} mediatype:audio`;

    try {
      await delay(200);
      const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=identifier,title&sort[]=downloads+desc&rows=3&page=1&output=json`;
      const res = await fetch(url);
      const data = await res.json();
      const docs = data.response?.docs || [];

      let foundMp3 = null;
      if (docs.length > 0) {
        for (const doc of docs) {
          const itemId = doc.identifier;
          const filesRes = await fetch(`https://archive.org/metadata/${itemId}/files`);
          const filesData = await filesRes.json();
          const mp3File = filesData.result?.find(f => f.name && f.name.endsWith('.mp3') && parseInt(f.size || 0) > 1500000); // Only full songs (> 1.5MB)
          if (mp3File) {
            foundMp3 = `https://archive.org/download/${itemId}/${encodeURIComponent(mp3File.name)}`;
            break;
          }
        }
      }

      if (foundMp3) {
        fullMap[id] = foundMp3;
        console.log(`[${i+1}/${tracks.length}] FULL MP3 FOUND: ${title} -> ${foundMp3.slice(0, 60)}...`);
      } else {
        console.log(`[${i+1}/${tracks.length}] NO ARCHIVE MP3: ${title}`);
      }
    } catch (e) {
      console.log(`[${i+1}/${tracks.length}] ERROR: ${title}`, e.message);
    }
  }

  fs.writeFileSync('src/data/fullMp3sMap.json', JSON.stringify(fullMap, null, 2));
  console.log('Successfully saved', Object.keys(fullMap).length, 'FULL LENGTH MP3 URLs!');
}

fetchFullMp3s();
