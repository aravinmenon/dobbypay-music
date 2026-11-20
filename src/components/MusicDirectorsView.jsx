import React, { useState, useEffect, useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { ALL_DIRECTORS, ALL_LANGUAGES, CURATED_TRACKS, getDirectorsByLanguage } from '../data/indianMusicData';
import { dedupeTracksBySong, fetchDirectorHitsFromApi, searchSongsFromApi } from '../services/musicApi';
import { getSongCoverUrl } from '../services/phoneStorage';
import {
  Play, Pause, Heart, Search, Loader2, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Music2, X
} from 'lucide-react';

const PAGE_SIZE = 20;

function trackMatchesQuery(track, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  const hay = [
    track.title,
    track.artist,
    track.album,
    track.singers,
    track.movie,
    track.director,
    track.composer,
    track.genre
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return q.split(/\s+/).every((part) => hay.includes(part));
}

export default function MusicDirectorsView() {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    likedTrackIds,
    toggleLike,
    setActiveView,
    toggleSidebar,
    currentUser,
  } = usePlayer();

  const avatarLetter = (currentUser?.name || currentUser?.username || 'A').charAt(0).toUpperCase();

  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [composerSearch, setComposerSearch] = useState('');
  const [selectedDirector, setSelectedDirector] = useState(null);
  const [directorTracks, setDirectorTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [songSearch, setSongSearch] = useState('');
  const [searchExtraTracks, setSearchExtraTracks] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const directors = useMemo(() => {
    const base = getDirectorsByLanguage(selectedLanguage);
    const q = composerSearch.trim().toLowerCase();
    if (!q) return base;
    return base.filter((d) =>
      d.name.toLowerCase().includes(q) ||
      (d.tagline || '').toLowerCase().includes(q) ||
      (d.language || '').toLowerCase().includes(q)
    );
  }, [selectedLanguage, composerSearch]);

  const directorsByLanguage = useMemo(() => {
    if (selectedLanguage !== 'all' || composerSearch.trim()) return null;
    const groups = {};
    ALL_LANGUAGES.filter((l) => l.id !== 'all').forEach((lang) => {
      const list = ALL_DIRECTORS.filter((d) => d.language === lang.id);
      if (list.length) groups[lang.id] = { lang, list };
    });
    return groups;
  }, [selectedLanguage, composerSearch]);

  const activeDirector = useMemo(
    () => ALL_DIRECTORS.find((d) => d.name === selectedDirector) || null,
    [selectedDirector]
  );

  useEffect(() => {
    if (!selectedDirector) {
      setDirectorTracks([]);
      return;
    }
    let mounted = true;
    setIsLoading(true);
    setSongSearch('');
    setSearchExtraTracks([]);
    setCurrentPage(1);

    const localHits = CURATED_TRACKS.filter((t) => {
      const dir = `${t.director || ''} ${t.composer || ''} ${t.artist || ''}`.toLowerCase();
      return dir.includes(selectedDirector.toLowerCase());
    });

    // Show curated songs immediately while full catalog loads (unique titles only)
    const uniqueLocal = dedupeTracksBySong(localHits);
    if (uniqueLocal.length) setDirectorTracks(uniqueLocal);

    fetchDirectorHitsFromApi(selectedDirector, 500, selectedLanguage)
      .then((tracks) => {
        if (!mounted) return;
        const merged = dedupeTracksBySong([...(tracks || []), ...localHits]);
        merged.sort((a, b) => {
          const aFull = a.audioUrl && !a.isPreview ? 1 : 0;
          const bFull = b.audioUrl && !b.isPreview ? 1 : 0;
          return bFull - aFull;
        });
        setDirectorTracks(merged);
      })
      .catch(() => {
        if (mounted && uniqueLocal.length) setDirectorTracks(uniqueLocal);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedDirector, selectedLanguage]);

  // Live catalog search while typing (title / movie / singer) within this director
  useEffect(() => {
    if (!selectedDirector) return undefined;
    const q = songSearch.trim();
    if (q.length < 2) {
      setSearchExtraTracks([]);
      setIsSearching(false);
      return undefined;
    }
    let mounted = true;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchSongsFromApi(
          `${q} ${selectedDirector}`,
          60,
          selectedLanguage === 'all' ? (activeDirector?.language || 'all') : selectedLanguage
        );
        if (!mounted) return;
        const directorKey = selectedDirector.toLowerCase();
        const relevant = (results || []).filter((t) => {
          const dir = `${t.director || ''} ${t.composer || ''} ${t.artist || ''} ${t.album || ''}`.toLowerCase();
          return dir.includes(directorKey) || trackMatchesQuery(t, q);
        });
        setSearchExtraTracks(relevant);
      } catch (_) {
        if (mounted) setSearchExtraTracks([]);
      } finally {
        if (mounted) setIsSearching(false);
      }
    }, 320);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [songSearch, selectedDirector, selectedLanguage, activeDirector?.language]);

  const filteredSongs = useMemo(() => {
    const q = songSearch.trim();
    const localFiltered = q
      ? directorTracks.filter((t) => trackMatchesQuery(t, q))
      : directorTracks;
    if (!q) return localFiltered;
    return dedupeTracksBySong([...localFiltered, ...searchExtraTracks]);
  }, [directorTracks, songSearch, searchExtraTracks]);

  const totalPages = Math.max(1, Math.ceil(filteredSongs.length / PAGE_SIZE));
  const paginatedSongs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSongs.slice(start, start + PAGE_SIZE);
  }, [filteredSongs, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [songSearch]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);

  useEffect(() => {
    const scroller = document.querySelector('.sp-directors-page');
    if (scroller) scroller.scrollTop = 0;
  }, [currentPage, selectedDirector]);

  const openDirector = (name) => {
    setSelectedDirector(name);
    setCurrentPage(1);
    setSongSearch('');
    setIsLoading(true);
    setDirectorTracks([]);
  };

  const backToDirectors = () => {
    setSelectedDirector(null);
    setDirectorTracks([]);
    setSongSearch('');
    setCurrentPage(1);
    setIsLoading(false);
  };

  const pageStart = filteredSongs.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, filteredSongs.length);

  // ── Director detail: all songs with 20-per-page pagination ──
  if (activeDirector) {
    return (
      <div className="view-content sp-directors-page">
        <div className="sp-director-detail-top sp-director-detail-top--sticky">
          <button type="button" className="sp-settings-back" onClick={backToDirectors} aria-label="Back">
            <ChevronLeft size={28} />
          </button>
          <div className="sp-search-input sp-search-input--compact">
            {isLoading || isSearching ? (
              <Loader2 size={20} className="spin-animation" color="#121212" />
            ) : (
              <Search size={20} color="#121212" strokeWidth={2.5} />
            )}
            <input
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={`Search ${activeDirector.name} songs, movies...`}
              value={songSearch}
              onChange={(e) => setSongSearch(e.target.value)}
              aria-label={`Search ${activeDirector.name} songs`}
            />
            {songSearch && (
              <button type="button" className="sp-search-clear" onClick={() => setSongSearch('')} aria-label="Clear search">
                <X size={18} />
              </button>
            )}
          </div>
        </div>
        {songSearch.trim() && (
          <div className="sp-director-search-hint">
            {isSearching
              ? `Searching “${songSearch.trim()}”…`
              : `${filteredSongs.length} result${filteredSongs.length === 1 ? '' : 's'} for “${songSearch.trim()}”`}
          </div>
        )}

        <div
          className="sp-director-hero"
          style={{ background: `linear-gradient(135deg, ${activeDirector.color}55, rgba(18,18,18,0.95))` }}
        >
          <img src={activeDirector.coverUrl} alt="" className="sp-director-hero-img" />
          <div className="sp-director-hero-text">
            <span className="sp-director-hero-lang">{(activeDirector.language || '').toUpperCase()} MUSIC DIRECTOR</span>
            <h1>{activeDirector.name}</h1>
            <p>{activeDirector.tagline}</p>
            <p className="sp-director-hero-count">
              {isLoading && filteredSongs.length === 0
                ? 'Loading full songs…'
                : isLoading
                  ? `${filteredSongs.length}+ songs loading…`
                  : `${filteredSongs.length} song${filteredSongs.length === 1 ? '' : 's'} · Page ${currentPage}/${totalPages}`}
            </p>
            {filteredSongs.length > 0 && (
              <button
                type="button"
                className="sp-play-all-btn sp-play-all-btn--sm"
                onClick={() => playTrack(filteredSongs[0], filteredSongs)}
              >
                <Play size={16} fill="#000" color="#000" />
                Play all songs
              </button>
            )}
          </div>
        </div>

        {filteredSongs.length > 0 && (
          <div className="sp-page-meta">
            Showing {pageStart}–{pageEnd} of {filteredSongs.length} · {PAGE_SIZE} per page
          </div>
        )}

        {isLoading && filteredSongs.length === 0 && (
          <div className="sp-director-loading">
            <Loader2 size={28} className="spin-animation" color="var(--spotify-green)" />
            <p>Fetching full songs from catalog…</p>
            <span>This can take a few seconds for big composers</span>
          </div>
        )}

        <div className="sp-song-list">
          {paginatedSongs.map((track, idx) => {
            const globalIndex = (currentPage - 1) * PAGE_SIZE + idx + 1;
            const isCurrent = currentTrack?.id === track.id || currentTrack?.title === track.title;
            const isLiked = likedTrackIds.includes(track.id);
            return (
              <button
                key={track.id || `${track.title}-${globalIndex}`}
                type="button"
                className={`sp-song-row ${isCurrent ? 'active' : ''}`}
                onClick={() => {
                  if (isCurrent) togglePlay();
                  else playTrack(track, filteredSongs);
                }}
              >
                <span className="sp-song-index">{globalIndex}</span>
                <img
                  src={getSongCoverUrl(track, activeDirector.coverUrl)}
                  alt=""
                  className="sp-song-cover"
                  loading="lazy"
                />
                <div className="sp-song-meta">
                  <span className="sp-song-title">{track.title}</span>
                  <span className="sp-song-artist">
                    {track.artist || track.singers || activeDirector.name}
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

        {!isLoading && filteredSongs.length === 0 && (
          <div className="sp-history-empty">
            <Music2 size={40} color="#b3b3b3" />
            <p>No songs found</p>
            <span>Try another language filter or search</span>
          </div>
        )}
      </div>
    );
  }

  // ── Browse: all directors, language-wise ──
  return (
    <div className="view-content sp-directors-page">
      <div className="sp-search-header">
        <button type="button" className="sp-home-avatar" onClick={toggleSidebar} aria-label="Open profile">
          {avatarLetter}
        </button>
        <h1 className="sp-search-title">Music Directors</h1>
        <button type="button" className="sp-settings-back" onClick={() => setActiveView('home')} aria-label="Home">
          <ChevronLeft size={26} />
        </button>
      </div>

      <p className="sp-directors-lead">
        Browse all composers by language, then open their full song list.
      </p>

      <div className="sp-directors-langs">
        {ALL_LANGUAGES.map((lang) => (
          <button
            key={lang.id}
            type="button"
            className={`sp-chip ${selectedLanguage === lang.id ? 'active' : ''}`}
            onClick={() => setSelectedLanguage(lang.id)}
          >
            <span>{lang.icon}</span> {lang.name}
          </button>
        ))}
      </div>

      <div className="sp-search-input" style={{ marginBottom: 16 }}>
        <Search size={22} color="#121212" strokeWidth={2.5} />
        <input
          type="text"
          placeholder="Search music director..."
          value={composerSearch}
          onChange={(e) => setComposerSearch(e.target.value)}
        />
        {composerSearch && (
          <button type="button" className="sp-search-clear" onClick={() => setComposerSearch('')}>
            <X size={18} />
          </button>
        )}
      </div>

      <p className="sp-results-count" style={{ marginBottom: 12 }}>
        {directors.length} music director{directors.length === 1 ? '' : 's'}
        {selectedLanguage !== 'all' ? ` · ${ALL_LANGUAGES.find((l) => l.id === selectedLanguage)?.name}` : ''}
      </p>

      {directorsByLanguage ? (
        Object.values(directorsByLanguage).map(({ lang, list }) => (
          <section key={lang.id} className="sp-director-lang-block">
            <div className="sp-shelf-head">
              <h2>
                {lang.icon} {lang.name}
              </h2>
              <button type="button" className="sp-chip" onClick={() => setSelectedLanguage(lang.id)}>
                See all
              </button>
            </div>
            <div className="sp-directors-grid">
              {list.map((dir) => (
                <button
                  key={dir.id}
                  type="button"
                  className="sp-director-card"
                  onClick={() => openDirector(dir.name)}
                >
                  <img src={dir.coverUrl} alt="" />
                  <span className="sp-director-card-name">{dir.name}</span>
                  <span className="sp-director-card-tag">{dir.tagline}</span>
                </button>
              ))}
            </div>
          </section>
        ))
      ) : (
        <div className="sp-directors-grid">
          {directors.map((dir) => (
            <button
              key={dir.id}
              type="button"
              className="sp-director-card"
              onClick={() => openDirector(dir.name)}
            >
              <img src={dir.coverUrl} alt="" />
              <span className="sp-director-card-name">{dir.name}</span>
              <span className="sp-director-card-tag">{dir.tagline}</span>
              <span className="sp-director-card-lang">{(dir.language || '').toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}

      {directors.length === 0 && (
        <div className="sp-history-empty">
          <Music2 size={40} color="#b3b3b3" />
          <p>No directors found</p>
          <span>Try another language or name</span>
        </div>
      )}
    </div>
  );
}
