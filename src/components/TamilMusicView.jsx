import React, { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { TAMIL_DIRECTORS, TAMIL_TRACKS } from '../data/tamilTracks';
import { fetchDirectorHitsFromApi, searchSongsFromApi } from '../services/musicApi';
import { getSongCoverUrl } from '../services/phoneStorage';
import { Play, Pause, Heart, Clock, Search, Zap, Loader2, Sparkles, Music2, RefreshCw } from 'lucide-react';

export default function TamilMusicView() {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    likedTrackIds,
    toggleLike,
    openTipModal
  } = usePlayer();

  const [selectedDirector, setSelectedDirector] = useState(null); // null = All Directors
  const [searchQuery, setSearchQuery] = useState('');
  const [apiTracks, setApiTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApiMode, setIsApiMode] = useState(true); // Default to API live tracks

  // Fetch songs from API whenever selectedDirector or searchQuery changes
  useEffect(() => {
    let isMounted = true;
    const fetchMusic = async () => {
      setIsLoading(true);
      try {
        let results = [];
        if (searchQuery.trim()) {
          results = await searchSongsFromApi(`${searchQuery} tamil`, 50);
        } else if (selectedDirector) {
          results = await fetchDirectorHitsFromApi(selectedDirector, 100);
        } else {
          // Fetch a mix of Tamil superhits
          results = await searchSongsFromApi("tamil hits ar rahman anirudh harris ilaiyaraaja", 50);
        }

        if (isMounted) {
          if (results && results.length > 0) {
            setApiTracks(results);
            setIsApiMode(true);
          } else {
            // Fallback to local curated tracks if API fails or yields no results
            setIsApiMode(false);
          }
        }
      } catch (err) {
        console.warn("API Error, using fallback data:", err);
        if (isMounted) setIsApiMode(false);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchMusic, 350);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedDirector, searchQuery]);

  // Combine or select display tracks
  const displayTracks = isApiMode && apiTracks.length > 0
    ? apiTracks
    : TAMIL_TRACKS.filter(track => {
        if (selectedDirector && !track.director?.toLowerCase().includes(selectedDirector.toLowerCase())) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          track.title.toLowerCase().includes(q) ||
          track.artist.toLowerCase().includes(q) ||
          track.album.toLowerCase().includes(q) ||
          track.director.toLowerCase().includes(q)
        );
      });

  const activeDirectorObj = TAMIL_DIRECTORS.find(d => d.name === selectedDirector);

  const handlePlayAll = () => {
    if (displayTracks.length > 0) {
      playTrack(displayTracks[0], displayTracks);
    }
  };

  return (
    <div className="view-content" style={{ paddingBottom: 50 }}>
      {/* Hero Banner */}
      <div className="tamil-hero-banner">
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255, 107, 0, 0.2)', border: '1px solid #FF6B00', color: '#FF6B00', padding: '4px 12px', borderRadius: 9999, fontSize: '0.8rem', fontWeight: 800 }}>
              <Zap size={14} fill="#FF6B00" color="#FF6B00" />
              <span>LIVE INDIAN MUSIC API INTEGRATED</span>
            </div>
            <span style={{ fontSize: '0.78rem', color: '#22c55e', background: 'rgba(34, 197, 94, 0.15)', padding: '4px 10px', borderRadius: 9999, fontWeight: 700 }}>
              ● 100% Full Songs Active
            </span>
          </div>

          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: 8, letterSpacing: '-0.02em' }}>
            All Indian Music Directors & Full Songs 🎵
          </h1>
          <p style={{ color: '#a1a1aa', fontSize: '0.98rem', maxWidth: 720, lineHeight: 1.5 }}>
            Explore music director wise hits across Tamil, Hindi, Telugu & Malayalam. Access songs by <strong>A.R. Rahman</strong>, <strong>Anirudh</strong>, <strong>Pritam</strong>, <strong>M.M. Keeravani</strong>, <strong>Harris Jayaraj</strong>, <strong>Ilaiyaraaja</strong>, <strong>DSP</strong>, and more with 100% full song audio streaming!
          </p>
        </div>
      </div>

      {/* Music Directors Grid */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="section-title">Browse Music Director Wise (இசையமைப்பாளர்)</h2>
          {selectedDirector && (
            <button
              onClick={() => {
                setSelectedDirector(null);
                setSearchQuery('');
              }}
              style={{ background: 'rgba(255,107,0,0.2)', border: '1px solid #FF6B00', color: '#FF6B00', fontSize: '0.8rem', padding: '5px 14px', borderRadius: 9999, cursor: 'pointer', fontWeight: 800 }}
            >
              Reset Director Filter
            </button>
          )}
        </div>

        <div className="directors-grid">
          {TAMIL_DIRECTORS.map(dir => {
            const isSelected = selectedDirector === dir.name;

            return (
              <div
                key={dir.id}
                className={`director-card ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  setSelectedDirector(dir.name);
                  setSearchQuery('');
                }}
              >
                <div className="director-img-wrapper">
                  <img src={dir.coverUrl} alt={dir.name} className="director-img" />
                  <button
                    className="director-play-btn"
                    title={`Fetch & Play ${dir.name} All Hits`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDirector(dir.name);
                      handlePlayAll();
                    }}
                  >
                    <Play size={20} fill="#000" style={{ marginLeft: 2 }} />
                  </button>
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.02rem', color: '#fff' }}>{dir.name}</div>
                  <div style={{ fontSize: '0.78rem', color: '#FF6B00', fontWeight: 700, margin: '2px 0 4px 0' }}>{dir.tagline}</div>
                  <div style={{ fontSize: '0.72rem', color: '#71717a' }}>Click to load API songs</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Director Filter Chips & Live API Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        {/* Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            className={`dobby-filter-chip ${!selectedDirector ? 'active' : ''}`}
            onClick={() => {
              setSelectedDirector(null);
              setSearchQuery('');
            }}
          >
            All Tamil Songs
          </button>
          {TAMIL_DIRECTORS.map(d => (
            <button
              key={d.id}
              className={`dobby-filter-chip ${selectedDirector === d.name ? 'active' : ''}`}
              onClick={() => {
                setSelectedDirector(d.name);
                setSearchQuery('');
              }}
            >
              {d.name}
            </button>
          ))}
        </div>

        {/* Search Input Bar */}
        <div className="search-input-wrapper" style={{ width: 340, margin: 0, position: 'relative' }}>
          {isLoading ? <Loader2 size={18} color="#FF6B00" className="spin-animation" /> : <Search size={18} color="#a1a1aa" />}
          <input
            type="text"
            placeholder="Search any Tamil song, movie, singer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Director Spotlight Header */}
      {activeDirectorObj && (
        <div className="director-spotlight-banner" style={{ backgroundColor: activeDirectorObj.color + '22', border: `1px solid ${activeDirectorObj.color}44` }}>
          <img src={activeDirectorObj.coverUrl} alt={activeDirectorObj.name} className="spotlight-thumb" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: activeDirectorObj.color, fontWeight: 800 }}>MUSIC DIRECTOR SPOTLIGHT</div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900 }}>{activeDirectorObj.name}</h2>
            <p style={{ fontSize: '0.88rem', color: '#d4d4d8', marginTop: 4 }}>{activeDirectorObj.bio}</p>
          </div>
          <button
            className="dobby-action-btn-sm"
            onClick={handlePlayAll}
            style={{ background: 'var(--dobby-gradient)' }}
          >
            <Play size={16} fill="#fff" />
            <span>Play {activeDirectorObj.name} All Songs</span>
          </button>
        </div>
      )}

      {/* Song List Header & Results */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 className="section-title" style={{ fontSize: '1.25rem', margin: 0 }}>
            {searchQuery
              ? `Live API Results for "${searchQuery}"`
              : selectedDirector
              ? `${selectedDirector} Songs (${displayTracks.length})`
              : `All Tamil Hit Songs (${displayTracks.length})`}
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isLoading && (
              <span style={{ fontSize: '0.82rem', color: '#FF6B00', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Loader2 size={14} className="spin-animation" /> Fetching live songs...
              </span>
            )}
            <button
              onClick={handlePlayAll}
              className="dobby-topup-btn"
              style={{ background: '#FF6B00', color: '#fff', border: 'none', padding: '6px 14px' }}
            >
              ▶ Play All
            </button>
          </div>
        </div>

        {/* Songs Table */}
        {displayTracks.length === 0 && !isLoading ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#a1a1aa' }}>
            <Music2 size={40} color="#FF6B00" style={{ marginBottom: 12 }} />
            <h3>No songs found for "{searchQuery || selectedDirector}"</h3>
            <p style={{ fontSize: '0.88rem', color: '#71717a', marginTop: 4 }}>Try searching another Tamil track title, movie name, or music director.</p>
          </div>
        ) : (
          <table className="track-table">
            <thead>
              <tr>
                <th className="track-index-col">#</th>
                <th>Title & Singers</th>
                <th>Movie / Album</th>
                <th>Music Director</th>
                <th>Duration</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayTracks.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id || currentTrack?.title === track.title;
                const isLiked = likedTrackIds.includes(track.id);

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
                      {isCurrent && isPlaying ? "▶" : idx + 1}
                    </td>
                    <td>
                      <div className="track-title-cell">
                        <img src={getSongCoverUrl(track, '')} alt={track.title} className="track-cell-img" />
                        <div>
                          <div className="track-cell-name" style={{ color: isCurrent ? '#FF6B00' : '#fff' }}>
                            {track.title}
                          </div>
                          <div className="track-cell-artist">{track.artist}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#e4e4e7' }}>{track.album}</span>
                    </td>
                    <td>
                      <span className="dobby-director-badge">{track.director}</span>
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
                          title={`Tip ${track.director || track.artist} with DobbyPay`}
                        >
                          <Zap size={13} fill="#FF6B00" color="#FF6B00" />
                          <span>Tip</span>
                        </button>
                        <button
                          className={`like-btn-icon ${isLiked ? 'liked' : ''}`}
                          onClick={() => toggleLike(track.id)}
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
        )}
      </div>
    </div>
  );
}
