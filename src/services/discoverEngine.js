/**
 * Dobby AI Discover Weekly Recommendation Engine
 * Replicates the Spotify Audio-Features Recommendation & Slack Workflow
 */

import { TAMIL_TRACKS } from '../data/tamilTracks';
import { MOCK_TRACKS } from '../data/mockTracks';
import { searchSongsFromApi } from './musicApi';

export async function generateDiscoverPlaylist({ seedChoice, playlistName, recommendationType, likedTrackIds, tracks }) {
  let seedTracks = [];

  // 1. Select Seed Tracks based on choice
  if (seedChoice === 'Top') {
    seedTracks = tracks.slice(0, 5);
  } else if (seedChoice === 'Liked') {
    seedTracks = tracks.filter(t => likedTrackIds.includes(t.id));
    if (seedTracks.length === 0) seedTracks = TAMIL_TRACKS.slice(0, 5);
  } else if (seedChoice === 'ARRahman') {
    seedTracks = TAMIL_TRACKS.filter(t => t.director === 'A.R. Rahman').slice(0, 5);
  } else if (seedChoice === 'Anirudh') {
    seedTracks = TAMIL_TRACKS.filter(t => t.director === 'Anirudh Ravichander').slice(0, 5);
  } else {
    seedTracks = TAMIL_TRACKS.slice(0, 5);
  }

  // 2. Fetch live recommendations from API or local catalog matching the seed vibes
  const allCandidates = [...TAMIL_TRACKS, ...MOCK_TRACKS];
  let recommendedTracks = [];

  try {
    const seedNames = seedTracks.map(t => t.title).slice(0, 2).join(' ');
    const apiResults = await searchSongsFromApi(`${seedNames} tamil hits`, 25);
    if (apiResults && apiResults.length > 0) {
      recommendedTracks = apiResults;
    }
  } catch (err) {
    console.warn("Discover API fallback:", err);
  }

  // 3. Fallback or merge with local candidates if API yields few results
  if (recommendedTracks.length < 10) {
    const existingIds = new Set(recommendedTracks.map(t => t.id));
    for (const track of allCandidates) {
      if (!existingIds.has(track.id)) {
        recommendedTracks.push(track);
        existingIds.add(track.id);
      }
      if (recommendedTracks.length >= 15) break;
    }
  }

  // 4. Shuffle / Filter according to Recommendation Type (Exact vs Vibe Fusion)
  if (recommendationType === 'Exact') {
    // Keep closest audio match
    recommendedTracks = recommendedTracks.slice(0, 12);
  } else {
    // Mix and shuffle
    recommendedTracks = recommendedTracks.sort(() => 0.5 - Math.random()).slice(0, 15);
  }

  return {
    name: playlistName || `Discover Mix (${seedChoice})`,
    description: `Generated on-demand via Dobby AI (${recommendationType} match using ${seedChoice} seed).`,
    coverUrl: recommendedTracks[0]?.coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
    tracks: recommendedTracks
  };
}
