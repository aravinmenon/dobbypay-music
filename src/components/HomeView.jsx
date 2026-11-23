import React, { useMemo, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { ALL_ACTORS } from '../data/indianMusicData';
import { getSongCoverUrl } from '../services/phoneStorage';
import { Heart, Play, Disc3, Clapperboard } from 'lucide-react';
import { buildDailyMixQueue } from '../services/dailyMix';
import { APP_FEATURES } from '../data/appFeatures';

const LIKED_QUICK = {
  id: 'liked',
  title: 'Liked Songs',
  isLiked: true,
};

const FALLBACK_QUICK_REST = [
  {
    id: 'tamil-romance',
    title: 'Tamil Romance',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'jailer-2',
    title: 'Jailer 2',
    coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'tvk',
    title: 'TVK VIJAY Songs',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'yuvan',
    title: 'Yuvan Hits',
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'sad',
    title: 'Sad Songs',
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=300&q=80',
  },
];

function trackQuickKey(track) {
  if (!track) return '';
  if (track.id) return `id:${track.id}`;
  const title = String(track.title || '').toLowerCase().trim();
  const artist = String(track.artist || track.singers || '').toLowerCase().trim();
  return title ? `t:${title}::${artist}` : '';
}

/** Build home quick tiles from listening history (updates as history changes). */
function buildHistoryQuickAccess(recentTracks, limit = 6) {
  if (!Array.isArray(recentTracks) || recentTracks.length === 0) return [];
  const seen = new Set();
  const tiles = [];
  for (const track of recentTracks) {
    const key = trackQuickKey(track);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    tiles.push({
      id: `hist-${key}`,
      title: track.title || 'Unknown',
      coverUrl: getSongCoverUrl(track, ''),
      track,
    });
    if (tiles.length >= limit) break;
  }
  return tiles;
}

const TOP_MIXES = [
  {
    id: 'mix-arr',
    title: 'A.R. Rahman Mix',
    directorQuery: 'A.R. Rahman',
    artists: 'Shankar Mahadevan, Hariharan, Chinmayi and more',
    badge: 'A.R. Rahman Mix',
    badgeColor: '#e11d48',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'mix-yuvan',
    title: 'Yuvan Shankar Raja Mix',
    directorQuery: 'Yuvan Shankar Raja',
    artists: 'Yuvan Shankar Raja, Dhanush, Sid Sriram and more',
    badge: 'Yuvan Mix',
    badgeColor: '#84cc16',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'mix-anirudh',
    title: 'Anirudh Mix',
    directorQuery: 'Anirudh Ravichander',
    artists: 'Anirudh Ravichander, Dhanush, Jonita Gandhi',
    badge: 'Anirudh Mix',
    badgeColor: '#f97316',
    coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80',
  },
];

export default function HomeView() {
  const {
    playTrack,
    playAllSongs,
    setActiveView,
    toggleSidebar,
    currentUser,
    setSearchQuery,
    setShowThemeModal,
    setShowQueue,
    triggerToast,
    recentlyPlayedTracks,
  } = usePlayer();

  const [filter, setFilter] = useState('All');
  const initial = (currentUser?.name || currentUser?.username || 'A').charAt(0).toUpperCase();

  const openSearchPage = (query) => {
    setSearchQuery(query);
    setActiveView('search');
  };

  const recent = Array.isArray(recentlyPlayedTracks) ? recentlyPlayedTracks.slice(0, 10) : [];

  const mixes = useMemo(
    () => TOP_MIXES.map((mix) => ({
      ...mix,
      queue: buildDailyMixQueue(mix.directorQuery, recentlyPlayedTracks),
    })),
    [recentlyPlayedTracks]
  );

  const playMix = (mix) => {
    if (!mix.queue.length) {
      triggerToast(`No songs yet for ${mix.badge}`);
      openSearchPage(mix.directorQuery);
      return;
    }
    playTrack(mix.queue[0], mix.queue);
    setShowQueue(true);
    triggerToast(`${mix.badge} · ${mix.queue.length} songs`);
  };

  const quickAccess = useMemo(() => {
    // Liked Songs always first; next 5 slots follow listening history (or fallbacks).
    const fromHistory = buildHistoryQuickAccess(recentlyPlayedTracks, 5);
    const rest =
      fromHistory.length > 0
        ? [
            ...fromHistory,
            ...FALLBACK_QUICK_REST.filter(
              (f) => !fromHistory.some((h) => h.title.toLowerCase() === f.title.toLowerCase())
            ),
          ].slice(0, 5)
        : FALLBACK_QUICK_REST;
    return [LIKED_QUICK, ...rest];
  }, [recentlyPlayedTracks]);

  return (
    <div className="view-content sp-home">
      {/* Avatar + filter chips (Spotify home header) */}
      <div className="sp-home-header">
        <button type="button" className="sp-home-avatar" onClick={toggleSidebar} aria-label="Open profile">
          {currentUser?.avatarUrl ? (
            <img src={currentUser.avatarUrl} alt="" className="sp-avatar-img" />
          ) : (
            initial
          )}
        </button>
        <div className="sp-home-chips">
          {['All', 'Music', 'Podcasts'].map((chip) => (
            <button
              key={chip}
              type="button"
              className={`sp-chip ${filter === chip ? 'active' : ''}`}
              onClick={() => setFilter(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      <section className="sp-features-panel" aria-label="App features">
        <div className="sp-features-head">
          <h2 className="sp-features-title">What you can do</h2>
          <p className="sp-features-sub">Cloud Express · resume play · Indian catalog · wallet · admin</p>
        </div>
        <div className="sp-features-scroll">
          {APP_FEATURES.map((feat) => (
            <article
              key={feat.id}
              className="sp-feature-card"
              style={{ borderColor: `${feat.accent}55` }}
            >
              <span className="sp-feature-accent" style={{ background: feat.accent }} />
              <h3>{feat.title}</h3>
              <p>{feat.blurb}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Play All + Directors + Theme */}
      <div className="sp-home-actions">
        <button type="button" className="sp-play-all-btn" onClick={() => playAllSongs()}>
          <Play size={18} fill="#000" color="#000" />
          <span>Play all songs</span>
        </button>
        <button
          type="button"
          className="sp-chip"
          onClick={() => setActiveView('directors')}
          style={{ flexShrink: 0 }}
          title="Music Directors"
        >
          <Disc3 size={16} />
          Directors
        </button>
        <button
          type="button"
          className="sp-chip"
          onClick={() => setActiveView('actors')}
          style={{ flexShrink: 0 }}
          title="Actors"
        >
          <Clapperboard size={16} />
          Actors
        </button>
        <button
          type="button"
          className="sp-chip"
          onClick={() => setShowThemeModal(true)}
          style={{ flexShrink: 0 }}
        >
          Theme
        </button>
      </div>

      {/* 2-column quick access — driven by listening history when available */}
      <div className="sp-quick-grid">
        {quickAccess.map((item) => (
          <button
            key={item.id}
            type="button"
            className="sp-quick-tile"
            onClick={() => {
              if (item.track) {
                playTrack(item.track, recentlyPlayedTracks);
                return;
              }
              if (item.isLiked) {
                setActiveView('liked');
                return;
              }
              openSearchPage(item.title);
            }}
          >
            {item.isLiked ? (
              <div className="sp-quick-liked">
                <Heart size={20} fill="#fff" color="#fff" />
              </div>
            ) : (
              <img src={item.coverUrl} alt="" className="sp-quick-img" />
            )}
            <span className="sp-quick-title">{item.title}</span>
          </button>
        ))}
      </div>

      {recent.length > 0 && (
        <section className="sp-shelf">
          <div className="sp-shelf-head">
            <h2>Recently played</h2>
            <button type="button" className="sp-chip" onClick={() => setActiveView('history')}>
              See all
            </button>
          </div>
          <div className="sp-shelf-row">
            {recent.map((t, i) => (
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
        </section>
      )}

      {/* Your top mixes */}
      <section className="sp-shelf">
        <div className="sp-shelf-head">
          <h2>Your top mixes</h2>
        </div>
        <div className="sp-shelf-row">
          {mixes.map((mix) => (
            <button
              key={mix.id}
              type="button"
              className="sp-mix-card"
              onClick={() => playMix(mix)}
            >
              <div className="sp-mix-art">
                <img src={mix.coverUrl} alt="" />
                <span className="sp-mix-badge" style={{ background: mix.badgeColor }}>
                  {mix.badge}
                </span>
              </div>
              <p className="sp-mix-artists">{mix.artists}</p>
              <p className="sp-mix-count">{mix.queue.length} songs · plays now</p>
            </button>
          ))}
        </div>
      </section>

      {/* Popular actors — same card style, opens Actors page */}
      <section className="sp-shelf">
        <div className="sp-shelf-head">
          <h2>Popular actors</h2>
          <button type="button" className="sp-chip" onClick={() => setActiveView('actors')}>
            See all
          </button>
        </div>
        <div className="sp-shelf-row">
          {ALL_ACTORS.slice(0, 10).map((actor) => (
            <button
              key={actor.id}
              type="button"
              className="sp-hit-card"
              onClick={() => {
                try {
                  sessionStorage.setItem('open_actor_name', actor.name);
                } catch (_) {}
                setActiveView('actors');
              }}
            >
              <img src={actor.coverUrl} alt="" className="sp-hit-img" />
              <span className="sp-hit-title">{actor.name}</span>
              <span className="sp-hit-sub">{actor.tagline}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
