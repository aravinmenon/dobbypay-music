import fs from 'fs';

async function processAllTracks() {
  const code = fs.readFileSync('src/data/indianMusicData.js', 'utf8');
  
  // Extract all tracks with id, title, and artist
  const regex = /{\s*id:\s*"([^"]+)",\s*title:\s*"([^"]+)",\s*artist:\s*"([^"]+)"/g;
  let match;
  const tracks = [];
  while ((match = regex.exec(code)) !== null) {
    tracks.push({ id: match[1], title: match[2], artist: match[3] });
  }
  
  console.log('Total tracks found in indianMusicData:', tracks.length);

  const urlMap = {};
  for (let i = 0; i < tracks.length; i++) {
    const { id, title, artist } = tracks[i];
    try {
      const searchRes = await fetch('https://jiosaavn-api-v3.vercel.app/search?query=' + encodeURIComponent(title + ' ' + artist.split(',')[0]));
      const searchData = await searchRes.json();
      if (searchData.results && searchData.results[0]) {
        const songRes = await fetch('https://jiosaavn-api-v3.vercel.app/song?id=' + searchData.results[0].id);
        const songData = await songRes.json();
        const media = songData.media_url || songData.media_urls?.['160_KBPS'] || songData.media_urls?.['320_KBPS'];
        if (media) {
          urlMap[id] = media;
        }
      }
    } catch (e) {
      console.log('Error fetching for', title, e.message);
    }
  }

  fs.writeFileSync('src/data/curatedUrlsMap.json', JSON.stringify(urlMap, null, 2));
  console.log('Successfully saved', Object.keys(urlMap).length, 'media URLs to curatedUrlsMap.json');
}

processAllTracks();
