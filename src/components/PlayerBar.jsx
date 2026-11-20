import React, { useRef, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { getSongCoverUrl } from '../services/phoneStorage';
import {
  Play, Pause, Square, SkipBack, SkipForward, Shuffle, Repeat,
  Heart, Volume2, VolumeX, Mic2, Activity, Zap, Headphones, CheckCircle2,
  RotateCcw, RotateCw, Check, ListMusic
} from 'lucide-react';

function formatTime(secs) {
  if (isNaN(secs) || secs === null) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    setIsShuffle,
    toggleShuffle,
    isRepeat,
    setIsRepeat,
    toggleRepeat,
    likedTrackIds,
    togglePlay,
    stopTrack,
    playNext,
    playPrev,
    seekTo,
    seekForward10,
    seekBackward10,
    changeVolume,
    toggleMute,
    toggleLike,
    showVisualizer,
    setShowVisualizer,
    showLyrics,
    setShowLyrics,
    setShowNowPlaying,
    setShowQueue,
    openTipModal,
    songCoverVersion,
  } = usePlayer();

  const [miniFeedback, setMiniFeedback] = useState(null);
  const miniTapRef = useRef(0);
  const miniTimerRef = useRef(null);

  if (!currentTrack) return null;

  const isLiked = likedTrackIds.includes(currentTrack.id);
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const coverSrc = getSongCoverUrl(currentTrack, '');

  const handleSeekClick = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;
    seekTo(ratio * duration);
  };

  // Mini-player double tap gesture (Left = -10s, Right = +10s, Single tap = Open NowPlaying)
  const handleMiniPlayerTap = (e) => {
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : rect.left + rect.width / 2);
    const clickX = clientX - rect.left;
    const isRightHalf = clickX > (rect.width * 0.5);

    if (now - miniTapRef.current < 320) {
      // Double tap detected!
      if (miniTimerRef.current) {
        clearTimeout(miniTimerRef.current);
        miniTimerRef.current = null;
      }
      miniTapRef.current = 0;

      if (isRightHalf) {
        seekForward10();
        setMiniFeedback('+10s ⏩');
      } else {
        seekBackward10();
        setMiniFeedback('⏪ -10s');
      }
      setTimeout(() => setMiniFeedback(null), 850);
    } else {
      // Single tap
      miniTapRef.current = now;
      miniTimerRef.current = setTimeout(() => {
        miniTimerRef.current = null;
        setShowNowPlaying(true);
      }, 340);
    }
  };

  return (
    <>
      {/* ════════════════════════════════════════════════════════════════
          1. SPOTIFY MOBILE FLOATING MINI-PLAYER (MATCHES USER SCREENSHOT)
          ════════════════════════════════════════════════════════════════ */}
      <div
        className="spotify-floating-player"
        onClick={handleMiniPlayerTap}
        title="Tap to open player, Double-tap right for +10s, left for -10s"
      >
        {/* Track Thumbnail */}
        <img
          key={`mini-cover-${songCoverVersion}`}
          src={coverSrc}
          alt={currentTrack.title}
          className="spotify-floating-thumb"
        />

        {/* Center Track Info */}
        <div className="spotify-floating-info">
          {/* Title . Artist */}
          <div className="spotify-floating-title" style={{ fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ color: '#ffffff', fontWeight: 700 }}>{currentTrack.title}</span>
            <span style={{ color: '#a7a7a7', margin: '0 5px' }}>.</span>
            <span style={{ color: '#a7a7a7' }}>{currentTrack.singers || currentTrack.artist}</span>
          </div>
        </div>

        {/* Right Actions: Heart Like Button & Play / Pause Button in crisp white */}
        <div className="spotify-floating-actions" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => toggleLike(currentTrack.id, currentTrack)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isLiked ? "Unlike" : "Like (Add to Library)"}
          >
            {isLiked ? (
              <Check size={22} color="#121212" fill="#1db954" strokeWidth={3} style={{ background: '#1db954', borderRadius: '50%', padding: 2 }} />
            ) : (
              <Heart size={20} color="#ffffff" />
            )}
          </button>
          <button
            className="spotify-floating-play-btn"
            onClick={togglePlay}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause size={24} fill="#ffffff" color="#ffffff" />
            ) : (
              <Play size={24} fill="#ffffff" color="#ffffff" style={{ marginLeft: 2 }} />
            )}
          </button>
        </div>

        {/* Bottom Thin 2px White Progress Bar */}
        <div className="spotify-floating-progress-track" onClick={handleSeekClick}>
          <div
            className="spotify-floating-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          2. SPOTIFY DESKTOP PLAYER BAR (EXPANDED DOCKED EXPERIENCE)
          ════════════════════════════════════════════════════════════════ */}
      <footer className="player-bar spotify-desktop-player">
        {/* Left Track Info */}
        <div className="player-left">
          <img
            src={coverSrc}
            alt={currentTrack.title}
            className="player-thumb"
            onClick={() => setShowNowPlaying(true)}
            style={{ cursor: 'pointer' }}
            title="Click to view full player"
          />
          <div className="player-track-info" onClick={() => setShowNowPlaying(true)} style={{ cursor: 'pointer' }}>
            <span className="player-track-title">{currentTrack.title}</span>
            <span className="player-track-artist">{currentTrack.singers || currentTrack.artist}</span>
          </div>
          <button
            className="like-btn-icon"
            onClick={() => setShowQueue(true)}
            title="Queue"
          >
            <ListMusic size={18} color="#a1a1aa" />
          </button>
          <button
            className={`like-btn-icon ${isLiked ? 'liked' : ''}`}
            onClick={() => toggleLike(currentTrack.id, currentTrack)}
            title={isLiked ? "Unlike" : "Like"}
          >
            <Heart size={18} fill={isLiked ? "#1db954" : "none"} color={isLiked ? "#1db954" : "#a1a1aa"} />
          </button>

          <button
            className="dobby-player-tip-btn hide-mobile"
            onClick={() => openTipModal(currentTrack)}
            title={`Tip ${currentTrack.artist} with DobbyPay`}
          >
            <Zap size={14} fill="var(--spotify-green)" color="var(--spotify-green)" />
            <span>Tip Artist</span>
          </button>
        </div>

        {/* Center Controls & Progress */}
        <div className="player-center">
          <div className="player-controls">
            {/* Shuffle */}
            <button
              className={`control-btn hide-mobile ${isShuffle ? 'active' : ''}`}
              onClick={toggleShuffle}
              title={isShuffle ? "Shuffle ON (Random songs play automatically)" : "Enable Shuffle"}
            >
              <Shuffle size={18} />
            </button>

            {/* Back / Previous Song */}
            <button className="control-btn" onClick={playPrev} title="Previous Song">
              <SkipBack size={20} />
            </button>

            {/* -10 Seconds Rewind Button */}
            <button
              className="control-btn seek-btn-10"
              onClick={seekBackward10}
              title="Rewind 10 Seconds"
            >
              <RotateCcw size={17} />
              <span className="seek-num-badge">10</span>
            </button>

            {/* Play / Pause Toggle Button */}
            <button className="play-toggle-btn" onClick={togglePlay} title={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? <Pause size={20} fill="#000" /> : <Play size={20} fill="#000" style={{ marginLeft: '2px' }} />}
            </button>

            {/* Stop Track Button */}
            <button className="control-btn" onClick={stopTrack} title="Stop & Reset Track">
              <Square size={16} />
            </button>

            {/* +10 Seconds Forward Button */}
            <button
              className="control-btn seek-btn-10"
              onClick={seekForward10}
              title="Move Forward 10 Seconds"
            >
              <RotateCw size={17} />
              <span className="seek-num-badge">10</span>
            </button>

            {/* Next Track */}
            <button className="control-btn" onClick={playNext} title="Next Track">
              <SkipForward size={20} />
            </button>

            {/* Repeat */}
            <button
              className={`control-btn hide-mobile ${isRepeat !== 'off' ? 'active' : ''}`}
              onClick={toggleRepeat}
              title={`Repeat: ${isRepeat}`}
            >
              <Repeat size={18} />
            </button>
          </div>

          {/* Desktop Progress Bar */}
          <div className="progress-bar-container desktop-only">
            <span className="time-stamp">{formatTime(currentTime)}</span>
            <div className="slider-track" onClick={handleSeekClick}>
              <div className="slider-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <span className="time-stamp">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right Tools & Volume */}
        <div className="player-right hide-mobile">
          <button
            className={`control-btn ${showLyrics ? 'active' : ''}`}
            onClick={() => setShowLyrics(!showLyrics)}
            title="Lyrics View"
          >
            <Mic2 size={18} />
          </button>

          <button
            className={`control-btn ${showVisualizer ? 'active' : ''}`}
            onClick={() => setShowVisualizer(!showVisualizer)}
            title="Web Audio Visualizer"
          >
            <Activity size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '120px' }}>
            <button className="control-btn" onClick={toggleMute}>
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => changeVolume(parseFloat(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#1db954',
                cursor: 'pointer',
                height: '4px'
              }}
            />
          </div>
        </div>
      </footer>
    </>
  );
}
