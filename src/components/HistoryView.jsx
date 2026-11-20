import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { getSongCoverUrl } from '../services/phoneStorage';
import { ChevronLeft, Clock, Play, Pause, Heart } from 'lucide-react';

export default function HistoryView() {
  const {
    recentlyPlayedTracks,
    playTrack,
    currentTrack,
    isPlaying,
    togglePlay,
    likedTrackIds,
    toggleLike,
    setActiveView,
  } = usePlayer();

  const history = Array.isArray(recentlyPlayedTracks) ? recentlyPlayedTracks : [];

  return (
    <div className="view-content sp-history-page">
      <div className="sp-history-header">
        <button
          type="button"
          className="sp-settings-back"
          onClick={() => setActiveView('home')}
          aria-label="Back"
        >
          <ChevronLeft size={28} />
        </button>
        <div>
          <h1 className="sp-settings-title">Recently played</h1>
          <p className="sp-history-sub">{history.length} song{history.length === 1 ? '' : 's'}</p>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="sp-history-empty">
          <Clock size={36} color="#b3b3b3" />
          <p>No play history yet</p>
          <span>Songs you play will show up here</span>
          <button type="button" className="sp-play-all-btn" style={{ marginTop: 16, maxWidth: 220 }} onClick={() => setActiveView('search')}>
            Find songs
          </button>
        </div>
      ) : (
        <div className="sp-song-list">
          {history.map((track, idx) => {
            const isCurrent = currentTrack?.id === track.id || currentTrack?.title === track.title;
            const isLiked = likedTrackIds.includes(track.id);
            return (
              <button
                key={`${track.id || track.title}-${idx}`}
                type="button"
                className={`sp-song-row ${isCurrent ? 'active' : ''}`}
                onClick={() => {
                  if (isCurrent) togglePlay();
                  else playTrack(track, history);
                }}
              >
                <img
                  src={getSongCoverUrl(track, 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200')}
                  alt=""
                  className="sp-song-cover"
                />
                <div className="sp-song-meta">
                  <span className="sp-song-title">{track.title}</span>
                  <span className="sp-song-artist">{track.artist || 'Unknown Artist'}</span>
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
                {isCurrent && isPlaying ? (
                  <Pause size={20} color="#fff" />
                ) : (
                  <Play size={20} color="#fff" fill="#fff" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
