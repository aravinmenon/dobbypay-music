import React, { useState, useEffect, useMemo, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { ALL_LANGUAGES, ALL_DIRECTORS, DECADE_FILTERS, CURATED_TRACKS } from '../data/indianMusicData';
import { searchSongsFromApi, fetchDirectorHitsFromApi, dedupeTracksBySong } from '../services/musicApi';
import { getSongCoverUrl } from '../services/phoneStorage';
import {
  Play, Pause, Heart, Clock, Search, Zap, Sparkles, Loader2,
  Music, Filter, CheckCircle2, Globe2, Mic2, Disc, Calendar, X, RefreshCw,
  Camera, MoreVertical, Radio, RadioTower, ChevronDown, Check, Film,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Music2
} from 'lucide-react';

// Helper to extract clean movie name from song title or album
function extractMovieName(track) {
  if (!track) return null;
  const title = track.title || track.song || '';
  const match = title.match(/(?:\(|\[)From\s+["']?([^"')\]]+)["']?(?:\)|\])/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  if (track.film && String(track.film).trim().length > 1) {
    return String(track.film).trim();
  }
  if (track.album && track.album !== 'Unknown Album' && track.album !== 'Single' && !track.album.toLowerCase().includes('greatest hits')) {
    const clean = track.album
      .replace(/\s*\(Original Motion Picture Soundtrack\)/i, '')
      .replace(/\s*\[Original Motion Picture Soundtrack\]/i, '')
      .replace(/\s*\(Original Soundtrack\)/i, '')
      .replace(/\s*\(OST\)/i, '')
      .replace(/\s*-\s*Single/i, '')
      .replace(/\s*\(Single\)/i, '')
      .trim();
    if (clean.length > 1) return clean;
  }
  return null;
}

function cleanMovieDisplayName(name = '') {
  return String(name)
    .replace(/\s*\(Original Motion Picture Soundtrack\)/ig, '')
    .replace(/\s*\[Original Motion Picture Soundtrack\]/ig, '')
    .replace(/\s*\(Original Soundtrack\)/ig, '')
    .replace(/\s*\(OST\)/ig, '')
    .replace(/\s*-\s*OST$/ig, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeMovieKey(name = '') {
  return cleanMovieDisplayName(name)
    .toLowerCase()
    .replace(/original motion picture soundtrack/gi, '')
    .replace(/original soundtrack/gi, '')
    .replace(/\bost\b/gi, '')
    .replace(/[^a-z0-9\u0b80-\u0bff\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function movieQueryScore(movieName, query) {
  const name = normalizeMovieKey(movieName);
  const q = normalizeMovieKey(query);
  if (!name || !q) return 0;
  if (name === q) return 100;
  if (name.startsWith(q) || q.startsWith(name)) return 92;
  if (name.includes(q) || q.includes(name)) return 80;
  const words = q.split(' ').filter((w) => w.length >= 2);
  if (words.length && words.every((w) => name.includes(w))) return 72;
  if (words.some((w) => name.includes(w))) return 45;
  return 0;
}

function looksLikeMovieQuery(query) {
  const q = (query || '').trim();
  if (q.length < 2) return false;
  // Titles like "Jailer 2", "Leo", "Vikram", or containing movie/film keywords
  if (/\b(movie|film|ost|soundtrack)\b/i.test(q)) return true;
  if (/\d/.test(q)) return true; // sequels: Jailer 2, Leo 2
  // Short multi-word titles often are movies when not clearly a director
  const words = q.split(/\s+/);
  return words.length >= 1 && words.length <= 5;
}

export const POPULAR_ARTISTS_AND_ACTORS = [
  { id: 'vijay', label: '👑 Thalapathy Vijay', query: 'Vijay hit songs', role: 'Actor' },
  { id: 'anirudh', label: '⚡ Anirudh Ravichander', query: 'Anirudh Ravichander hits', role: 'Music Director' },
  { id: 'arr', label: '🎶 A.R. Rahman', query: 'A.R. Rahman hit songs', role: 'Music Director' },
  { id: 'rajini', label: '🌟 Superstar Rajinikanth', query: 'Rajinikanth songs', role: 'Actor' },
  { id: 'ajith', label: '🔥 Ajith Kumar', query: 'Ajith Kumar hit songs', role: 'Actor' },
  { id: 'yuvan', label: '🎸 Yuvan Shankar Raja', query: 'Yuvan Shankar Raja songs', role: 'Music Director' },
  { id: 'ilayaraja', label: '🎼 Isaignani Ilaiyaraaja', query: 'Ilaiyaraaja hit songs', role: 'Music Director' },
  { id: 'harris', label: '🎵 Harris Jayaraj', query: 'Harris Jayaraj hits', role: 'Music Director' },
  { id: 'dhanush', label: '✨ Dhanush Hits', query: 'Dhanush songs', role: 'Actor' },
  { id: 'sk', label: '💫 Sivakarthikeyan', query: 'Sivakarthikeyan songs', role: 'Actor' },
  { id: 'kamal', label: '🎭 Kamal Haasan', query: 'Kamal Haasan songs', role: 'Actor' },
  { id: 'suriya', label: '🦅 Suriya Hits', query: 'Suriya songs', role: 'Actor' },
  { id: 'dsp', label: '🥁 Devi Sri Prasad', query: 'Devi Sri Prasad hits', role: 'Music Director' },
  { id: 'thaman', label: '⚡ Thaman S Hits', query: 'Thaman S songs', role: 'Music Director' }
];

const SPOTIFY_CATEGORIES = [
  {
    id: 'music',
    name: 'Music',
    bg: '#d81b60',
    query: 'tamil hits',
    img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=60'
  },
  {
    id: 'podcasts',
    name: 'Podcasts',
    bg: '#006450',
    query: 'science podcast',
    img: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=200&auto=format&fit=crop&q=60'
  },
  {
    id: 'live_events',
    name: 'Live Events',
    bg: '#7928ca',
    query: 'concert live',
    img: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&auto=format&fit=crop&q=60'
  },
  {
    id: 'ipop',
    name: 'Home of I-Pop',
    bg: '#1e3a8a',
    query: 'indie pop',
    img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&auto=format&fit=crop&q=60'
  },
  {
    id: 'made_for_you',
    name: 'Made For You',
    bg: '#8b5cf6',
    query: 'mix hits',
    img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=60'
  },
  {
    id: 'tamil',
    name: 'Tamil Hits',
    bg: '#e11d48',
    lang: 'tamil',
    img: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&auto=format&fit=crop&q=60'
  },
  {
    id: 'telugu',
    name: 'Telugu Hits',
    bg: '#ea580c',
    lang: 'telugu',
    img: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=200&auto=format&fit=crop&q=60'
  },
  {
    id: 'hindi',
    name: 'Bollywood Hits',
    bg: '#2563eb',
    lang: 'hindi',
    img: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&auto=format&fit=crop&q=60'
  },
  {
    id: 'arr',
    name: 'A.R. Rahman Universe',
    bg: '#9333ea',
    composer: 'A. R. Rahman',
    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=60'
  },
  {
    id: 'anirudh',
    name: 'Anirudh Hits',
    bg: '#db2777',
    composer: 'Anirudh Ravichander',
    img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=60'
  },
  {
    id: 'malayalam',
    name: 'Malayalam Beats',
    bg: '#059669',
    lang: 'malayalam',
    img: 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=200&auto=format&fit=crop&q=60'
  },
  {
    id: 'yuvan',
    name: 'Yuvan Drug Hits',
    bg: '#d97706',
    composer: 'Yuvan Shankar Raja',
    img: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=60'
  }
];

export default function SearchView() {
  const {
    tracks,
    searchQuery,
    setSearchQuery,
    playTrack,
    currentTrack,
    isPlaying,
    likedTrackIds,
    toggleLike,
    toggleSidebar,
    currentUser,
    setActiveView,
  } = usePlayer();

  const avatarLetter = (currentUser?.name || currentUser?.username || 'A').charAt(0).toUpperCase();

  // Multi-filters
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [selectedComposer, setSelectedComposer] = useState('all');
  const [singerFilter, setSingerFilter] = useState('');
  const [selectedDecade, setSelectedDecade] = useState('all');
  const [fullOnlyFilter, setFullOnlyFilter] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isLoadingMovieSongs, setIsLoadingMovieSongs] = useState(false);
  const songListAnchorRef = useRef(null);

  // Pagination — fixed 20 songs per page (no append / show-more)
  const PAGE_SIZE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  // Language Dropdown states
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [langSearchQuery, setLangSearchQuery] = useState('');

  // Refs for smooth horizontal scrolling
  const moviesShelfRef = useRef(null);
  const filterPillsRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.spotify-lang-dropdown-menu') && !e.target.closest('.spotify-lang-dropdown-btn')) {
        setIsLangDropdownOpen(false);
      }
    };
    if (isLangDropdownOpen) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isLangDropdownOpen]);

  const filteredLanguages = useMemo(() => {
    if (!langSearchQuery.trim()) return ALL_LANGUAGES;
    const q = langSearchQuery.toLowerCase().trim();
    return ALL_LANGUAGES.filter(l => l.name.toLowerCase().includes(q) || l.id.toLowerCase().includes(q));
  }, [langSearchQuery]);

  const [liveApiTracks, setLiveApiTracks] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Search execution
  useEffect(() => {
    const q = (searchQuery || '').trim();
    if (!q && selectedLanguage === 'all' && selectedComposer === 'all') {
      setLiveApiTracks([]);
      return;
    }

    let mounted = true;
    setIsSearching(true);
    setCurrentPage(1);

    const timer = setTimeout(async () => {
      try {
        const queryBuilder = [];
        if (q) queryBuilder.push(q);
        if (selectedComposer !== 'all') queryBuilder.push(selectedComposer);
        if (selectedLanguage !== 'all' && !q.toLowerCase().includes(selectedLanguage)) {
          queryBuilder.push(selectedLanguage);
        }

        const fullQuery = queryBuilder.join(' ').trim() || 'tamil hit songs';
        const qClean = q.toLowerCase();

        // Check if query matches a known music director
        const matchedDirector = ALL_DIRECTORS.find(d => {
          const dName = d.name.toLowerCase();
          const qWithoutKeywords = qClean.replace(/hits|songs|hit|best|all|melody/g, '').trim();
          return qClean.includes(dName) || (qWithoutKeywords.length > 2 && dName.includes(qWithoutKeywords));
        });

        let res = [];
        if (matchedDirector || selectedComposer !== 'all') {
          const dirName = matchedDirector ? matchedDirector.name : selectedComposer;
          res = await fetchDirectorHitsFromApi(dirName, 250, selectedLanguage);
          if (!res || res.length === 0) {
            res = await searchSongsFromApi(fullQuery, 150, selectedLanguage);
          }
        } else if (looksLikeMovieQuery(q)) {
          // Movie-wise search: fetch soundtrack + songs for titles like "Jailer 2"
          const movieBase = q.replace(/\b(movie|film|ost|soundtrack|songs?)\b/gi, '').trim() || q;
          const movieQueries = [
            `${movieBase} songs`,
            `${movieBase} soundtrack`,
            `${movieBase} tamil songs`,
            movieBase,
            fullQuery,
          ];
          const batches = await Promise.all(
            movieQueries.map((mq) => searchSongsFromApi(mq, 80, selectedLanguage).catch(() => []))
          );
          res = dedupeTracksBySong(
            batches.flat().map((t) => (t ? { ...t, isLiveApi: true } : null))
          );
        } else {
          res = await searchSongsFromApi(fullQuery, 150, selectedLanguage);
        }

        if (mounted && Array.isArray(res)) {
          setLiveApiTracks(res.map((t) => (t.isLiveApi ? t : { ...t, isLiveApi: true })));
        }
      } catch (err) {
        console.warn('Search execution error:', err);
      } finally {
        if (mounted) setIsSearching(false);
      }
    }, 350);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedLanguage, selectedComposer]);

  // When a movie is selected, fetch the complete soundtrack (full song list)
  useEffect(() => {
    if (!selectedMovie) {
      setIsLoadingMovieSongs(false);
      return undefined;
    }
    let mounted = true;
    setIsLoadingMovieSongs(true);

    const queries = [
      `${selectedMovie} songs`,
      `${selectedMovie} soundtrack`,
      `${selectedMovie} full songs`,
      `${selectedMovie} original motion picture soundtrack`,
    ];

    Promise.all(
      queries.map((q) => searchSongsFromApi(q, 80, selectedLanguage).catch(() => []))
    )
      .then((batches) => {
        if (!mounted) return;
        const merged = dedupeTracksBySong(batches.flat());
        if (merged.length > 0) {
          setLiveApiTracks((prev) => dedupeTracksBySong([...merged, ...prev]));
        }
      })
      .catch((err) => console.warn('Could not fetch full movie tracks:', err))
      .finally(() => {
        if (mounted) setIsLoadingMovieSongs(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedMovie, selectedLanguage]);

  const openMovieSoundtrack = (movie) => {
    if (!movie?.name) return;
    setSelectedMovie(movie.name);
    setCurrentPage(1);
    // Show the songs already grouped on the card immediately
    if (Array.isArray(movie.tracks) && movie.tracks.length > 0) {
      setLiveApiTracks((prev) => dedupeTracksBySong([...movie.tracks, ...prev]));
    }
    requestAnimationFrame(() => {
      songListAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  // Combine live API tracks with local curated tracks (one row per song title)
  const combinedCatalog = useMemo(
    () => dedupeTracksBySong([...liveApiTracks, ...CURATED_TRACKS]),
    [liveApiTracks]
  );

  // Group all tracks by detected movie/album
  const movieAlbums = useMemo(() => {
    const map = new Map();
    combinedCatalog.forEach((track) => {
      const rawMovie = extractMovieName(track);
      if (!rawMovie) return;
      const movie = cleanMovieDisplayName(rawMovie) || rawMovie;
      const normKey = normalizeMovieKey(movie);
      if (!normKey) return;
      if (!map.has(normKey)) {
        map.set(normKey, {
          name: movie,
          coverUrl: track.coverUrl,
          language: track.language,
          artist: track.artist || track.director || track.composer,
          tracks: [],
        });
      }
      const entry = map.get(normKey);
      // Prefer shorter clean title like "Jailer 2" over long OST labels
      if (movie.length < entry.name.length) entry.name = movie;
      if (!entry.coverUrl && track.coverUrl) entry.coverUrl = track.coverUrl;
      entry.tracks.push(track);
    });
    const q = (searchQuery || '').trim();
    return Array.from(map.values())
      .map((m) => ({ ...m, matchScore: movieQueryScore(m.name, q) }))
      .sort((a, b) => (b.matchScore - a.matchScore) || (b.tracks.length - a.tracks.length));
  }, [combinedCatalog, searchQuery]);

  // Movies that match the typed query (e.g. Jailer 2)
  const matchedMovies = useMemo(() => {
    const q = (searchQuery || '').trim();
    if (!q) return movieAlbums.slice(0, 8);
    const hits = movieAlbums.filter((m) => m.matchScore >= 45);
    return hits.length ? hits : movieAlbums.slice(0, 6);
  }, [movieAlbums, searchQuery]);

  const primaryMovie = useMemo(() => {
    if (selectedMovie) {
      return movieAlbums.find((m) => normalizeMovieKey(m.name) === normalizeMovieKey(selectedMovie)) || null;
    }
    const top = matchedMovies[0];
    if (top && top.matchScore >= 60) return top;
    return null;
  }, [selectedMovie, matchedMovies, movieAlbums]);

  // Apply filters, then rank song-name / movie matches first
  const finalFilteredTracks = useMemo(() => {
    const qRaw = (searchQuery || '').trim().toLowerCase();
    const qClean = qRaw.replace(/\b(hits|songs|hit|best|all|melody|top|movie|film|ost|soundtrack)\b/g, '').trim();
    const qWords = qClean.split(/\s+/).filter((w) => w.length >= 2);
    const activeMovie = selectedMovie || (primaryMovie?.matchScore >= 60 ? primaryMovie.name : null);

    const scoreTrack = (t) => {
      const title = (t.title || '').toLowerCase();
      const artist = (t.artist || t.singers || '').toLowerCase();
      const album = (t.album || t.film || '').toLowerCase();
      const movie = (extractMovieName(t) || '').toLowerCase();
      if (!qClean) return 0;
      let score = 0;
      if (title === qClean) score = 100;
      else if (title.startsWith(qClean)) score = 90;
      else if (title.includes(qClean)) score = 80;
      else if (qWords.length && qWords.every((w) => title.includes(w))) score = 70;
      else if (qWords.some((w) => title.includes(w))) score = 55;

      const movieScore = Math.max(movieQueryScore(album, qClean), movieQueryScore(movie, qClean));
      if (movieScore >= 70) score = Math.max(score, 95);
      else if (movieScore >= 45) score = Math.max(score, 75);

      if (artist.includes(qClean) || qWords.some((w) => artist.includes(w))) score = Math.max(score, 40);
      if (t.isLiveApi) score = Math.max(score, 25);
      if (activeMovie && (movie.includes(normalizeMovieKey(activeMovie)) || album.includes(normalizeMovieKey(activeMovie)))) {
        score += 15;
      }
      return score;
    };

    const trackMatchesMovie = (t, movieName) => {
      const normSelected = normalizeMovieKey(movieName);
      const m = normalizeMovieKey(extractMovieName(t) || '');
      const album = normalizeMovieKey(t.album || t.film || '');
      const title = (t.title || '').toLowerCase();
      return (
        (m && (m === normSelected || m.includes(normSelected) || normSelected.includes(m))) ||
        (album && (album === normSelected || album.includes(normSelected) || normSelected.includes(album))) ||
        title.includes(normSelected)
      );
    };

    const filtered = combinedCatalog.filter((t) => {
      if (selectedMovie) {
        if (!trackMatchesMovie(t, selectedMovie)) return false;
      }

      if (selectedLanguage !== 'all') {
        const lang = (t.language || '').toLowerCase();
        if (lang && lang !== selectedLanguage.toLowerCase()) return false;
      }

      if (selectedComposer !== 'all') {
        const dir = (t.director || t.composer || '').toLowerCase();
        if (!dir.includes(selectedComposer.toLowerCase())) return false;
      }

      if (singerFilter.trim()) {
        const sTarget = singerFilter.toLowerCase().trim();
        const artist = (t.singers || t.artist || '').toLowerCase();
        if (!artist.includes(sTarget)) return false;
      }

      if (selectedDecade !== 'all') {
        const dObj = DECADE_FILTERS.find((d) => d.id === selectedDecade);
        if (dObj) {
          const year = parseInt(t.releaseDate || '2000', 10);
          if (year < dObj.range[0] || year > dObj.range[1]) return false;
        }
      }

      if (fullOnlyFilter && !t.isFullSong) return false;

      // Soft movie mode: keep soundtrack songs for the primary movie + other query hits
      if (qRaw && !selectedMovie) {
        if (primaryMovie && trackMatchesMovie(t, primaryMovie.name)) return true;
        if (t.isLiveApi) return true;
        if (!qClean) return true;
        if (qWords.length === 0) return true;
        const hay = `${t.title || ''} ${t.artist || ''} ${t.album || ''} ${t.film || ''} ${t.director || ''} ${t.composer || ''}`.toLowerCase();
        return qWords.some((w) => hay.includes(w));
      }

      return true;
    });

    return filtered.sort((a, b) => scoreTrack(b) - scoreTrack(a));
  }, [combinedCatalog, selectedMovie, selectedLanguage, selectedComposer, singerFilter, selectedDecade, fullOnlyFilter, searchQuery, primaryMovie]);

  const movieSongs = useMemo(() => {
    if (!primaryMovie) return [];
    const key = normalizeMovieKey(primaryMovie.name);
    const fromFilter = finalFilteredTracks.filter((t) => {
      const m = normalizeMovieKey(extractMovieName(t) || '');
      const album = normalizeMovieKey(t.album || t.film || '');
      const title = (t.title || '').toLowerCase();
      return (
        m === key ||
        m.includes(key) ||
        key.includes(m) ||
        album.includes(key) ||
        key.includes(album) ||
        title.includes(key)
      );
    });
    // Always keep the songs already attached to the movie card (e.g. 9 OK Jaanu tracks)
    return dedupeTracksBySong([...(primaryMovie.tracks || []), ...fromFilter]);
  }, [primaryMovie, finalFilteredTracks]);

  const activeSongList = selectedMovie || primaryMovie ? movieSongs : finalFilteredTracks;

  // Pagination calculation — always 20 songs per page
  const totalPages = Math.max(1, Math.ceil(activeSongList.length / PAGE_SIZE));
  const paginatedTracks = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return activeSongList.slice(start, start + PAGE_SIZE);
  }, [activeSongList, currentPage]);

  const pageStart = activeSongList.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, activeSongList.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedMovie, selectedLanguage, selectedComposer]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    const scroller = document.querySelector('.sp-results-page');
    if (scroller) scroller.scrollTop = 0;
  }, [currentPage]);

  const resetAllFilters = () => {
    setSelectedLanguage('all');
    setSelectedComposer('all');
    setSingerFilter('');
    setSelectedDecade('all');
    setFullOnlyFilter(false);
    setSearchQuery('');
    setSelectedMovie(null);
  };

  const handleCategoryClick = (cat) => {
    // Open a dedicated results page (replaces browse — no scroll-down)
    if (cat.composer) {
      setSelectedComposer(cat.composer);
      setSearchQuery(cat.composer);
    } else if (cat.lang) {
      setSelectedLanguage(cat.lang);
      setSearchQuery(`${cat.name}`);
    } else if (cat.query) {
      setSearchQuery(cat.query);
    }
  };

  const clearSearchPage = () => {
    resetAllFilters();
  };

  const isSearchActive = (searchQuery && searchQuery.trim().length > 0) ||
    selectedLanguage !== 'all' ||
    selectedComposer !== 'all' ||
    singerFilter.trim().length > 0 ||
    selectedMovie !== null;

  const resultsRef = useRef(null);
  useEffect(() => {
    if (!isSearchActive) return;
    // Jump to top of results page immediately
    const el = resultsRef.current?.closest('.view-content') || resultsRef.current;
    if (el) el.scrollTop = 0;
  }, [isSearchActive, searchQuery, selectedComposer, selectedLanguage, selectedMovie]);

  return (
    <div className="view-content spotify-search-screen sp-search-page" ref={resultsRef}>
      {!isSearchActive ? (
        <>
          <div className="sp-search-header">
            <button type="button" className="sp-home-avatar" onClick={toggleSidebar} aria-label="Open profile">
              {avatarLetter}
            </button>
            <h1 className="sp-search-title">Search</h1>
            <button
              className="spotify-camera-btn"
              title="Scan code"
              onClick={() => {}}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}
            >
              <Camera size={26} color="#fff" />
            </button>
          </div>

          <div className="sp-search-input">
            <Search size={22} color="#121212" strokeWidth={2.5} />
            <input
              type="text"
              placeholder="Search song name, artist..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (selectedMovie) setSelectedMovie(null);
              }}
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          <button
            type="button"
            className="sp-play-all-btn"
            style={{ marginBottom: 14 }}
            onClick={() => setActiveView('directors')}
          >
            <Music2 size={18} color="#000" />
            <span>All Music Directors</span>
          </button>

          <p className="sp-directors-lead" style={{ marginBottom: 8 }}>Browse by actor / artist — 20 songs per page</p>
          <div className="spotify-actor-director-pills sp-search-pills">
            {POPULAR_ARTISTS_AND_ACTORS.map((artist) => (
              <button
                key={artist.id}
                type="button"
                className="spotify-filter-pill"
                onClick={() => {
                  setSearchQuery(artist.query);
                  setSelectedMovie(null);
                  setCurrentPage(1);
                }}
              >
                <span>{artist.label}</span>
              </button>
            ))}
          </div>

          <div className="spotify-categories-grid">
            {SPOTIFY_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className="spotify-category-card"
                style={{ backgroundColor: cat.bg }}
                onClick={() => handleCategoryClick(cat)}
              >
                <h3 className="spotify-category-name">{cat.name}</h3>
                <img src={cat.img} alt="" className="spotify-category-thumb" loading="lazy" />
              </button>
            ))}
          </div>
        </>
      ) : null}

      {/* ─── Dedicated results page (replaces browse) ─── */}
      {isSearchActive && (
        <div className="sp-results-page">
          <div className="sp-results-topbar">
            <button type="button" className="sp-settings-back" onClick={clearSearchPage} aria-label="Back to Search">
              <ChevronLeft size={28} />
            </button>
            <div className="sp-search-input sp-search-input--compact">
              {isSearching ? (
                <Loader2 size={20} className="spin-animation" color="#121212" />
              ) : (
                <Search size={20} color="#121212" strokeWidth={2.5} />
              )}
              <input
                type="text"
                placeholder="Song name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (selectedMovie) setSelectedMovie(null);
                }}
                spellCheck={false}
                autoComplete="off"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedMovie(null);
                  }}
                  className="sp-search-clear"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>

          {(selectedLanguage !== 'all' || selectedComposer !== 'all' || selectedMovie) && (
            <div className="sp-results-chips">
              {selectedLanguage !== 'all' && (
                <button type="button" className="sp-chip" onClick={() => setSelectedLanguage('all')}>
                  {ALL_LANGUAGES.find((l) => l.id === selectedLanguage)?.name || selectedLanguage} <X size={12} />
                </button>
              )}
              {selectedComposer !== 'all' && (
                <button type="button" className="sp-chip" onClick={() => setSelectedComposer('all')}>
                  {selectedComposer} <X size={12} />
                </button>
              )}
              {selectedMovie && (
                <button type="button" className="sp-chip" onClick={() => setSelectedMovie(null)}>
                  {selectedMovie} <X size={12} />
                </button>
              )}
            </div>
          )}
          {/* Movie-wise results (e.g. Jailer 2) */}
          {matchedMovies.length > 0 && (
            <section className="sp-movie-section">
              <div className="sp-results-summary">
                <div>
                  <h2 className="sp-results-heading">
                    <Film size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    Movies
                  </h2>
                  <p className="sp-results-count">
                    {isSearching ? 'Finding soundtracks…' : `${matchedMovies.length} movie${matchedMovies.length === 1 ? '' : 's'}`}
                  </p>
                </div>
              </div>
              <div className="sp-movie-cards">
                {(selectedMovie
                  ? matchedMovies.filter((m) => normalizeMovieKey(m.name) === normalizeMovieKey(selectedMovie))
                  : matchedMovies
                ).slice(0, 8).map((movie) => {
                  const isActive = selectedMovie
                    ? normalizeMovieKey(selectedMovie) === normalizeMovieKey(movie.name)
                    : primaryMovie && normalizeMovieKey(primaryMovie.name) === normalizeMovieKey(movie.name);
                  return (
                    <button
                      key={movie.name}
                      type="button"
                      className={`sp-movie-card ${isActive ? 'active' : ''}`}
                      onClick={() => openMovieSoundtrack(movie)}
                    >
                      <img
                        src={movie.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200'}
                        alt=""
                        className="sp-movie-card-img"
                      />
                      <div className="sp-movie-card-body">
                        <span className="sp-movie-card-title">{movie.name}</span>
                        <span className="sp-movie-card-sub">
                          {movie.tracks.length} song{movie.tracks.length === 1 ? '' : 's'}
                          {movie.artist ? ` · ${movie.artist}` : ''}
                          {' · Tap for full songs'}
                        </span>
                      </div>
                      <span
                        className="sp-movie-card-play"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMovieSoundtrack(movie);
                          const list = movie.tracks || [];
                          if (list[0]) playTrack(list[0], list);
                        }}
                        role="presentation"
                        title="Play all movie songs"
                      >
                        <Play size={16} fill="#000" color="#000" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <div ref={songListAnchorRef} />

          {(selectedMovie || primaryMovie) && (
            <div className="sp-movie-hero">
              <img
                src={(primaryMovie || matchedMovies[0])?.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200'}
                alt=""
                className="sp-movie-hero-img"
              />
              <div className="sp-movie-hero-text">
                <span className="sp-movie-hero-label">Full movie soundtrack</span>
                <h2>{selectedMovie || primaryMovie?.name}</h2>
                <p>
                  {isLoadingMovieSongs
                    ? `Loading full songs… (${activeSongList.length} so far)`
                    : `${activeSongList.length} full song${activeSongList.length === 1 ? '' : 's'}`}
                </p>
                <button
                  type="button"
                  className="sp-play-all-btn sp-play-all-btn--sm"
                  onClick={() => {
                    if (activeSongList[0]) playTrack(activeSongList[0], activeSongList);
                  }}
                  disabled={!activeSongList.length}
                >
                  <Play size={16} fill="#000" color="#000" />
                  Play all full songs
                </button>
              </div>
            </div>
          )}

          <div className="sp-results-summary">
            <div>
              <h2 className="sp-results-heading">
                {selectedMovie || primaryMovie
                  ? `Full songs · ${selectedMovie || primaryMovie.name}`
                  : searchQuery
                    ? `Songs for “${searchQuery}”`
                    : 'Songs'}
              </h2>
              <p className="sp-results-count">
                {isSearching || isLoadingMovieSongs
                  ? 'Loading full soundtrack…'
                  : `${activeSongList.length} song${activeSongList.length === 1 ? '' : 's'} · Page ${currentPage}/${totalPages}`}
              </p>
            </div>
            {activeSongList.length > 0 && (
              <button
                type="button"
                className="sp-play-all-btn sp-play-all-btn--sm"
                onClick={() => playTrack(activeSongList[0], activeSongList)}
              >
                <Play size={16} fill="#000" color="#000" />
                Play all
              </button>
            )}
          </div>

          {activeSongList.length > 0 && (
            <div className="sp-page-meta">
              Showing {pageStart}–{pageEnd} of {activeSongList.length} · {PAGE_SIZE} per page
            </div>
          )}

          <div className="sp-song-list">
            {paginatedTracks.map((track, idx) => {
              const globalIndex = (currentPage - 1) * PAGE_SIZE + idx + 1;
              const isCurrent = currentTrack?.id === track.id || currentTrack?.title === track.title;
              const isLiked = likedTrackIds.includes(track.id);
              return (
                <button
                  key={track.id || `${track.title}-${globalIndex}`}
                  type="button"
                  className={`sp-song-row ${isCurrent ? 'active' : ''}`}
                  onClick={() => playTrack(track, activeSongList)}
                >
                  <span className="sp-song-index">{globalIndex}</span>
                  <img
                    src={getSongCoverUrl(track, 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200')}
                    alt=""
                    className="sp-song-cover"
                    loading="lazy"
                  />
                  <div className="sp-song-meta">
                    <span className="sp-song-title">{track.title}</span>
                    <span className="sp-song-artist">
                      {track.artist || track.singers || 'Unknown Artist'}
                      {track.album ? ` · ${track.album}` : ''}
                    </span>
                  </div>
                  <span
                    className="sp-song-like"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(track.id, track);
                    }}
                    role="presentation"
                  >
                    <Heart size={18} fill={isLiked ? 'var(--spotify-green)' : 'none'} color={isLiked ? 'var(--spotify-green)' : '#b3b3b3'} />
                  </span>
                  {isCurrent && isPlaying ? <Pause size={18} color="#fff" /> : <Play size={18} color="#fff" fill="#fff" />}
                </button>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="sp-pagination">
              <button
                type="button"
                className="sp-page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                title="First page"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                type="button"
                className="sp-page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
                Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                .map((page, index, arr) => {
                  const prev = arr[index - 1];
                  const showEllipsis = prev && page - prev > 1;
                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && <span className="sp-page-ellipsis">…</span>}
                      <button
                        type="button"
                        className={`sp-page-btn ${currentPage === page ? 'active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                type="button"
                className="sp-page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight size={16} />
              </button>
              <button
                type="button"
                className="sp-page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                title="Last page"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          )}

          {activeSongList.length === 0 && !isSearching && (
            <div className="sp-history-empty">
              <Music2 size={42} color="#b3b3b3" />
              <p>No songs found</p>
              <span>Try another song name or artist</span>
              <button type="button" className="sp-play-all-btn" style={{ marginTop: 16, maxWidth: 200 }} onClick={resetAllFilters}>
                Clear search
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
