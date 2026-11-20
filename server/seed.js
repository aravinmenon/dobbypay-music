import pool, { initDatabase } from './db.js';
import { ALL_LANGUAGES, ALL_DIRECTORS, CURATED_TRACKS } from '../src/data/indianMusicData.js';

async function seedDatabase() {
  console.log('🌱 Starting MySQL Database Seeding...');
  await initDatabase();

  const conn = await pool.getConnection();
  try {
    // 1. Seed Languages
    for (const lang of ALL_LANGUAGES) {
      await conn.query(
        `INSERT INTO languages (id, name, icon, color) 
         VALUES (?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE name=?, icon=?, color=?`,
        [lang.id, lang.name, lang.icon, lang.color, lang.name, lang.icon, lang.color]
      );
    }
    console.log(`✓ Seeded ${ALL_LANGUAGES.length} Languages.`);

    // 2. Seed Directors
    for (const dir of ALL_DIRECTORS) {
      await conn.query(
        `INSERT INTO directors (id, name, language_id, tagline, cover_url, color, bio)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=?, tagline=?, cover_url=?, color=?, bio=?`,
        [
          dir.id, dir.name, dir.language, dir.tagline, dir.coverUrl, dir.color, dir.bio,
          dir.name, dir.tagline, dir.coverUrl, dir.color, dir.bio
        ]
      );
    }
    console.log(`✓ Seeded ${ALL_DIRECTORS.length} Music Directors.`);

    // 3. Seed Songs
    let seededSongsCount = 0;
    for (const track of CURATED_TRACKS) {
      const releaseYear = parseInt(track.releaseDate) || 2024;
      let decade = '2020s';
      if (releaseYear >= 1980 && releaseYear <= 1989) decade = '1980s';
      else if (releaseYear >= 1990 && releaseYear <= 1999) decade = '1990s';
      else if (releaseYear >= 2000 && releaseYear <= 2009) decade = '2000s';
      else if (releaseYear >= 2010 && releaseYear <= 2019) decade = '2010s';

      await conn.query(
        `INSERT INTO songs 
         (id, title, artist, director_name, album, duration, duration_sec, audio_url, cover_url, genre, release_year, decade, language_id, category, plays, color)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         title=?, artist=?, director_name=?, album=?, duration=?, duration_sec=?, audio_url=?, cover_url=?, genre=?, release_year=?, decade=?, language_id=?, category=?, plays=?, color=?`,
        [
          track.id, track.title, track.artist, track.director, track.album, track.duration, track.durationSec || 240, track.audioUrl, track.coverUrl, track.genre, releaseYear, decade, track.language || 'tamil', track.category || 'songs', track.plays || '100,000', track.color || '#FF6B00',
          track.title, track.artist, track.director, track.album, track.duration, track.durationSec || 240, track.audioUrl, track.coverUrl, track.genre, releaseYear, decade, track.language || 'tamil', track.category || 'songs', track.plays || '100,000', track.color || '#FF6B00'
        ]
      );
      seededSongsCount++;
    }
    console.log(`✓ Seeded ${seededSongsCount} Full Songs (1980 to 2026) into MySQL database!`);

  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

seedDatabase();
