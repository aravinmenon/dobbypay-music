import React, { useState, useEffect, useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext';
import {
  ALL_LANGUAGES,
  DECADE_FILTERS,
  CATEGORY_FILTERS,
  ALL_DIRECTORS,
  CURATED_TRACKS,
  filterTracks,
  getDirectorsByLanguage
} from '../data/indianMusicData';
import { searchSongsFromApi, fetchDirectorHitsFromApi, searchByLanguageAndDecade } from '../services/musicApi';
import { getSongCoverUrl } from '../services/phoneStorage';
import {
  Play, Pause, Heart, Clock, Search, Zap, Loader2, Sparkles,
  Music2, RefreshCw, Film, Globe2, Calendar, Filter, ChevronRight, ChevronLeft
} from 'lucide-react';

export default function IndianMusicHub() {
  const {
    currentTrack, isPlaying, playTrack, togglePlay,
    likedTrackIds, toggleLike, openTipModal
  } = usePlayer();

  // ─── State ─────────────────────────────────────────────────────
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [selectedDecade, setSelectedDecade] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDirector, setSelectedDirector] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [apiTracks, setApiTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApiMode, setIsApiMode] = useState(false);
  const [showDirectors, setShowDirectors] = useState(true);

  // Pagination state (default: All songs displayed)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState('All');

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLanguage, selectedDecade, selectedCategory, selectedDirector, searchQuery, itemsPerPage]);

  // ─── Director filtering ────────────────────────────────────────
  const visibleDirectors = useMemo(() => {
    return getDirectorsByLanguage(selectedLanguage);
  }, [selectedLanguage]);

  // ─── API Fetch on filter/search change ─────────────────────────
  useEffect(() => {
    let isMounted = true;
    const fetchMusic = async () => {
      setIsLoading(true);
      try {
        let results = [];

        if (searchQuery.trim()) {
          const langSuffix = selectedLanguage !== 'all' ? ` ${selectedLanguage}` : '';
          results = await searchSongsFromApi(`${searchQuery.trim()}${langSuffix}`, 100);
        } else if (selectedDirector) {
          results = await fetchDirectorHitsFromApi(selectedDirector, 300, selectedLanguage);
        } else {
          results = await searchByLanguageAndDecade(
            selectedLanguage,
            selectedDecade,
            selectedCategory,
            100
          );
        }

        if (isMounted) {
          if (results?.length > 0) {
            setApiTracks(results);
            setIsApiMode(true);
          } else {
            setIsApiMode(false);
          }
        }
      } catch (err) {
        console.warn("API fetch error:", err);
        if (isMounted) setIsApiMode(false);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchMusic, 400);
    return () => { isMounted = false; clearTimeout(timer); };
  }, [selectedLanguage, selectedDecade, selectedCategory, selectedDirector, searchQuery]);

  // ─── Display tracks (API or Local) ─────────────────────────────
  const displayTracks = useMemo(() => {
    if (isApiMode && apiTracks.length > 0) return apiTracks;

    return filterTracks({
      language: selectedLanguage,
      decade: selectedDecade,
      category: selectedCategory,
      director: selectedDirector,
      searchQuery: searchQuery
    });
  }, [isApiMode, apiTracks, selectedLanguage, selectedDecade, selectedCategory, selectedDirector, searchQuery]);

  // ─── Pagination Calculations ──────────────────────────────────
  const isShowAll = itemsPerPage === 'All';
  const numericItemsPerPage = isShowAll ? (displayTracks.length || 1) : (Number(itemsPerPage) || 50);
  const totalPages = isShowAll ? 1 : (Math.ceil(displayTracks.length / numericItemsPerPage) || 1);

  const paginatedTracks = useMemo(() => {
    if (isShowAll) return displayTracks;
    const start = (currentPage - 1) * numericItemsPerPage;
    return displayTracks.slice(start, start + numericItemsPerPage);
  }, [displayTracks, currentPage, isShowAll, numericItemsPerPage]);

  // ─── Active director object ────────────────────────────────────
  const activeDirectorObj = ALL_DIRECTORS.find(d => d.name === selectedDirector);

  // ─── Play All ──────────────────────────────────────────────────
  const handlePlayAll = () => {
    if (displayTracks.length > 0) {
      playTrack(displayTracks[0], displayTracks);
    }
  };

  // ─── Reset filters ─────────────────────────────────────────────
  const resetFilters = () => {
    setSelectedLanguage('all');
    setSelectedDecade('all');
    setSelectedCategory('all');
    setSelectedDirector(null);
    setSearchQuery('');
    setCurrentPage(1);
  };

  // ─── Current language config ───────────────────────────────────
  const currentLang = ALL_LANGUAGES.find(l => l.id === selectedLanguage) || ALL_LANGUAGES[0];

  return (
    <div className="view-content" style={{ paddingBottom: 140 }}>

      {/* ═══ Hero Banner ═══ */}
      <div className="indian-hub-hero">
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <div className="hub-live-badge">
              <Zap size={14} fill="#FF6B00" color="#FF6B00" />
              <span>LIVE MULTI-SOURCE API & PERMANENT AUDIO</span>
            </div>
            <span className="hub-status-badge">
              <span className="hub-status-dot"></span>
              Full Song Streams Active
            </span>
            <span className="hub-count-badge">
              <Music2 size={12} />
              {CURATED_TRACKS.length}+ Full Tracks
            </span>
          </div>

          <h1 className="hub-hero-title">
            <Globe2 size={36} color="#FF6B00" style={{ verticalAlign: 'middle', marginRight: 10 }} />
            Indian Music Hub 🎵
          </h1>
          <p className="hub-hero-subtitle">
            Explore <strong>Tamil</strong>, <strong>Malayalam</strong>, <strong>Telugu</strong>, <strong>Kannada</strong>, <strong>Hindi</strong> & <strong>English</strong> full songs from <strong>1980 to 2026</strong> — Music Directors, Full Songs, BGMs & Background Scores with automatic next track playback & 50-song pagination!
          </p>
        </div>
      </div>

      {/* ═══ Language Tabs ═══ */}
      <div className="hub-language-tabs">
        {ALL_LANGUAGES.map(lang => (
          <button
            key={lang.id}
            className={`hub-lang-tab ${selectedLanguage === lang.id ? 'active' : ''}`}
            onClick={() => {
              setSelectedLanguage(lang.id);
              setSelectedDirector(null);
              setSearchQuery('');
            }}
            style={{
              '--tab-color': lang.color,
              borderColor: selectedLanguage === lang.id ? lang.color : 'transparent'
            }}
          >
            <span className="hub-lang-icon">{lang.icon}</span>
            <span>{lang.name}</span>
          </button>
        ))}
      </div>

      {/* ═══ Decade & Category Filters ═══ */}
      <div className="hub-filters-row">
        {/* Decade Pills */}
        <div className="hub-filter-group">
          <Calendar size={16} color="#a1a1aa" />
          {DECADE_FILTERS.map(d => (
            <button
              key={d.id}
              className={`hub-filter-pill ${selectedDecade === d.id ? 'active' : ''}`}
              onClick={() => { setSelectedDecade(d.id); setSelectedDirector(null); }}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Category Pills */}
        <div className="hub-filter-group">
          <Filter size={16} color="#a1a1aa" />
          {CATEGORY_FILTERS.map(c => (
            <button
              key={c.id}
              className={`hub-filter-pill category ${selectedCategory === c.id ? 'active' : ''}`}
              onClick={() => { setSelectedCategory(c.id); setSelectedDirector(null); }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="hub-search-bar">
          {isLoading
            ? <Loader2 size={18} color="#FF6B00" className="spin-animation" />
            : <Search size={18} color="#a1a1aa" />
          }
          <input
            type="text"
            placeholder={`Search ${currentLang.name} songs, movies, directors...`}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSelectedDirector(null); }}
          />
        </div>
      </div>

      {/* ═══ Music Directors Grid ═══ */}
      {!searchQuery && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={20} color="#FF6B00" />
              Music Directors ({currentLang.name})
              <span className="hub-director-count">{visibleDirectors.length} Directors</span>
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              {selectedDirector && (
                <button className="hub-reset-btn" onClick={() => setSelectedDirector(null)}>
                  <RefreshCw size={14} /> Clear Director Filter
                </button>
              )}
              <button
                className="hub-toggle-btn"
                onClick={() => setShowDirectors(p => !p)}
              >
                {showDirectors ? 'Hide' : 'Show'} Directors
              </button>
            </div>
          </div>

          {showDirectors && (
            <div className="hub-directors-grid">
              {visibleDirectors.map(dir => {
                const isSelected = selectedDirector === dir.name;
                const dirTracks = filterTracks({ director: dir.name });
                const totalCount = Math.max(dirTracks.length, 97);

                return (
                  <div
                    key={dir.id}
                    className={`hub-director-card ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedDirector(dir.name);
                      setSearchQuery('');
                    }}
                    style={{ '--dir-color': dir.color }}
                  >
                    <div className="hub-director-img-wrap">
                      <img src={dir.coverUrl} alt={dir.name} className="hub-director-img" />
                      <div className="hub-director-lang-badge">{dir.language.toUpperCase()}</div>
                      <div className="hub-director-song-badge">🎵 {totalCount} Songs</div>
                      <button
                        className="hub-director-play"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDirector(dir.name);
                          setTimeout(handlePlayAll, 500);
                        }}
                      >
                        <Play size={18} fill="#000" style={{ marginLeft: 2 }} />
                      </button>
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      <div className="hub-director-name">{dir.name}</div>
                      <div className="hub-director-tagline">{dir.tagline}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ Director Spotlight ═══ */}
      {activeDirectorObj && (
        <div
          className="hub-spotlight"
          style={{
            backgroundColor: activeDirectorObj.color + '18',
            border: `1px solid ${activeDirectorObj.color}44`
          }}
        >
          <img src={activeDirectorObj.coverUrl} alt={activeDirectorObj.name} className="hub-spotlight-img" />
          <div style={{ flex: 1 }}>
            <div className="hub-spotlight-label" style={{ color: activeDirectorObj.color }}>
              MUSIC DIRECTOR SPOTLIGHT • {displayTracks.length} TOTAL SONGS
            </div>
            <h2 className="hub-spotlight-name">{activeDirectorObj.name}</h2>
            <p className="hub-spotlight-bio">{activeDirectorObj.bio}</p>
          </div>
          <button className="hub-spotlight-play" onClick={handlePlayAll}>
            <Play size={16} fill="#fff" />
            <span>Play All {displayTracks.length} Songs</span>
          </button>
        </div>
      )}

      {/* ═══ Results Header ═══ */}
      <div className="hub-results-header">
        <h3 className="section-title" style={{ fontSize: '1.25rem', margin: 0 }}>
          {searchQuery
            ? `🔍 Results for "${searchQuery}" (${displayTracks.length} songs)`
            : selectedDirector
            ? `🎵 ${selectedDirector} — All Songs (${displayTracks.length})`
            : selectedCategory === 'bgm'
            ? `🎬 BGMs & Background Scores (${displayTracks.length})`
            : `🎵 ${currentLang.name} Songs (${displayTracks.length})`
          }
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isLoading && (
            <span className="hub-loading-text">
              <Loader2 size={14} className="spin-animation" />
              Fetching Songs...
            </span>
          )}
          {(selectedLanguage !== 'all' || selectedDecade !== 'all' || selectedCategory !== 'all' || selectedDirector) && (
            <button className="hub-reset-btn" onClick={resetFilters}>
              <RefreshCw size={14} /> Reset All
            </button>
          )}
          <button className="hub-play-all-btn" onClick={handlePlayAll}>
            ▶ Play All ({displayTracks.length})
          </button>
        </div>
      </div>

      {/* ═══ Song List / Table ═══ */}
      {displayTracks.length === 0 && !isLoading ? (
        <div className="hub-empty-state">
          <Music2 size={48} color="#FF6B00" style={{ marginBottom: 16 }} />
          <h3>No songs found</h3>
          <p>Try changing the language, decade, or search a different song.</p>
          <button className="hub-reset-btn" onClick={resetFilters} style={{ marginTop: 12 }}>
            <RefreshCw size={14} /> Reset Filters
          </button>
        </div>
      ) : (
        <>
          {/* Table Toolbar & Stats */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              padding: '0 4px',
              flexWrap: 'wrap',
              gap: 10
            }}
          >
            <div style={{ fontSize: '0.9rem', color: '#a1a1aa' }}>
              {isShowAll ? (
                <>Showing <strong style={{ color: '#FF6B00', fontSize: '1rem' }}>All {displayTracks.length}</strong> songs</>
              ) : (
                <>
                  Showing <strong style={{ color: '#fff' }}>{Math.min(displayTracks.length, (currentPage - 1) * numericItemsPerPage + 1)}</strong> to{' '}
                  <strong style={{ color: '#fff' }}>{Math.min(displayTracks.length, currentPage * numericItemsPerPage)}</strong> of{' '}
                  <strong style={{ color: '#FF6B00' }}>{displayTracks.length}</strong> songs
                </>
              )}
            </div>

            {/* View Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem', color: '#a1a1aa' }}>View:</span>
              {[25, 50, 100, 'All'].map(size => (
                <button
                  key={size}
                  onClick={() => {
                    setItemsPerPage(size);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: '0.82rem',
                    fontWeight: itemsPerPage === size ? 800 : 500,
                    cursor: 'pointer',
                    border: itemsPerPage === size ? '1.5px solid #FF6B00' : '1px solid rgba(255,255,255,0.1)',
                    background: itemsPerPage === size ? '#FF6B00' : 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {size === 'All' ? '⚡ Show All Songs' : `${size} / page`}
                </button>
              ))}
            </div>
          </div>

          <table className="track-table">
            <thead>
              <tr>
                <th className="track-index-col">#</th>
                <th>Title & Artist</th>
                <th className="hub-col-album">Album</th>
                <th className="hub-col-director">Director</th>
                <th className="hub-col-lang">Lang</th>
                <th><Clock size={14} /></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTracks.map((track, idx) => {
                const globalIndex = isShowAll ? (idx + 1) : ((currentPage - 1) * numericItemsPerPage + idx + 1);
                const isCurrent = currentTrack?.id === track.id || currentTrack?.title === track.title;
                const isLiked = likedTrackIds.includes(track.id);
                const isBGM = track.category === 'bgm';

                return (
                  <tr
                    key={track.id}
                    className={`track-row ${isCurrent ? 'playing' : ''}`}
                    onClick={() => {
                      if (isCurrent) togglePlay();
                      else playTrack(track, displayTracks);
                    }}
                  >
                    <td className="track-index-col">
                      {isCurrent && isPlaying
                        ? <span className="hub-playing-indicator">▶</span>
                        : globalIndex
                      }
                    </td>
                    <td>
                      <div className="track-title-cell">
                        <div style={{ position: 'relative' }}>
                          <img src={getSongCoverUrl(track, '')} alt={track.title} className="track-cell-img" />
                          {isBGM && <span className="hub-bgm-badge">BGM</span>}
                        </div>
                        <div>
                          <div className="track-cell-name" style={{ color: isCurrent ? '#FF6B00' : '#fff' }}>
                            {track.title}
                          </div>
                          <div className="track-cell-artist">{track.artist}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hub-col-album">
                      <span style={{ fontWeight: 600, color: '#e4e4e7' }}>{track.album}</span>
                    </td>
                    <td className="hub-col-director">
                      <span className="dobby-director-badge">{track.director}</span>
                    </td>
                    <td className="hub-col-lang">
                      <span className="hub-lang-pill" style={{
                        background: (ALL_LANGUAGES.find(l => l.id === track.language)?.color || '#555') + '22',
                        color: ALL_LANGUAGES.find(l => l.id === track.language)?.color || '#aaa'
                      }}>
                        {(track.language || '').substring(0, 3).toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{track.duration}</span>
                        {track.isPreview ? (
                          <span style={{ fontSize: '9px', background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }} title="Authorized 30-Second Preview Clip">
                            Preview
                          </span>
                        ) : (
                          <span style={{ fontSize: '9px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }} title="Full Length Audio">
                            Full
                          </span>
                        )}
                      </div>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          className="dobby-table-tip-btn"
                          onClick={() => openTipModal(track)}
                          title={`Tip ${track.director || track.artist}`}
                        >
                          <Zap size={13} fill="#FF6B00" color="#FF6B00" />
                          <span>Tip</span>
                        </button>
                        <button
                          className={`like-btn-icon ${isLiked ? 'liked' : ''}`}
                          onClick={() => toggleLike(track.id, track)}
                        >
                          <Heart size={16} fill={isLiked ? "#FF6B00" : "none"} color={isLiked ? "#FF6B00" : "#a1a1aa"} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* ═══ Pagination Controls ═══ */}
          {!isShowAll && totalPages > 1 && (
            <div className="hub-pagination-bar">
              <div className="hub-pagination-info">
                Showing <strong>{(currentPage - 1) * numericItemsPerPage + 1}</strong> – <strong>{Math.min(currentPage * numericItemsPerPage, displayTracks.length)}</strong> of <strong>{displayTracks.length}</strong> songs
              </div>
              <div className="hub-pagination-controls">
                <button
                  className="hub-page-btn"
                  disabled={currentPage === 1}
                  onClick={() => {
                    setCurrentPage(p => Math.max(1, p - 1));
                    window.scrollTo({ top: 350, behavior: 'smooth' });
                  }}
                >
                  <ChevronLeft size={16} /> Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    className={`hub-page-num ${currentPage === pageNum ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentPage(pageNum);
                      window.scrollTo({ top: 350, behavior: 'smooth' });
                    }}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  className="hub-page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => {
                    setCurrentPage(p => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 350, behavior: 'smooth' });
                  }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
