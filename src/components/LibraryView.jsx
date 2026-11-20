import React, { useState, useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext';
import {
  Heart, Plus, Play, Pause, Search, ArrowUpDown, Grid, List,
  Pin, Sparkles, Music, CheckCircle2, ChevronRight, X, ChevronLeft,
  Shuffle, ArrowDownCircle, MoreHorizontal, MinusCircle, Check
} from 'lucide-react';
import { CURATED_TRACKS } from '../data/indianMusicData';
import { getSongCoverUrl } from '../services/phoneStorage';

export default function LibraryView() {
  const {
    tracks,
    likedTrackIds,
    likedTracksData,
    userPlaylists,
    createPlaylistWithTracks,
    navigateToPlaylist,
    activeView,
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    toggleLike,
    setActiveView,
    toggleSidebar,
    currentUser,
    playAllSongs,
    setShowThemeModal,
    setSearchQuery,
    recentlyPlayedTracks,
  } = usePlayer();

  const avatarLetter = (currentUser?.name || currentUser?.username || 'A').charAt(0).toUpperCase();

  // Selected filter pill
  const [selectedPill, setSelectedPill] = useState('All'); // 'All' | 'Playlists' | 'Podcasts' | 'Albums' | 'Artists'
  const [isGridView, setIsGridView] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  // Mobile Liked Songs & Tidy Up states (Screenshots 2 & 3 match)
  const [showTidyUp, setShowTidyUp] = useState(false);
  const [tidyUpTab, setTidyUpTab] = useState('last_played'); // 'last_played' | 'most_skipped'
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [isEnhanced, setIsEnhanced] = useState(false);
  const [selectedTidyIds, setSelectedTidyIds] = useState(new Set());

  // Built-in curated playlists matching user's exact Spotify library
  const defaultSpotifyPlaylists = useMemo(() => [
    {
      id: 'pl-ajith-hits',
      title: 'Ajith evergreen hits 💖✨',
      subtitle: 'Playlist • Gobi sekar',
      type: 'playlist',
      coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
      trackQuery: 'Ajith Tamil Hits'
    },
    {
      id: 'pl-trending-tamil',
      title: 'Trending Now Tamil',
      subtitle: 'Playlist • Spotify',
      type: 'playlist',
      coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=400&q=80',
      trackQuery: 'Trending Tamil Songs'
    },
    {
      id: 'pl-yuvan-hits',
      title: 'Yuvan All Songs ❤️‍🩹',
      subtitle: 'Playlist • G O K U L',
      type: 'playlist',
      coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=400&q=80',
      trackQuery: 'Yuvan Shankar Raja Hits'
    },
    {
      id: 'pl-trending-telugu',
      title: 'Trending Now Telugu',
      subtitle: 'Playlist • Spotify',
      type: 'playlist',
      coverUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=400&q=80',
      trackQuery: 'Trending Telugu Songs'
    },
    {
      id: 'pl-og-hindi',
      title: 'They Call Him OG (Hindi) [Original Motion Picture Soundtrack]',
      subtitle: 'Album • Thaman S',
      type: 'album',
      coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80',
      trackQuery: 'OG Thaman S'
    }
  ], []);

  // Liked tracks pool
  const likedTracks = useMemo(() => {
    const stored = (likedTracksData || []).filter(t => likedTrackIds.includes(t.id));
    const otherLiked = [...tracks, ...CURATED_TRACKS].filter(
      t => likedTrackIds.includes(t.id) && !stored.some(s => s.id === t.id)
    );
    return [...stored, ...otherLiked];
  }, [tracks, likedTrackIds, likedTracksData]);

  const isLikedPlaying = isPlaying && likedTracks.some(t => t.id === currentTrack?.id);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      createPlaylistWithTracks(newPlaylistName.trim(), "Custom Playlist", null, []);
      setNewPlaylistName('');
      setShowCreateModal(false);
    }
  };

  const handlePlaylistClick = (item) => {
    if (item.id === 'liked-songs') {
      setActiveView('liked');
      return;
    }
    // Built-in library cards open a dedicated search results page (not scroll-down)
    if (item.trackQuery) {
      setSearchQuery(item.trackQuery);
      setActiveView('search');
      return;
    }
    if (item.id && userPlaylists.some((p) => p.id === item.id)) {
      navigateToPlaylist(item.id);
      return;
    }
    if (item.id && (item.type === 'playlist' || String(item.id).startsWith('pl-'))) {
      setSearchQuery(item.title || 'playlist');
      setActiveView('search');
      return;
    }
    const playlistTracks = CURATED_TRACKS.slice(0, 10);
    playTrack(playlistTracks[0], playlistTracks);
  };

  // ─── 2. TIDY UP SCREEN (SCREENSHOT 3 MATCH) ───
  if (activeView === 'liked' && showTidyUp) {
    const handleToggleSelectTidy = (id) => {
      setSelectedTidyIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    };

    const handleSelectAllTidy = () => {
      if (selectedTidyIds.size === likedTracks.length) {
        setSelectedTidyIds(new Set());
      } else {
        setSelectedTidyIds(new Set(likedTracks.map(t => t.id)));
      }
    };

    const handleRemoveSelected = () => {
      selectedTidyIds.forEach(id => {
        const track = likedTracks.find(t => t.id === id);
        if (track) toggleLike(id, track);
      });
      setSelectedTidyIds(new Set());
    };

    return (
      <div className="view-content spotify-tidyup-view" style={{ padding: '0 0 160px 0', background: '#121212', minHeight: 0, height: '100%', overflowY: 'auto' }}>
        {/* Top Header Bar with Close X */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setShowTidyUp(false)}
            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 4, display: 'flex' }}
            title="Close Tidy Up"
          >
            <X size={26} color="#ffffff" />
          </button>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>Tidy Up</span>
          <div style={{ width: 26 }} />
        </div>

        {/* Title & Count */}
        <div style={{ padding: '24px 20px 16px 20px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 6px 0', color: '#ffffff', letterSpacing: '-0.02em' }}>
            Liked Songs
          </h1>
          <span style={{ fontSize: '0.85rem', color: '#888888', fontWeight: 600 }}>
            {likedTracks.length} Songs
          </span>

          {/* Filter Pills: Last Played & Most Skipped */}
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button
              onClick={() => setTidyUpTab('last_played')}
              style={{
                background: tidyUpTab === 'last_played' ? '#222222' : 'transparent',
                border: tidyUpTab === 'last_played' ? '1px solid #ffffff' : '1px solid #444444',
                color: '#ffffff',
                borderRadius: 20,
                padding: '6px 18px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Last Played
            </button>
            <button
              onClick={() => setTidyUpTab('most_skipped')}
              style={{
                background: tidyUpTab === 'most_skipped' ? '#222222' : 'transparent',
                border: tidyUpTab === 'most_skipped' ? '1px solid #ffffff' : '1px solid #444444',
                color: '#ffffff',
                borderRadius: 20,
                padding: '6px 18px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Most Skipped
            </button>
          </div>
        </div>

        {/* Songs List with Circle Minus Removal Icon */}
        <div style={{ padding: '0 16px' }}>
          {likedTracks.map((t, idx) => {
            const isSelected = selectedTidyIds.has(t.id);
            return (
              <div
                key={t.id || idx}
                onClick={() => handleToggleSelectTidy(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '10px 8px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(255,255,255,0.08)' : 'transparent',
                  transition: 'background 0.15s'
                }}
              >
                <img
                  src={getSongCoverUrl(t, '')}
                  alt={t.title}
                  style={{ width: 48, height: 48, borderRadius: 4, objectFit: 'cover' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.96rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#a7a7a7', fontSize: '0.8rem', marginTop: 3 }}>
                    {/* Small Green Download Arrow Icon */}
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: '50%', background: '#1db954', color: '#000000', fontSize: '0.62rem', fontWeight: 900, flexShrink: 0 }}>
                      ↓
                    </span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.album ? `${t.album} . ` : ''}{t.singers || t.artist}
                    </span>
                  </div>
                </div>

                {/* Circle Minus Button on Right to Remove Song */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(t.id, t);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer',
                    padding: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.85
                  }}
                  title="Remove from Liked Songs"
                >
                  <MinusCircle size={22} color="#ffffff" strokeWidth={1.8} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Fixed Bottom Action Bar */}
        <div
          style={{
            position: 'fixed',
            bottom: 60,
            left: 0,
            right: 0,
            height: 60,
            background: '#181818',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            zIndex: 100
          }}
        >
          <button
            onClick={handleSelectAllTidy}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {selectedTidyIds.size === likedTracks.length ? 'Deselect All' : 'Select All'}
          </button>

          <button
            onClick={handleRemoveSelected}
            style={{
              background: 'none',
              border: 'none',
              color: selectedTidyIds.size > 0 ? '#ff4d4d' : '#ffffff',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {selectedTidyIds.size > 0 ? `Remove (${selectedTidyIds.size})` : 'Select'}
          </button>
        </div>
      </div>
    );
  }

  // ─── 3. LIKED SONGS SCREEN (SCREENSHOT 2 MATCH) ───
  if (activeView === 'liked') {
    const genrePills = ['Chill', 'EDM', 'Rap', 'Pop', 'Folk', 'Indie', 'Classic'];
    const filteredTracks = selectedGenre === 'All'
      ? likedTracks
      : likedTracks.filter(t => (t.genre || '').toLowerCase().includes(selectedGenre.toLowerCase()));
    const displayTracks = filteredTracks.length > 0 ? filteredTracks : likedTracks;

    return (
      <div className="view-content spotify-liked-view" style={{ padding: '0 0 160px 0', minHeight: 0, height: '100%', background: '#121212', overflowY: 'auto' }}>
        {/* Top Header with Blue/Indigo Spotify Gradient */}
        <div
          style={{
            background: 'linear-gradient(180deg, #1d2d85 0%, #111b47 50%, #121212 100%)',
            padding: '24px 20px 16px 20px'
          }}
        >
          {/* Back Chevron */}
          <button
            onClick={() => setActiveView('home')}
            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 0, marginBottom: 18, display: 'flex' }}
            title="Back to Home"
          >
            <ChevronLeft size={30} color="#ffffff" />
          </button>

          {/* Title & Count */}
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, margin: '0 0 4px 0', color: '#ffffff', letterSpacing: '-0.02em' }}>
            Liked Songs
          </h1>
          <div style={{ color: '#a7a7a7', fontSize: '0.85rem', fontWeight: 600, marginBottom: 20 }}>
            {displayTracks.length} Songs
          </div>

          {/* Action Row: Enhance, Download, Shuffle, Big Play */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Enhance Pill Button with Sparkle */}
              <button
                onClick={() => setIsEnhanced(p => !p)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: isEnhanced ? '1px solid #1db954' : '1px solid rgba(255,255,255,0.25)',
                  background: isEnhanced ? 'rgba(29,185,84,0.15)' : 'transparent',
                  color: isEnhanced ? '#1db954' : '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Sparkles size={14} color={isEnhanced ? '#1db954' : '#ffffff'} />
                <span>Enhance</span>
              </button>

              {/* Green Download Circle */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#1db954',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Downloaded to Phone Storage"
              >
                <span style={{ color: '#000000', fontSize: '0.9rem', fontWeight: 900 }}>↓</span>
              </div>
            </div>

            {/* Right: Green Shuffle + Big Green Play */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                onClick={() => {
                  const shuffled = [...displayTracks].sort(() => Math.random() - 0.5);
                  if (shuffled.length > 0) playTrack(shuffled[0], shuffled);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                title="Shuffle Liked Songs"
              >
                <Shuffle size={22} color="#1db954" strokeWidth={2.4} />
              </button>

              <button
                onClick={() => {
                  if (isLikedPlaying) togglePlay();
                  else if (displayTracks.length > 0) playTrack(displayTracks[0], displayTracks);
                }}
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  background: '#1db954',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                  transition: 'transform 0.1s'
                }}
                title={isLikedPlaying ? "Pause" : "Play"}
              >
                {isLikedPlaying ? (
                  <Pause size={24} fill="#000000" color="#000000" />
                ) : (
                  <Play size={24} fill="#000000" color="#000000" style={{ marginLeft: 3 }} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Genre Tag Pills */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: '16px 20px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {genrePills.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(prev => (prev === genre ? 'All' : genre))}
              style={{
                borderRadius: 20,
                padding: '6px 16px',
                fontSize: '0.8rem',
                fontWeight: 700,
                border: selectedGenre === genre ? '1px solid #1db954' : '1px solid rgba(255,255,255,0.18)',
                background: selectedGenre === genre ? '#1db954' : '#222222',
                color: selectedGenre === genre ? '#000000' : '#ffffff',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* + Add Songs & Tidy Up Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 14px 20px' }}>
          {/* + Add Songs */}
          <div
            onClick={() => setActiveView('search')}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                border: '1.5px solid rgba(255,255,255,0.3)',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Plus size={18} color="#ffffff" />
            </div>
            <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.95rem' }}>Add Songs</span>
          </div>

          {/* Tidy Up Button */}
          <button
            onClick={() => setShowTidyUp(true)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.35)',
              borderRadius: 20,
              padding: '5px 14px',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Tidy Up
          </button>
        </div>

        {/* Song Listing Rows (Exact Screenshot 2 Format) */}
        <div style={{ padding: '0 16px' }}>
          {displayTracks.map((t, idx) => {
            const isCurrent = currentTrack?.id === t.id;
            return (
              <div
                key={t.id || idx}
                onClick={() => playTrack(t, displayTracks)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 8px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: isCurrent ? 'rgba(255,255,255,0.06)' : 'transparent',
                  transition: 'background 0.15s'
                }}
              >
                {/* Album Cover Thumbnail */}
                <img
                  src={getSongCoverUrl(t, '')}
                  alt={t.title}
                  style={{ width: 48, height: 48, borderRadius: 4, objectFit: 'cover' }}
                />

                {/* Song Meta (Title + Green Download Icon + Film/Artist) */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: isCurrent ? '#1db954' : '#ffffff', fontWeight: 700, fontSize: '0.96rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#a7a7a7', fontSize: '0.8rem', marginTop: 3 }}>
                    {/* Small Green Download Arrow Icon */}
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: '50%', background: '#1db954', color: '#000000', fontSize: '0.62rem', fontWeight: 900, flexShrink: 0 }}>
                      ↓
                    </span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.album ? `${t.album} . ` : ''}{t.singers || t.artist}
                    </span>
                  </div>
                </div>

                {/* Green Filled Heart Icon */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(t.id, t);
                  }}
                  style={{ background: 'none', border: 'none', color: '#1db954', cursor: 'pointer', padding: 4 }}
                  title="Remove from Liked"
                >
                  <Heart size={18} fill="#1db954" color="#1db954" />
                </button>

                {/* Three dots ... */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  style={{ background: 'none', border: 'none', color: '#a7a7a7', cursor: 'pointer', padding: 4 }}
                  title="More Options"
                >
                  <MoreHorizontal size={20} color="#a7a7a7" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Combine Liked Songs + User Playlists + Default Spotify Playlists
  const allLibraryItems = useMemo(() => {
    const list = [
      {
        id: 'liked-songs',
        title: 'Liked Songs',
        subtitle: '📌 Playlist • ARAVIN MENON',
        isPinned: true,
        type: 'playlist',
        isLikedCard: true
      },
      ...userPlaylists.map(up => ({
        id: up.id,
        title: up.name || up.title,
        subtitle: `Playlist • ARAVIN MENON`,
        coverUrl: up.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
        type: 'playlist'
      })),
      ...defaultSpotifyPlaylists
    ];

    if (!librarySearch.trim()) return list;
    const q = librarySearch.toLowerCase().trim();
    return list.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q)
    );
  }, [userPlaylists, defaultSpotifyPlaylists, librarySearch]);

  return (
    <div className="view-content spotify-mobile-library" style={{ paddingBottom: 160 }}>
      {/* ═══ 1. Top Bar: Avatar "A", Title, Search & Add Icons ═══ */}
      <div className="spotify-library-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button type="button" className="sp-home-avatar" onClick={toggleSidebar} aria-label="Open profile">
            {avatarLetter}
          </button>
          <h1 className="spotify-library-title">
            Your Library
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            className="spotify-icon-btn"
            onClick={() => setShowSearchInput(p => !p)}
            title="Search in library"
          >
            <Search size={24} color="#ffffff" />
          </button>
          <button
            className="spotify-icon-btn"
            onClick={() => setShowCreateModal(true)}
            title="Add playlist"
          >
            <Plus size={28} color="#ffffff" />
          </button>
        </div>
      </div>

      <div className="sp-home-actions" style={{ padding: '0 16px 12px' }}>
        <button type="button" className="sp-play-all-btn" onClick={() => playAllSongs()}>
          <Play size={18} fill="#000" color="#000" />
          <span>Play all songs</span>
        </button>
        <button type="button" className="sp-chip" onClick={() => setShowThemeModal(true)}>
          Theme
        </button>
      </div>

      {/* In-library Search Bar (revealed on toggle) */}
      {showSearchInput && (
        <div style={{ padding: '0 16px 12px 16px' }}>
          <div className="hub-search-bar" style={{ margin: 0 }}>
            <Search size={16} color="#b3b3b3" />
            <input
              type="text"
              placeholder="Search in Your Library..."
              value={librarySearch}
              autoFocus
              onChange={(e) => setLibrarySearch(e.target.value)}
            />
            {librarySearch && (
              <button
                onClick={() => setLibrarySearch('')}
                style={{ background: 'none', border: 'none', color: '#b3b3b3', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ 2. Horizontal Filter Pills ═══ */}
      <div className="spotify-pills-scroll">
        {['Playlists', 'Podcasts', 'Albums', 'Artists', 'Composers'].map(pill => {
          const isSelected = selectedPill === pill;
          return (
            <button
              key={pill}
              className={`spotify-pill ${isSelected ? 'active' : ''}`}
              onClick={() => setSelectedPill(isSelected ? 'All' : pill)}
            >
              {pill}
            </button>
          );
        })}
      </div>

      {/* ═══ 3. Subheader: Recents → history page ═══ */}
      <div className="spotify-subbar">
        <button
          type="button"
          className="spotify-sort-btn"
          onClick={() => setActiveView('history')}
        >
          <ArrowUpDown size={15} />
          <span>Recents{recentlyPlayedTracks?.length ? ` (${recentlyPlayedTracks.length})` : ''}</span>
        </button>

        <button
          className="spotify-icon-btn"
          onClick={() => setIsGridView(p => !p)}
          title="Toggle view"
        >
          {isGridView ? <List size={20} color="#ffffff" /> : <Grid size={20} color="#ffffff" />}
        </button>
      </div>

      {Array.isArray(recentlyPlayedTracks) && recentlyPlayedTracks.length > 0 && (
        <div className="sp-history-preview">
          <div className="sp-shelf-head" style={{ padding: '0 16px' }}>
            <h2 style={{ fontSize: '1.05rem', margin: 0 }}>Recently played</h2>
            <button type="button" className="sp-chip" onClick={() => setActiveView('history')}>See all</button>
          </div>
          <div className="sp-shelf-row" style={{ paddingLeft: 16 }}>
            {recentlyPlayedTracks.slice(0, 8).map((t, i) => (
              <button
                key={`${t.id || t.title}-${i}`}
                type="button"
                className="sp-album-card"
                onClick={() => playTrack(t, recentlyPlayedTracks)}
              >
                <img src={getSongCoverUrl(t, 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200')} alt="" />
                <span className="sp-album-title">{t.title}</span>
                <span className="sp-album-sub">{t.artist}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ 4. Library Items List (Matching Screenshot) ═══ */}
      {isGridView ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, padding: '0 16px' }}>
          {allLibraryItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handlePlaylistClick(item)}
              style={{ cursor: 'pointer' }}
            >
              {item.isLikedCard ? (
                <div
                  style={{
                    aspectRatio: '1/1',
                    borderRadius: 6,
                    background: 'linear-gradient(135deg, #450af5, #8e8cf8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8
                  }}
                >
                  <Heart size={44} color="#fff" fill="#fff" />
                </div>
              ) : (
                <img
                  src={item.coverUrl}
                  alt={item.title}
                  style={{ width: '100%', aspectRatio: '1/1', borderRadius: 6, objectFit: 'cover', marginBottom: 8 }}
                />
              )}
              <div style={{ color: '#fff', fontSize: '0.88rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.title}
              </div>
              <div style={{ color: '#b3b3b3', fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.subtitle}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="spotify-items-list">
          {allLibraryItems.map((item) => (
            <div
              key={item.id}
              className="spotify-library-row"
              onClick={() => handlePlaylistClick(item)}
            >
              {/* Thumbnail / Artwork */}
              {item.isLikedCard ? (
                <div className="spotify-liked-square">
                  <Heart size={30} color="#ffffff" fill="#ffffff" />
                </div>
              ) : (
                <img
                  src={item.coverUrl}
                  alt={item.title}
                  className="spotify-item-thumb"
                />
              )}

              {/* Title & Subtitle */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="spotify-item-title">
                  {item.title}
                </div>
                <div className="spotify-item-subtitle">
                  {item.isPinned && (
                    <Pin size={13} fill="#1db954" color="#1db954" style={{ transform: 'rotate(45deg)', flexShrink: 0 }} />
                  )}
                  <span>{item.subtitle}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Create Playlist Modal ═══ */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              background: '#282828',
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 380,
              boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 16px 0', color: '#fff' }}>
              Give your playlist a name
            </h2>
            <form onSubmit={handleCreateSubmit}>
              <input
                type="text"
                placeholder="My Playlist #1"
                value={newPlaylistName}
                autoFocus
                onChange={(e) => setNewPlaylistName(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderBottom: '2px solid #1db954',
                  padding: '12px 14px',
                  color: '#fff',
                  fontSize: '1.1rem',
                  borderRadius: 6,
                  outline: 'none',
                  marginBottom: 20
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#b3b3b3',
                    fontWeight: 700,
                    padding: '10px 16px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#1db954',
                    border: 'none',
                    color: '#000',
                    fontWeight: 800,
                    borderRadius: 9999,
                    padding: '10px 24px',
                    cursor: 'pointer'
                  }}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
