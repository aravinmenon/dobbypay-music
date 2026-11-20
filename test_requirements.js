import { fetchDirectorHitsFromApi, searchSongsFromApi } from './src/services/musicApi.js';
import { filterTracks } from './src/data/indianMusicData.js';

async function runAllTests() {
  console.log('=== STARTING AUTOMATED MUSIC DISCOVERY & PLAYBACK TESTS ===\n');

  // Test 1: Tamil -> Ilaiyaraaja -> available songs
  console.log('--- TEST 1: Tamil -> Ilaiyaraaja ---');
  const ilayarajaSongs = await fetchDirectorHitsFromApi('Ilaiyaraaja', 30);
  console.log(`Ilaiyaraaja songs found: ${ilayarajaSongs.length}`);
  if (ilayarajaSongs.length > 0) {
    console.log('Sample Ilaiyaraaja tracks:');
    ilayarajaSongs.slice(0, 3).forEach(s => {
      console.log(`  - [${s.title}] Duration: ${s.duration} | Full: ${s.isFullSong} | Stream: ${s.audioUrl ? 'Valid URL' : 'None'}`);
    });
  }
  const test1Pass = ilayarajaSongs.length >= 10;
  console.log(`TEST 1 RESULT: ${test1Pass ? 'PASSED ✅' : 'FAILED ❌'}\n`);

  // Test 2: Tamil -> A. R. Rahman -> available songs
  console.log('--- TEST 2: Tamil -> A. R. Rahman ---');
  const rahmanSongs = await fetchDirectorHitsFromApi('A.R. Rahman', 30);
  console.log(`A.R. Rahman songs found: ${rahmanSongs.length}`);
  if (rahmanSongs.length > 0) {
    console.log('Sample A.R. Rahman tracks:');
    rahmanSongs.slice(0, 3).forEach(s => {
      console.log(`  - [${s.title}] Duration: ${s.duration} | Full: ${s.isFullSong} | Stream: ${s.audioUrl ? 'Valid URL' : 'None'}`);
    });
  }
  const test2Pass = rahmanSongs.length >= 15;
  console.log(`TEST 2 RESULT: ${test2Pass ? 'PASSED ✅' : 'FAILED ❌'}\n`);

  // Test 3: Telugu -> Devi Sri Prasad / Keeravani -> matching songs
  console.log('--- TEST 3: Telugu -> Music Director (Devi Sri Prasad / DSP) ---');
  const dspSongs = await fetchDirectorHitsFromApi('Devi Sri Prasad (DSP)', 20);
  console.log(`DSP songs found: ${dspSongs.length}`);
  if (dspSongs.length > 0) {
    dspSongs.slice(0, 3).forEach(s => {
      console.log(`  - [${s.title}] Album: ${s.album} | Duration: ${s.duration} | Full: ${s.isFullSong}`);
    });
  }
  const test3Pass = dspSongs.length >= 5;
  console.log(`TEST 3 RESULT: ${test3Pass ? 'PASSED ✅' : 'FAILED ❌'}\n`);

  // Test 4: Search for a specific song and display its actual duration (e.g., Munbe Vaa)
  console.log('--- TEST 4: Search specific song ("Munbe Vaa") & actual duration ---');
  const searchResults = await searchSongsFromApi('Munbe Vaa tamil', 5);
  const munbeVaa = searchResults.find(s => s.title.toLowerCase().includes('munbe vaa')) || searchResults[0];
  console.log(`Track found: "${munbeVaa?.title}"`);
  console.log(`Actual Duration Reported: ${munbeVaa?.duration} (${munbeVaa?.durationSec} seconds)`);
  console.log(`Is Full Song: ${munbeVaa?.isFullSong}`);
  console.log(`Quality: ${munbeVaa?.quality}`);
  const test4Pass = munbeVaa && munbeVaa.durationSec > 180;
  console.log(`TEST 4 RESULT: ${test4Pass ? 'PASSED ✅ (Real song duration > 3 mins, not 30s)' : 'FAILED ❌'}\n`);

  // Test 5: Verify language filters and composer filters return accurate results
  console.log('--- TEST 5: Verify language & composer filter combinations ---');
  const filtered = filterTracks({ language: 'tamil', director: 'A.R. Rahman' });
  console.log(`Filtered local tracks count: ${filtered.length}`);
  const allMatch = filtered.every(t => t.language === 'tamil' && t.director.includes('Rahman'));
  console.log(`All match constraints: ${allMatch}`);
  const test5Pass = filtered.length > 0 && allMatch;
  console.log(`TEST 5 RESULT: ${test5Pass ? 'PASSED ✅' : 'FAILED ❌'}\n`);

  console.log('=== ALL TESTS COMPLETED ===');
}

runAllTests().catch(err => console.error('Test execution error:', err));
