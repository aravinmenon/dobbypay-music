import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { MOCK_PLAYLISTS } from '../data/mockTracks';
import { getSongCoverUrl } from '../services/phoneStorage';
import { Play, Pause, Heart, Clock, Music, Zap } from 'lucide-react';

export default function PlaylistView() {
  const {
    selectedPlaylistId,
    userPlaylists,
    tracks,
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    likedTrackIds,
    toggleLike,
    openTipModal
  } = usePlayer();

  // Find playlist from userPlaylists or mockPlaylists
  const allPlaylists = [...userPlaylists, ...MOCK_PLAYLISTS];
  const playlist = allPlaylists.find(p => p.id === selectedPlaylistId) || MOCK_PLAYLISTS[0];

  // Resolve playlist tracks
  const playlistTracks = (playlist.customTracks && playlist.customTracks.length > 0)
    ? playlist.customTracks
    : tracks.filter(t => playlist.trackIds?.includes(t.id));
  const displayTracks = playlistTracks.length > 0 ? playlistTracks : tracks.slice(0, 5);

  const isPlaylistPlaying = isPlaying && displayTracks.some(t => t.id === currentTrack?.id);

  const handlePlayPlaylist = () => {
    if (isPlaylistPlaying) {
      togglePlay();
    } else if (displayTracks.length > 0) {
      playTrack(displayTracks[0], displayTracks);
    }
  };

  return (
    <div className="view-content" style={{ padding: 0 }}>
      {/* Hero Header */}
      <div
        style={{
          background: `linear-gradient(180deg, ${playlist.color || '#1e3a8a'} 0%, rgba(18,18,20,0.8) 100%)`,
          padding: '40px 28px 24px 28px',
          display: 'flex',
          alignItems: 'flex-end',
          gap: 24
        }}
      >
        <img
          src={playlist.coverUrl}
          alt={playlist.title}
          style={{
            width: 200,
            height: 200,
            borderRadius: 8,
            objectFit: 'cover',
            boxShadow: '0 12px 36px rgba(0,0,0,0.6)'
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Playlist
          </span>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
            {playlist.title}
          </h1>
          <p style={{ color: '#d4d4d8', fontSize: '0.95rem' }}>{playlist.description}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', fontWeight: 600 }}>
            <span>{playlist.owner}</span>
            <span>•</span>
            <span>{displayTracks.length} songs</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 20 }}>
        <button
          className="card-play-btn"
          style={{ position: 'relative', opacity: 1, transform: 'none', width: 56, height: 56 }}
          onClick={handlePlayPlaylist}
        >
          {isPlaylistPlaying ? <Pause size={24} fill="#000" /> : <Play size={24} fill="#000" style={{ marginLeft: 3 }} />}
        </button>
      </div>

      {/* Track Listing */}
      <div style={{ padding: '0 28px 160px 28px' }}>
        <table className="track-table">
          <thead>
            <tr>
              <th className="track-index-col">#</th>
              <th>Title</th>
              <th>Album</th>
              <th>Plays</th>
              <th><Clock size={16} /></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {displayTracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
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
                        <div className="track-cell-name">{track.title}</div>
                        <div className="track-cell-artist">{track.artist}</div>
                      </div>
                    </div>
                  </td>
                  <td>{track.album}</td>
                  <td>{track.plays}</td>
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
                        title={`Tip ${track.artist} with DobbyPay`}
                      >
                        <Zap size={13} fill="#FF6B00" color="#FF6B00" />
                        <span>Tip</span>
                      </button>
                      <button
                        className={`like-btn-icon ${isLiked ? 'liked' : ''}`}
                        onClick={() => toggleLike(track.id, track)}
                      >
                        <Heart size={16} fill={isLiked ? "#1db954" : "none"} color={isLiked ? "#1db954" : "#a1a1aa"} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
