import React, { useState, useEffect, useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext';
import {
  ALL_LANGUAGES,
  DECADE_FILTERS,
  CATEGORY_FILTERS,
  ALL_DIRECTORS,
  filterTracks,
  getDirectorsByLanguage
} from '../data/indianMusicData';
import { searchByLanguageAndDecade, searchSongsFromApi } from '../services/musicApi';
import { getSongCoverUrl } from '../services/phoneStorage';
import {
  Play, Pause, Heart, Clock, Search, Zap, Loader2, Sparkles,
  Music2, RefreshCw, Globe2, Calendar, Filter, ChevronRight, CheckCircle2, Disc
} from 'lucide-react';

export default function LanguagesView() {
  const {
    currentTrack, isPlaying, playTrack, togglePlay,
    likedTrackIds, toggleLike, openTipModal, setActiveView
  } = usePlayer();

  const [selectedLanguage, setSelectedLanguage] = useState('tamil');
  const [selectedDecade, setSelectedDecade] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('songs'); // 'songs' | 'directors'
  const [apiTracks, setApiTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApiMode, setIsApiMode] = useState(false);

  // Pagination (50 songs per page)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 40;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLanguage, selectedDecade, selectedCategory, searchQuery, activeTab]);

  const currentLangObj = useMemo(() => {
    return ALL_LANGUAGES.find(l => l.id === selectedLanguage) || ALL_LANGUAGES[1];
  }, [selectedLanguage]);

  const langDirectors = useMemo(() => {
    return getDirectorsByLanguage(selectedLanguage);
  }, [selectedLanguage]);

  // Fetch real songs for selected language
  useEffect(() => {
    let isMounted = true;
    const fetchLanguageMusic = async () => {
      setIsLoading(true);
      try {
        let results = [];
        if (searchQuery.trim()) {
          results = await searchSongsFromApi(`${searchQuery.trim()} ${selectedLanguage}`, 80);
        } else {
          results = await searchByLanguageAndDecade(
            selectedLanguage,
            selectedDecade,
            selectedCategory,
            80
          );
        }

        if (isMounted) {
          if (results && results.length > 0) {
            setApiTracks(results);
            setIsApiMode(true);
          } else {
            setIsApiMode(false);
          }
        }
      } catch (err) {
        console.warn("Language music fetch note:", err);
        if (isMounted) setIsApiMode(false);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchLanguageMusic, 350);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedLanguage, selectedDecade, selectedCategory, searchQuery]);

  // Combined tracks
  const displayTracks = useMemo(() => {
    if (isApiMode && apiTracks.length > 0) return apiTracks;
    return filterTracks({
      language: selectedLanguage,
      decade: selectedDecade,
      category: selectedCategory,
      searchQuery: searchQuery
    });
  }, [isApiMode, apiTracks, selectedLanguage, selectedDecade, selectedCategory, searchQuery]);

  const totalPages = Math.ceil(displayTracks.length / ITEMS_PER_PAGE) || 1;
  const paginatedTracks = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return displayTracks.slice(start, start + ITEMS_PER_PAGE);
  }, [displayTracks, currentPage]);

  const handlePlayAll = () => {
    if (displayTracks.length > 0) {
      playTrack(displayTracks[0], displayTracks);
    }
  };

  return (
    <div className="view-content" style={{ paddingBottom: 140 }}>
      {/* ═══ Language Hero Banner ═══ */}
      <div
        className="indian-hub-hero"
        style={{
          background: `linear-gradient(135deg, ${currentLangObj.color}22 0%, rgba(18, 18, 20, 0.95) 100%)`,
          borderBottom: `1px solid ${currentLangObj.color}33`
        }}
      >
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <span className="hub-live-badge" style={{ borderColor: currentLangObj.color, color: currentLangObj.color }}>
              <Globe2 size={14} />
              <span>LANGUAGE-WISE MUSIC LIBRARY</span>
            </span>
            <span className="hub-status-badge">
              <span className="hub-status-dot"></span>
              Full Song Streams Active
            </span>
            <span className="hub-count-badge">
              <Music2 size={12} />
              {displayTracks.length}+ Songs Available
            </span>
          </div>

          <h1 className="hub-hero-title">
            <span style={{ marginRight: 10 }}>{currentLangObj.icon}</span>
            {currentLangObj.name} Music Catalog
          </h1>
          <p className="hub-hero-subtitle">
            Explore authentic full-length {currentLangObj.name} tracks, top music directors, album soundtracks, and classic hits with complete audio playback.
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
            <button
              className="hub-spotlight-play"
              onClick={handlePlayAll}
              disabled={displayTracks.length === 0}
              style={{ background: currentLangObj.color }}
            >
              <Play size={16} fill="#fff" />
              <span>Play All {currentLangObj.name} Songs ({displayTracks.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Language Selector Carousel / Grid ═══ */}
      <div style={{ marginBottom: 24 }}>
        <h2 className="section-title" style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Globe2 size={18} color="#FF6B00" />
          Choose Language
        </h2>
        <div className="hub-language-tabs" style={{ gap: 10 }}>
          {ALL_LANGUAGES.filter(l => l.id !== 'all').map(lang => {
            const isSelected = selectedLanguage === lang.id;
            return (
              <button
                key={lang.id}
                className={`hub-lang-tab ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  setSelectedLanguage(lang.id);
                  setSearchQuery('');
                }}
                style={{
                  '--tab-color': lang.color,
                  borderColor: isSelected ? lang.color : 'rgba(255,255,255,0.1)',
                  background: isSelected ? `${lang.color}22` : 'rgba(255,255,255,0.04)'
                }}
              >
                <span className="hub-lang-icon">{lang.icon}</span>
                <span>{lang.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ View Mode Tabs (Songs vs Music Directors) ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          className={`dobby-filter-chip ${activeTab === 'songs' ? 'active' : ''}`}
          onClick={() => setActiveTab('songs')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Music2 size={15} />
          {currentLangObj.name} Songs ({displayTracks.length})
        </button>
        <button
          className={`dobby-filter-chip ${activeTab === 'directors' ? 'active' : ''}`}
          onClick={() => setActiveTab('directors')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Sparkles size={15} />
          {currentLangObj.name} Music Directors ({langDirectors.length})
        </button>
      </div>

      {/* ═══ Tab 1: Music Directors Grid ═══ */}
      {activeTab === 'directors' && (
        <div style={{ marginBottom: 32 }}>
          <div className="hub-directors-grid">
            {langDirectors.map(dir => (
              <div
                key={dir.id}
                className="hub-director-card"
                onClick={() => {
                  // Switch to Indian Hub or Directors view with this composer
                  setActiveTab('songs');
                  setSearchQuery(dir.name);
                }}
                style={{ '--dir-color': dir.color }}
              >
                <div className="hub-director-img-wrap">
                  <img src={dir.coverUrl} alt={dir.name} className="hub-director-img" />
                  <div className="hub-director-lang-badge">{dir.language.toUpperCase()}</div>
                  <button
                    className="hub-director-play"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab('songs');
                      setSearchQuery(dir.name);
                    }}
                  >
                    <Play size={18} fill="#000" style={{ marginLeft: 2 }} />
                  </button>
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <div className="hub-director-name">{dir.name}</div>
                  <div className="hub-director-tagline">{dir.tagline}</div>
                  <p style={{ fontSize: '0.75rem', color: '#a1a1aa', margin: '6px 0 0 0', lineHeight: 1.3 }}>
                    {dir.bio}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Tab 2: Songs Filter & Track List ═══ */}
      {activeTab === 'songs' && (
        <>
          {/* Filter Bar */}
          <div className="hub-filters-row">
            {/* Decades */}
            <div className="hub-filter-group">
              <Calendar size={15} color="#a1a1aa" />
              {DECADE_FILTERS.map(d => (
                <button
                  key={d.id}
                  className={`hub-filter-pill ${selectedDecade === d.id ? 'active' : ''}`}
                  onClick={() => setSelectedDecade(d.id)}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Categories */}
            <div className="hub-filter-group">
              <Filter size={15} color="#a1a1aa" />
              {CATEGORY_FILTERS.map(c => (
                <button
                  key={c.id}
                  className={`hub-filter-pill category ${selectedCategory === c.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="hub-search-bar" style={{ minWidth: 260 }}>
              {isLoading
                ? <Loader2 size={17} color="#FF6B00" className="spin-animation" />
                : <Search size={17} color="#a1a1aa" />
              }
              <input
                type="text"
                placeholder={`Search ${currentLangObj.name} songs, films, singers...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: 4 }}
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Results Header */}
          <div className="hub-results-header">
            <h3 className="section-title" style={{ fontSize: '1.2rem', margin: 0 }}>
              {searchQuery
                ? `🔍 Results for "${searchQuery}" in ${currentLangObj.name} (${displayTracks.length})`
                : `🎵 ${currentLangObj.name} Tracks (${displayTracks.length})`
              }
            </h3>

            {isLoading && (
              <span className="hub-loading-text">
                <Loader2 size={14} className="spin-animation" />
                Loading {currentLangObj.name} Catalog...
              </span>
            )}
          </div>

          {/* Track Table Header */}
          <div className="track-table-header" style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1.5fr 1fr 1fr 80px', padding: '8px 16px', color: '#a1a1aa', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 8 }}>
            <span>#</span>
            <span>TITLE & ARTIST</span>
            <span>ALBUM / FILM</span>
            <span>COMPOSER</span>
            <span>STATUS</span>
            <span style={{ textAlign: 'right' }}><Clock size={14} style={{ display: 'inline' }} /></span>
          </div>

          {/* Track Rows */}
          {paginatedTracks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#a1a1aa' }}>
              <Music2 size={40} style={{ opacity: 0.4, marginBottom: 12 }} />
              <h3>No {currentLangObj.name} songs found</h3>
              <p style={{ fontSize: '0.9rem', maxWidth: 400, margin: '8px auto' }}>
                Try searching for another movie, singer, or composer, or clear your search query.
              </p>
              <button
                className="hub-reset-btn"
                onClick={() => { setSearchQuery(''); setSelectedDecade('all'); setSelectedCategory('all'); }}
                style={{ marginTop: 12 }}
              >
                <RefreshCw size={14} /> Reset Filters
              </button>
            </div>
          ) : (
            <div className="track-table-body">
              {paginatedTracks.map((track, idx) => {
                const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                const isCurrent = currentTrack?.id === track.id || currentTrack?.title === track.title;
                const isLiked = likedTrackIds.includes(track.id);

                return (
                  <div
                    key={track.id || idx}
                    className={`track-table-row ${isCurrent ? 'active' : ''}`}
                    onClick={() => playTrack(track, displayTracks)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 2fr 1.5fr 1fr 1fr 80px',
                      alignItems: 'center',
                      padding: '8px 16px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      gap: 12
                    }}
                  >
                    {/* Index / Play indicator */}
                    <div style={{ color: isCurrent ? '#FF6B00' : '#71717a', fontSize: '0.9rem', fontWeight: 600 }}>
                      {isCurrent && isPlaying ? (
                        <div className="equalizer-bars">
                          <span /><span /><span />
                        </div>
                      ) : (
                        globalIndex
                      )}
                    </div>

                    {/* Title & Cover & Singers */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <img
                        src={getSongCoverUrl(track, '')}
                        alt={track.title}
                        style={{ width: 42, height: 42, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            color: isCurrent ? '#FF6B00' : '#ffffff',
                            fontWeight: 600,
                            fontSize: '0.92rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {track.title}
                        </div>
                        <div
                          style={{
                            color: '#a1a1aa',
                            fontSize: '0.8rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          🎤 {track.singers || track.artist}
                        </div>
                      </div>
                    </div>

                    {/* Album / Film */}
                    <div style={{ color: '#a1a1aa', fontSize: '0.84rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      🎬 {track.album || track.film || 'Film Album'}
                    </div>

                    {/* Composer */}
                    <div style={{ color: '#d4d4d8', fontSize: '0.84rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      🎼 {track.director || track.composer || 'Maestro'}
                    </div>

                    {/* Status Badge */}
                    <div>
                      <span
                        style={{
                          background: 'rgba(34, 197, 94, 0.12)',
                          color: '#22c55e',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          padding: '2px 8px',
                          borderRadius: 9999,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <CheckCircle2 size={11} /> Full HQ
                      </span>
                    </div>

                    {/* Duration & Like Button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(track.id, track);
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
                        title={isLiked ? "Saved in Liked Songs" : "Add to Liked Songs"}
                      >
                        <Heart size={16} fill={isLiked ? "#1db954" : "none"} color={isLiked ? "#1db954" : "#a1a1aa"} />
                      </button>
                      <span style={{ color: '#a1a1aa', fontSize: '0.84rem' }}>{track.duration || '3:30'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 24 }}>
              <button
                className="hub-reset-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="hub-reset-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
