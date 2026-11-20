import mysql from 'mysql2/promise';

async function seedExactAudio() {
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3310,
    user: 'root',
    password: '',
    database: 'dobbyppay'
  });

  console.log('Connected to MySQL db dobbyppay');

  // Clean table
  await db.query('TRUNCATE TABLE songs');
  console.log('Cleaned songs table.');

  const directors = [
    { name: 'Sean Roldan', lang: 'Tamil', query: 'Sean Roldan' },
    { name: 'Anirudh Ravichander', lang: 'Tamil', query: 'Anirudh Ravichander' },
    { name: 'A.R. Rahman', lang: 'Tamil', query: 'A.R. Rahman Tamil' },
    { name: 'Harris Jayaraj', lang: 'Tamil', query: 'Harris Jayaraj' },
    { name: 'Yuvan Shankar Raja', lang: 'Tamil', query: 'Yuvan Shankar Raja' },
    { name: 'Ilaiyaraaja', lang: 'Tamil', query: 'Ilaiyaraaja' },
    { name: 'G. V. Prakash Kumar', lang: 'Tamil', query: 'G.V. Prakash Kumar' },
    { name: 'Santhosh Narayanan', lang: 'Tamil', query: 'Santhosh Narayanan' },
    { name: 'Hiphop Tamizha', lang: 'Tamil', query: 'Hiphop Tamizha' },
    { name: 'D. Imman', lang: 'Tamil', query: 'D. Imman' },
    { name: 'Deva', lang: 'Tamil', query: 'Deva Tamil' },
    { name: 'Vidyasagar', lang: 'Tamil', query: 'Vidyasagar Tamil' },

    // Telugu
    { name: 'Devi Sri Prasad', lang: 'Telugu', query: 'Devi Sri Prasad' },
    { name: 'Thaman S', lang: 'Telugu', query: 'Thaman S' },
    { name: 'M. M. Keeravani', lang: 'Telugu', query: 'M.M. Keeravani' },
    { name: 'Mickey J. Meyer', lang: 'Telugu', query: 'Mickey J Meyer' },

    // Malayalam
    { name: 'Sushin Shyam', lang: 'Malayalam', query: 'Sushin Shyam' },
    { name: 'Hesham Abdul Wahab', lang: 'Malayalam', query: 'Hesham Abdul Wahab' },
    { name: 'Gopi Sundar', lang: 'Malayalam', query: 'Gopi Sundar' },
    { name: 'Shaan Rahman', lang: 'Malayalam', query: 'Shaan Rahman' },

    // Kannada
    { name: 'Ravi Basrur', lang: 'Kannada', query: 'Ravi Basrur' },
    { name: 'Ajaneesh Loknath', lang: 'Kannada', query: 'Ajaneesh Loknath' },
    { name: 'Arjun Janya', lang: 'Kannada', query: 'Arjun Janya' },

    // Hindi
    { name: 'Pritam', lang: 'Hindi', query: 'Pritam Hindi' },
    { name: 'Arijit Singh', lang: 'Hindi', query: 'Arijit Singh' },
    { name: 'Vishal-Shekhar', lang: 'Hindi', query: 'Vishal Shekhar' },
    { name: 'Sachin-Jigar', lang: 'Hindi', query: 'Sachin Jigar' },

    // English
    { name: 'Taylor Swift', lang: 'English', query: 'Taylor Swift' },
    { name: 'Ed Sheeran', lang: 'English', query: 'Ed Sheeran' },
    { name: 'The Weeknd', lang: 'English', query: 'The Weeknd' }
  ];

  let totalInserted = 0;

  for (const d of directors) {
    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(d.query)}&media=music&entity=song&limit=30`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        for (const item of data.results) {
          if (!item.previewUrl || !item.trackName) continue;
          const durationSec = Math.floor((item.trackTimeMillis || 240000) / 1000);
          const coverUrl = item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg') : '';
          const year = item.releaseDate ? parseInt(item.releaseDate.substring(0, 4)) : 2023;

          const minutes = Math.floor(durationSec / 60);
          const seconds = durationSec % 60;
          const durationStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

          let decadeStr = '2020s';
          if (year < 1990) decadeStr = '1980s';
          else if (year < 2000) decadeStr = '1990s';
          else if (year < 2010) decadeStr = '2000s';
          else if (year < 2020) decadeStr = '2010s';

          const trackId = `db-${d.lang.toLowerCase()}-${totalInserted + 1}-${Date.now()}`;

          const sql = `
            INSERT INTO songs 
            (id, title, artist, album, director_name, language_id, release_year, decade, duration, duration_sec, audio_url, cover_url, category, genre) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          const values = [
            trackId,
            item.trackName,
            item.artistName,
            item.collectionName || item.trackName,
            d.name,
            d.lang.toLowerCase(),
            year,
            decadeStr,
            durationStr,
            durationSec,
            item.previewUrl,
            coverUrl,
            'songs',
            `${d.lang} Hit`
          ];
          await db.query(sql, values);
          totalInserted++;
        }
        console.log(`Seeded director: ${d.name} (${d.lang}) - songs added`);
      }
    } catch (err) {
      console.error(`Error seeding director: ${d.name}`, err.message);
    }
  }

  console.log(`Done seeding MySQL database! Total exact matching songs inserted: ${totalInserted}`);
  await db.end();
}

seedExactAudio().catch(console.error);
