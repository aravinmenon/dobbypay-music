import React, { useState, useEffect, useMemo, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import {
  fetchFreeToUseTracks,
  searchFreeToUseTracks,
  fetchFreeToUseCategories,
  fetchFreeToUseCategoryTracks,
  fetchFreeToUseRelatedTracks
} from '../services/freeToUseApi';
import { getSongCoverUrl } from '../services/phoneStorage';
import {
  Play,
  Pause,
  Heart,
  Clock,
  Search,
  Zap,
  Loader2,
  Sparkles,
  Download,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Radio,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Award,
  Calendar,
  Share2,
  Headphones,
  Music2,
  X
} from 'lucide-react';

const POPULAR_CATEGORIES = [
  { id: 'all', name: 'All Tracks' },
  { id: 'lofi', name: 'Lofi', search: 'lofi' },
  { id: 'cinematic', name: 'Cinematic', search: 'cinematic' },
  { id: 'edm', name: 'EDM', search: 'edm' },
  { id: 'electronic', name: 'Electronic', search: 'electronic' },
  { id: 'chill', name: 'Chill & Relax', search: 'chill' },
  { id: 'ambient', name: 'Ambient', search: 'ambient' },
  { id: 'dramatic', name: 'Dramatic', search: 'dramatic' },
  { id: 'hip-hop', name: 'Hip Hop', search: 'hip hop' },
  { id: 'vlog', name: 'Vlog / Travel', search: 'vlog' },
  { id: 'acoustic', name: 'Acoustic', search: 'acoustic' }
];

const ORDER_OPTIONS = [
  { key: 'plays', label: 'Most Played', icon: TrendingUp },
  { key: 'views', label: 'Most Viewed', icon: Headphones },
  { key: 'staff_order', label: 'Staff Picks', icon: Award },
  { key: 'release_date', label: 'Latest Release', icon: Calendar },
  { key: 'downloads', label: 'Top Downloads', icon: Download }
];

/**
 * Mini audio waveform bar renderer using normalized loudness array
 */
function MiniWaveform({ waveform, isCurrent, isPlaying }) {
  if (!waveform || waveform.length === 0) return null;
  // Sample 24 points from the 300 points array
  const step = Math.floor(waveform.length / 24);
  const points = [];
  for (let i = 0; i < 24; i++) {
    points.push(waveform[i * step] || 20);
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        height: '24px',
        width: '74px',
        opacity: isCurrent ? 1 : 0.65
      }}
      title="Track Waveform"
    >
      {points.map((val, idx) => {
        const height = Math.max(3, Math.min(22, Math.round((val / 100) * 22)));
        const activeColor = isCurrent && isPlaying ? '#10b981' : isCurrent ? '#FF6B00' : '#71717a';
        return (
          <span
            key={idx}
            style={{
              display: 'inline-block',
              width: '2px',
              height: `${height}px`,
              backgroundColor: activeColor,
              borderRadius: '1px',
              transition: 'height 0.2s ease, background-color 0.2s ease'
            }}
          />
        );
      })}
    </div>
  );
}

export default function FreeToUseHub() {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    likedTrackIds,
    toggleLike,
    openTipModal
  } = usePlayer();

  // ─── Filter & Search State ──────────────────────────────────────────
  const [tracks, setTracks] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState('plays');
  const [apiCategories, setApiCategories] = useState([]);

  // Copy attribution feedback state
  const [copiedTrackId, setCopiedTrackId] = useState(null);

  // Related tracks modal
  const [activeRelatedModalTrack, setActiveRelatedModalTrack] = useState(null);
  const [relatedTracks, setRelatedTracks] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  // Fetch API categories once on mount
  useEffect(() => {
    let mounted = true;
    fetchFreeToUseCategories({ limit: 40 })
      .then(cats => {
        if (mounted && cats.length > 0) {
          setApiCategories(cats);
        }
      })
      .catch(err => console.warn('Categories load error:', err));
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch tracks whenever query, category, or order changes
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        let result;
        if (searchQuery.trim()) {
          result = await searchFreeToUseTracks(searchQuery.trim(), {
            limit: 50,
            order: selectedOrder,
            sort: 'desc'
          });
        } else if (selectedCategory !== 'all') {
          // Check if selectedCategory is an API category ID or preset search
          const preset = POPULAR_CATEGORIES.find(c => c.id === selectedCategory);
          if (preset && preset.search) {
            result = await searchFreeToUseTracks(preset.search, {
              limit: 50,
              order: selectedOrder,
              sort: 'desc'
            });
          } else {
            result = await fetchFreeToUseCategoryTracks(selectedCategory, {
              limit: 50,
              order: selectedOrder,
              sort: 'desc'
            });
          }
        } else {
          result = await fetchFreeToUseTracks({
            limit: 50,
            order: selectedOrder,
            sort: 'desc'
          });
        }

        if (mounted) {
          setTracks(result.tracks || []);
          setTotalCount(result.count || (result.tracks ? result.tracks.length : 0));
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('Tracks fetch error:', err);
        if (mounted) setIsLoading(false);
      }
    }, searchQuery ? 350 : 0);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedCategory, selectedOrder]);

  // Copy attribution helper
  const handleCopyAttribution = (e, track) => {
    e.stopPropagation();
    const attribution = `Track: ${track.title}\nMusic by ${track.artist}\nFree Download / Stream: https://freetouse.com`;
    navigator.clipboard.writeText(attribution).then(() => {
      setCopiedTrackId(track.id);
      setTimeout(() => setCopiedTrackId(null), 2500);
    });
  };

  // Open related tracks modal
  const handleOpenRelated = async (e, track) => {
    e.stopPropagation();
    setActiveRelatedModalTrack(track);
    setLoadingRelated(true);
    setRelatedTracks([]);
    try {
      const rel = await fetchFreeToUseRelatedTracks(track.rawId || track.id, { limit: 12 });
      setRelatedTracks(rel);
    } catch (err) {
      console.warn('Failed to load related tracks:', err);
    } finally {
      setLoadingRelated(false);
    }
  };

  return (
    <div className="view-content" style={{ paddingBottom: '90px' }}>
      {/* ─── Hero Banner ─── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #09090b 0%, #1e1b4b 50%, #0f172a 100%)',
          borderRadius: '16px',
          padding: '32px 28px',
          marginBottom: '28px',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(99, 102, 241, 0.2)',
                border: '1px solid rgba(129, 140, 248, 0.4)',
                color: '#c7d2fe',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.05em'
              }}
            >
              <Radio size={14} color="#818cf8" />
              OFFICIAL API INTEGRATION
            </span>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#6ee7b7',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: 700
              }}
            >
              <Sparkles size={14} color="#10b981" />
              100% ROYALTY-FREE & NO COPYRIGHT
            </span>

            <a
              href="https://freetouse.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                color: '#94a3b8',
                fontSize: '0.8rem',
                marginLeft: 'auto',
                textDecoration: 'none',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
            >
              <span>Visit FreeToUse.com</span>
              <ExternalLink size={13} />
            </a>
          </div>

          <h1
            style={{
              fontSize: '2.4rem',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              margin: '0 0 10px 0',
              background: 'linear-gradient(to right, #ffffff, #c7d2fe, #818cf8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Free To Use Music
          </h1>

          <p style={{ color: '#94a3b8', fontSize: '0.98rem', maxWidth: '720px', margin: '0 0 20px 0', lineHeight: 1.55 }}>
            Explore safe, royalty-free audio tracks made by real creators for YouTube, Twitch, TikTok, Podcasts, Games, and Commercial Projects. Stream in HD 320kbps MP3s with instant copyable attribution!
          </p>

          {/* Quick Stats Pill */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Headphones size={18} color="#818cf8" />
              <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
                <strong style={{ color: '#ffffff' }}>1,600+</strong> Full MP3 Tracks
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Music2 size={18} color="#10b981" />
              <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
                <strong style={{ color: '#ffffff' }}>60+</strong> Genres & Moods
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="#FF6B00" />
              <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
                DobbyPay Artist Tip Enabled
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Search & Controls Bar ─── */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          justifyContent: 'space-between'
        }}
      >
        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#18181b',
            border: '1px solid #27272a',
            borderRadius: '9999px',
            padding: '8px 16px',
            width: '100%',
            maxWidth: '380px',
            gap: '10px'
          }}
        >
          <Search size={18} color="#a1a1aa" />
          <input
            type="text"
            placeholder="Search FreeToUse by title, artist, vibe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#ffffff',
              fontSize: '0.9rem',
              width: '100%'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#a1a1aa',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Order / Sort Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: '#71717a', fontWeight: 600 }}>Sort By:</span>
          {ORDER_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const isSelected = selectedOrder === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setSelectedOrder(opt.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: isSelected ? '#818cf8' : '#18181b',
                  color: isSelected ? '#000000' : '#cbd5e1',
                  border: isSelected ? '1px solid #818cf8' : '1px solid #27272a',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.82rem',
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={13} />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Category Filter Chips ─── */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '12px',
          marginBottom: '24px',
          scrollbarWidth: 'none'
        }}
      >
        {POPULAR_CATEGORIES.map(cat => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setSearchQuery('');
              }}
              style={{
                flexShrink: 0,
                background: isSelected ? '#ffffff' : '#18181b',
                color: isSelected ? '#000000' : '#a1a1aa',
                border: isSelected ? '1px solid #ffffff' : '1px solid #27272a',
                borderRadius: '9999px',
                padding: '6px 14px',
                fontSize: '0.84rem',
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {cat.name}
            </button>
          );
        })}

        {/* Dynamic API Categories if available */}
        {apiCategories.slice(0, 12).map(cat => {
          // Avoid duplicate with popular preset names
          if (POPULAR_CATEGORIES.some(p => p.name.toLowerCase() === cat.name.toLowerCase())) {
            return null;
          }
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setSearchQuery('');
              }}
              style={{
                flexShrink: 0,
                background: isSelected ? '#ffffff' : '#18181b',
                color: isSelected ? '#000000' : '#a1a1aa',
                border: isSelected ? '1px solid #ffffff' : '1px solid #27272a',
                borderRadius: '9999px',
                padding: '6px 14px',
                fontSize: '0.84rem',
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* ─── Tracks List Header ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
          {searchQuery
            ? `Results for "${searchQuery}"`
            : selectedCategory !== 'all'
            ? `${POPULAR_CATEGORIES.find(c => c.id === selectedCategory)?.name || 'Category'} Tracks`
            : 'All Royalty-Free Tracks'}
          <span style={{ fontSize: '0.9rem', color: '#71717a', fontWeight: 500, marginLeft: '10px' }}>
            ({totalCount} tracks available)
          </span>
        </h2>
      </div>

      {/* ─── Tracks Table ─── */}
      {isLoading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#818cf8' }}>
          <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: '#a1a1aa', fontSize: '0.95rem' }}>Fetching live tracks from FreeToUse.com API...</p>
        </div>
      ) : tracks.length === 0 ? (
        <div
          style={{
            padding: '50px 20px',
            textAlign: 'center',
            background: '#18181b',
            borderRadius: '12px',
            border: '1px solid #27272a'
          }}
        >
          <Music2 size={36} color="#71717a" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ margin: '0 0 6px 0', color: '#ffffff' }}>No FreeToUse tracks found</h3>
          <p style={{ color: '#a1a1aa', fontSize: '0.9rem', margin: '0 0 16px 0' }}>
            Try searching for another term like "lofi", "ambient", or choose "All Tracks".
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            style={{
              background: '#818cf8',
              color: '#000000',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '9999px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="track-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th className="track-index-col">#</th>
                <th>Track</th>
                <th className="hide-mobile">Waveform</th>
                <th className="hide-mobile">Genre & Tags</th>
                <th className="hide-mobile">Plays</th>
                <th>
                  <Clock size={16} />
                </th>
                <th style={{ textAlign: 'right', paddingRight: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                const isLiked = likedTrackIds.includes(track.id);
                const isCopied = copiedTrackId === track.id;

                return (
                  <tr
                    key={track.id || idx}
                    className={`track-row ${isCurrent ? 'track-row--active' : ''}`}
                    onClick={() => {
                      if (isCurrent) togglePlay();
                      else playTrack(track, tracks);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Index / Play Button */}
                    <td className="track-index-col">
                      <div className="track-index-content">
                        <span className="track-num">{idx + 1}</span>
                        <button
                          className="track-play-hover-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isCurrent) togglePlay();
                            else playTrack(track, tracks);
                          }}
                        >
                          {isCurrent && isPlaying ? (
                            <Pause size={14} fill="#ffffff" />
                          ) : (
                            <Play size={14} fill="#ffffff" style={{ marginLeft: '2px' }} />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Track Title, Artist & Cover */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ position: 'relative', width: '42px', height: '42px', flexShrink: 0 }}>
                          <img
                            src={getSongCoverUrl(track, '')}
                            alt={track.title}
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '6px',
                              objectFit: 'cover'
                            }}
                          />
                          {isCurrent && isPlaying && (
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(0,0,0,0.45)',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  background: '#10b981',
                                  boxShadow: '0 0 8px #10b981'
                                }}
                              />
                            </div>
                          )}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: isCurrent ? 800 : 600,
                              color: isCurrent ? '#818cf8' : '#ffffff',
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
                            {track.artist}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Loudness Waveform preview */}
                    <td className="hide-mobile">
                      <MiniWaveform
                        waveform={track.waveform}
                        isCurrent={isCurrent}
                        isPlaying={isPlaying}
                      />
                    </td>

                    {/* Genre & Category Tags */}
                    <td className="hide-mobile">
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            background: 'rgba(129, 140, 248, 0.15)',
                            color: '#a5b4fc',
                            border: '1px solid rgba(129, 140, 248, 0.3)',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '4px'
                          }}
                        >
                          {track.genre}
                        </span>
                        {track.categories?.[0] && track.categories[0] !== track.genre && (
                          <span
                            style={{
                              background: '#27272a',
                              color: '#d4d4d8',
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              borderRadius: '4px'
                            }}
                          >
                            {track.categories[0]}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Plays count */}
                    <td className="hide-mobile" style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>
                      {track.plays}
                    </td>

                    {/* Duration */}
                    <td style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>
                      {track.duration}
                    </td>

                    {/* Action buttons: Attribution, Download, Tip, Like */}
                    <td style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          justifyContent: 'flex-end'
                        }}
                      >
                        {/* Copy Attribution for Creators */}
                        <button
                          onClick={(e) => handleCopyAttribution(e, track)}
                          title="Copy FreeToUse Attribution Credit"
                          style={{
                            background: isCopied ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                            color: isCopied ? '#10b981' : '#a1a1aa',
                            border: isCopied ? '1px solid #10b981' : '1px solid transparent',
                            borderRadius: '6px',
                            padding: '6px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isCopied ? <Check size={16} /> : <Copy size={16} />}
                        </button>

                        {/* Download MP3 Direct */}
                        <a
                          href={track.audioUrl}
                          download={`${track.title}.mp3`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="Download Free 320kbps MP3"
                          style={{
                            color: '#a1a1aa',
                            padding: '6px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            transition: 'color 0.15s ease'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#a1a1aa')}
                        >
                          <Download size={16} />
                        </a>

                        {/* Similar / Related Tracks */}
                        <button
                          onClick={(e) => handleOpenRelated(e, track)}
                          title="Find Similar Royalty-Free Tracks"
                          style={{
                            background: 'transparent',
                            color: '#a1a1aa',
                            border: 'none',
                            padding: '6px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                        >
                          <SlidersHorizontal size={15} />
                        </button>

                        {/* Tip Artist */}
                        <button
                          className="dobby-card-tip-chip"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTipModal(track);
                          }}
                          title={`Tip ${track.artist} with DobbyPay`}
                          style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                        >
                          <Zap size={11} fill="#FF6B00" color="#FF6B00" />
                          <span>Tip</span>
                        </button>

                        {/* Like Track */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(track.id);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                          title={isLiked ? 'Unlike' : 'Like'}
                        >
                          <Heart
                            size={16}
                            fill={isLiked ? '#FF6B00' : 'none'}
                            color={isLiked ? '#FF6B00' : '#71717a'}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Related Tracks Modal ─── */}
      {activeRelatedModalTrack && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setActiveRelatedModalTrack(null)}
        >
          <div
            style={{
              background: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                borderBottom: '1px solid #27272a',
                paddingBottom: '12px'
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: '#ffffff' }}>
                  Tracks Similar to "{activeRelatedModalTrack.title}"
                </h3>
                <span style={{ fontSize: '0.82rem', color: '#818cf8' }}>
                  Curated via FreeToUse.com Similarity Algorithm
                </span>
              </div>
              <button
                onClick={() => setActiveRelatedModalTrack(null)}
                style={{
                  background: '#27272a',
                  border: 'none',
                  borderRadius: '50%',
                  color: '#ffffff',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {loadingRelated ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#818cf8' }}>
                <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>Searching related tracks...</p>
              </div>
            ) : relatedTracks.length === 0 ? (
              <p style={{ color: '#a1a1aa', textAlign: 'center', padding: '30px 0' }}>
                No related tracks found for this specific song.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {relatedTracks.map(rel => {
                  const isCurrent = currentTrack?.id === rel.id;
                  return (
                    <div
                      key={rel.id}
                      onClick={() => {
                        playTrack(rel, relatedTracks);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: isCurrent ? 'rgba(129, 140, 248, 0.15)' : '#27272a',
                        border: isCurrent ? '1px solid #818cf8' : '1px solid transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={rel.coverUrl}
                          alt={rel.title}
                          style={{ width: '38px', height: '38px', borderRadius: '4px', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.88rem' }}>{rel.title}</div>
                          <div style={{ color: '#a1a1aa', fontSize: '0.78rem' }}>{rel.artist} • {rel.genre}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>{rel.duration}</span>
                        <button
                          style={{
                            background: '#818cf8',
                            color: '#000000',
                            border: 'none',
                            borderRadius: '50%',
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <Play size={13} fill="#000000" style={{ marginLeft: '1px' }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
