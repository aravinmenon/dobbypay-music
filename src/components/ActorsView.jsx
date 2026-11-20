import React, { useState, useEffect, useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { ALL_ACTORS, ALL_LANGUAGES, CURATED_TRACKS, getActorsByLanguage } from '../data/indianMusicData';
import { dedupeTracksBySong, fetchActorHitsFromApi } from '../services/musicApi';
import { getSongCoverUrl } from '../services/phoneStorage';
import {
  Play, Pause, Heart, Search, Loader2, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Music2, X
} from 'lucide-react';

const PAGE_SIZE = 20;

export default function ActorsView() {
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
  const [actorSearch, setActorSearch] = useState('');
  const [selectedActor, setSelectedActor] = useState(() => {
    try {
      const pending = sessionStorage.getItem('open_actor_name');
      if (pending) {
        sessionStorage.removeItem('open_actor_name');
        return pending;
      }
    } catch (_) {}
    return null;
  });
  const [actorTracks, setActorTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [songSearch, setSongSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const actors = useMemo(() => {
    const base = getActorsByLanguage(selectedLanguage);
    const q = actorSearch.trim().toLowerCase();
    if (!q) return base;
    return base.filter((a) =>
      a.name.toLowerCase().includes(q) ||
      (a.tagline || '').toLowerCase().includes(q) ||
      (a.language || '').toLowerCase().includes(q)
    );
  }, [selectedLanguage, actorSearch]);

  const actorsByLanguage = useMemo(() => {
    if (selectedLanguage !== 'all' || actorSearch.trim()) return null;
    const groups = {};
    ALL_LANGUAGES.filter((l) => l.id !== 'all').forEach((lang) => {
      const list = ALL_ACTORS.filter((a) => a.language === lang.id);
      if (list.length) groups[lang.id] = { lang, list };
    });
    return groups;
  }, [selectedLanguage, actorSearch]);

  const activeActor = useMemo(
    () => ALL_ACTORS.find((a) => a.name === selectedActor) || null,
    [selectedActor]
  );

  useEffect(() => {
    if (!selectedActor || !activeActor) {
      setActorTracks([]);
      return;
    }
    let mounted = true;
    setIsLoading(true);
    setSongSearch('');
    setCurrentPage(1);

    const needle = selectedActor.toLowerCase();
    const localHits = CURATED_TRACKS.filter((t) => {
      const hay = `${t.title || ''} ${t.artist || ''} ${t.album || ''} ${t.film || ''}`.toLowerCase();
      return hay.includes(needle.split(' ')[0]) || hay.includes(needle);
    });
    const uniqueLocal = dedupeTracksBySong(localHits);
    if (uniqueLocal.length) setActorTracks(uniqueLocal);

    fetchActorHitsFromApi(
      selectedActor,
      500,
      selectedLanguage === 'all' ? activeActor.language : selectedLanguage,
      activeActor.searchQuery
    )
      .then((tracks) => {
        if (!mounted) return;
        const merged = dedupeTracksBySong([...(tracks || []), ...localHits]);
        merged.sort((a, b) => {
          const aFull = a.audioUrl && !a.isPreview ? 1 : 0;
          const bFull = b.audioUrl && !b.isPreview ? 1 : 0;
          return bFull - aFull;
        });
        setActorTracks(merged);
      })
      .catch(() => {
        if (mounted && uniqueLocal.length) setActorTracks(uniqueLocal);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedActor, selectedLanguage, activeActor?.language, activeActor?.searchQuery]);

  const filteredSongs = useMemo(() => {
    const q = songSearch.trim().toLowerCase();
    if (!q) return actorTracks;
    return actorTracks.filter((t) => {
      const hay = `${t.title || ''} ${t.artist || ''} ${t.album || ''} ${t.singers || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [actorTracks, songSearch]);

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
  }, [currentPage, selectedActor]);

  const openActor = (name) => {
    setSelectedActor(name);
    setCurrentPage(1);
    setSongSearch('');
    setIsLoading(true);
    setActorTracks([]);
  };

  const backToActors = () => {
    setSelectedActor(null);
    setActorTracks([]);
    setSongSearch('');
    setCurrentPage(1);
    setIsLoading(false);
  };

  const pageStart = filteredSongs.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, filteredSongs.length);

  if (activeActor) {
    return (
      <div className="view-content sp-directors-page">
        <div className="sp-director-detail-top">
          <button type="button" className="sp-settings-back" onClick={backToActors} aria-label="Back">
            <ChevronLeft size={28} />
          </button>
          <div className="sp-search-input sp-search-input--compact">
            {isLoading ? (
              <Loader2 size={20} className="spin-animation" color="#121212" />
            ) : (
              <Search size={20} color="#121212" strokeWidth={2.5} />
            )}
            <input
              type="text"
              placeholder={`Search ${activeActor.name} songs...`}
              value={songSearch}
              onChange={(e) => setSongSearch(e.target.value)}
            />
            {songSearch && (
              <button type="button" className="sp-search-clear" onClick={() => setSongSearch('')}>
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        <div
          className="sp-director-hero"
          style={{ background: `linear-gradient(135deg, ${activeActor.color}55, rgba(18,18,18,0.95))` }}
        >
          <img src={activeActor.coverUrl} alt="" className="sp-director-hero-img" />
          <div className="sp-director-hero-text">
            <span className="sp-director-hero-lang">{(activeActor.language || '').toUpperCase()} ACTOR</span>
            <h1>{activeActor.name}</h1>
            <p>{activeActor.tagline}</p>
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
            <p>Fetching actor songs from catalog…</p>
            <span>This can take a few seconds for big stars</span>
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
                  src={getSongCoverUrl(track, activeActor.coverUrl)}
                  alt=""
                  className="sp-song-cover"
                  loading="lazy"
                />
                <div className="sp-song-meta">
                  <span className="sp-song-title">{track.title}</span>
                  <span className="sp-song-artist">
                    {track.artist || track.singers || activeActor.name}
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
            <button type="button" className="sp-page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(1)} title="First page">
              <ChevronsLeft size={16} />
            </button>
            <button type="button" className="sp-page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
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
            <button type="button" className="sp-page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
              Next
              <ChevronRight size={16} />
            </button>
            <button type="button" className="sp-page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} title="Last page">
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

  return (
    <div className="view-content sp-directors-page">
      <div className="sp-search-header">
        <button type="button" className="sp-home-avatar" onClick={toggleSidebar} aria-label="Open profile">
          {avatarLetter}
        </button>
        <h1 className="sp-search-title">Actors</h1>
        <button type="button" className="sp-settings-back" onClick={() => setActiveView('home')} aria-label="Home">
          <ChevronLeft size={26} />
        </button>
      </div>

      <p className="sp-directors-lead">
        Browse all actors by language, then open their full song list (20 per page).
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
          placeholder="Search actor..."
          value={actorSearch}
          onChange={(e) => setActorSearch(e.target.value)}
        />
        {actorSearch && (
          <button type="button" className="sp-search-clear" onClick={() => setActorSearch('')}>
            <X size={18} />
          </button>
        )}
      </div>

      <p className="sp-results-count" style={{ marginBottom: 12 }}>
        {actors.length} actor{actors.length === 1 ? '' : 's'}
        {selectedLanguage !== 'all' ? ` · ${ALL_LANGUAGES.find((l) => l.id === selectedLanguage)?.name}` : ''}
      </p>

      {actorsByLanguage ? (
        Object.values(actorsByLanguage).map(({ lang, list }) => (
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
              {list.map((actor) => (
                <button
                  key={actor.id}
                  type="button"
                  className="sp-director-card"
                  onClick={() => openActor(actor.name)}
                >
                  <img src={actor.coverUrl} alt="" />
                  <span className="sp-director-card-name">{actor.name}</span>
                  <span className="sp-director-card-tag">{actor.tagline}</span>
                </button>
              ))}
            </div>
          </section>
        ))
      ) : (
        <div className="sp-directors-grid">
          {actors.map((actor) => (
            <button
              key={actor.id}
              type="button"
              className="sp-director-card"
              onClick={() => openActor(actor.name)}
            >
              <img src={actor.coverUrl} alt="" />
              <span className="sp-director-card-name">{actor.name}</span>
              <span className="sp-director-card-tag">{actor.tagline}</span>
              <span className="sp-director-card-lang">{(actor.language || '').toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}

      {actors.length === 0 && (
        <div className="sp-history-empty">
          <Music2 size={40} color="#b3b3b3" />
          <p>No actors found</p>
          <span>Try another language or name</span>
        </div>
      )}
    </div>
  );
}
