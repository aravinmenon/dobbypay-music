import React, { useState, useRef, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { getSongCoverUrl } from '../services/phoneStorage';
import { getConnectedBluetoothDeviceName } from '../services/bluetoothAudio';
import {
  ChevronDown, MoreVertical, Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Headphones, Share2, ListMusic,
  RotateCcw, RotateCw, Heart, Plus, Check, Layers
} from 'lucide-react';

function formatTime(secs) {
  if (isNaN(secs) || secs === null) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function formatRemainingTime(current, total) {
  if (isNaN(total) || total === null || isNaN(current)) return "-0:00";
  const rem = Math.max(0, Math.floor(total - current));
  const m = Math.floor(rem / 60);
  const s = Math.floor(rem % 60);
  return `-${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function NowPlayingModal() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    seekTo,
    seekForward10,
    seekBackward10,
    togglePlay,
    playNext,
    playPrev,
    isShuffle,
    setIsShuffle,
    toggleShuffle,
    isRepeat,
    setIsRepeat,
    toggleRepeat,
    likedTrackIds,
    toggleLike,
    showNowPlaying,
    setShowNowPlaying,
    setShowLyrics,
    setShowQueue,
    triggerToast
  } = usePlayer();

  const [timerActive, setTimerActive] = useState(false);
  const [doubleTapFeedback, setDoubleTapFeedback] = useState(null); // { side: 'left' | 'right', text: '+10s' | '-10s' }
  const [bluetoothDeviceName, setBluetoothDeviceName] = useState('');
  const lastTapRef = useRef({ time: 0, x: 0 });
  const singleTapTimerRef = useRef(null);

  useEffect(() => {
    if (!showNowPlaying) return undefined;
    let cancelled = false;

    const refresh = async () => {
      const name = await getConnectedBluetoothDeviceName();
      if (!cancelled) setBluetoothDeviceName(name || '');
    };

    refresh();
    const id = setInterval(refresh, 4000);
    const onDeviceChange = () => { refresh(); };
    try {
      navigator.mediaDevices?.addEventListener?.('devicechange', onDeviceChange);
    } catch (_) {}

    return () => {
      cancelled = true;
      clearInterval(id);
      try {
        navigator.mediaDevices?.removeEventListener?.('devicechange', onDeviceChange);
      } catch (_) {}
    };
  }, [showNowPlaying]);

  if (!showNowPlaying || !currentTrack) return null;

  const isLiked = likedTrackIds.includes(currentTrack.id);
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const coverSrc = getSongCoverUrl(currentTrack, '');

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    seekTo(ratio * duration);
  };

  // Double tap / Double click detection on artwork (Left = -10s, Right = +10s, Center = Pause/Play)
  const handleArtworkInteraction = (e) => {
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : (rect.left + rect.width / 2));
    const clickX = clientX - rect.left;
    const isRight = clickX > (rect.width * 0.55);
    const isLeft = clickX < (rect.width * 0.45);

    if (now - lastTapRef.current.time < 320) {
      // Double tap confirmed! Cancel any pending single tap
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapRef.current.time = 0;

      if (isRight) {
        seekForward10();
        setDoubleTapFeedback({ side: 'right', text: '+10s' });
      } else if (isLeft) {
        seekBackward10();
        setDoubleTapFeedback({ side: 'left', text: '-10s' });
      } else {
        // Double tap on center: toggle play/pause
        togglePlay();
        setDoubleTapFeedback({ side: 'center', text: isPlaying ? 'PAUSED' : 'PLAY' });
      }

      setTimeout(() => {
        setDoubleTapFeedback(null);
      }, 750);
    } else {
      // First tap: register timestamp
      lastTapRef.current = { time: now, x: clickX };
      // Single tap after delay toggles play/pause if user wasn't double-tapping
      singleTapTimerRef.current = setTimeout(() => {
        singleTapTimerRef.current = null;
      }, 340);
    }
  };

  const trackThemeColor = currentTrack.color || '#5a220a';

  return (
    <div
      className="spotify-nowplaying-overlay"
      style={{
        background: `linear-gradient(180deg, ${trackThemeColor} 0%, #200d04 45%, #100602 100%)`
      }}
    >
      {/* ─── Top Bar: Collapse Chevron, Playlist Title, More Options ─── */}
      <div className="spotify-np-topbar">
        <button
          className="spotify-np-icon-btn"
          onClick={() => setShowNowPlaying(false)}
          title="Collapse player"
        >
          <ChevronDown size={30} color="#ffffff" />
        </button>

        <div className="spotify-np-topbar-center">
          <span className="spotify-np-context-label">
            Playing from Playlist
          </span>
          <span className="spotify-np-context-name">
            {currentTrack.album || currentTrack.film || 'DobbyPay Cloud Music'}
          </span>
        </div>

        <button
          className="spotify-np-icon-btn"
          onClick={() => setShowLyrics(true)}
          title="More options"
        >
          <MoreVertical size={24} color="#ffffff" />
        </button>
      </div>

      {/* ─── Center: Album art ─── */}
      <div
        className={`spotify-np-artwork-container ${isPlaying ? 'is-canvas-pulse' : ''}`}
        onClick={handleArtworkInteraction}
        title="Double-tap right for +10s, left for -10s"
        style={{
          cursor: 'pointer',
          position: 'relative',
          userSelect: 'none',
          borderRadius: 14,
          overflow: 'hidden',
          flexShrink: 0,
          width: 'min(85vw, 360px)',
          height: 'min(85vw, 360px)',
          maxHeight: '44vh',
          margin: '10px auto 24px auto',
          boxShadow: '0 16px 48px rgba(0,0,0,0.75)',
          background: '#000',
        }}
      >
        <img
          src={coverSrc}
          alt={currentTrack.title}
          className="spotify-np-artwork-img"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 14 }}
        />

        {/* Double-Tap 10s Animated Visual Feedback Overlay */}
        {doubleTapFeedback && (
          <div className={`spotify-double-tap-ripple-overlay ${doubleTapFeedback.side}`}>
            <div className="spotify-dt-bubble">
              {doubleTapFeedback.side === 'right' && (
                <>
                  <RotateCw size={44} color="#ffffff" className="spotify-dt-icon" />
                  <span className="spotify-dt-text">+10 sec</span>
                </>
              )}
              {doubleTapFeedback.side === 'left' && (
                <>
                  <RotateCcw size={44} color="#ffffff" className="spotify-dt-icon" />
                  <span className="spotify-dt-text">-10 sec</span>
                </>
              )}
              {doubleTapFeedback.side === 'center' && (
                <>
                  {isPlaying ? <Pause size={44} color="#ffffff" /> : <Play size={44} color="#ffffff" />}
                  <span className="spotify-dt-text">{doubleTapFeedback.text}</span>
                </>
              )}
            </div>
          </div>
        )}

        <div className="spotify-double-tap-hints">
          <span className="dt-hint-left">⏪ Double-tap -10s</span>
          <span className="dt-hint-right">Double-tap +10s ⏩</span>
        </div>
      </div>

      {/* ─── Track Info & Like / Save Button ─── */}
      <div className="spotify-np-track-row" style={{ alignItems: 'center', marginBottom: 20 }}>
        <div className="spotify-np-track-meta">
          <h1 className="spotify-np-track-title">
            {currentTrack.title}
          </h1>
          <p className="spotify-np-track-artist">
            {currentTrack.singers || currentTrack.artist}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {/* Like Heart Button */}
          <button
            className="spotify-np-like-btn"
            onClick={() => toggleLike(currentTrack.id, currentTrack)}
            title={isLiked ? "Remove from Liked Songs" : "Like Song (Add to Library)"}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.15s ease'
            }}
          >
            <Heart
              size={30}
              fill={isLiked ? "#1db954" : "none"}
              color={isLiked ? "#1db954" : "#ffffff"}
              strokeWidth={2.4}
            />
          </button>

          {/* Add to Library Button */}
          <button
            className="spotify-np-check-btn"
            onClick={() => toggleLike(currentTrack.id, currentTrack)}
            title={isLiked ? "In Your Library" : "Add to Library"}
            style={{
              background: isLiked ? 'rgba(29, 185, 84, 0.18)' : 'rgba(255, 255, 255, 0.08)',
              border: isLiked ? '1.5px solid #1db954' : '1.5px solid rgba(255, 255, 255, 0.25)',
              borderRadius: 20,
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              color: isLiked ? '#1db954' : '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 700,
              transition: 'all 0.15s ease'
            }}
          >
            {isLiked ? (
              <>
                <Check size={16} strokeWidth={3} color="#1db954" />
                <span>In Library</span>
              </>
            ) : (
              <>
                <Plus size={16} strokeWidth={3} color="#ffffff" />
                <span>Add</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── Scrubber & Timestamps (Negative Remaining Time Match) ─── */}
      <div className="spotify-np-scrubber-container">
        <div className="spotify-np-scrubber-track" onClick={handleSeek}>
          <div
            className="spotify-np-scrubber-fill"
            style={{ width: `${progressPercent}%` }}
          />
          <div
            className="spotify-np-scrubber-thumb"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        <div className="spotify-np-timestamps">
          <span>{formatTime(currentTime)}</span>
          <span>{formatRemainingTime(currentTime, duration)}</span>
        </div>
      </div>

      {/* ─── Controls: Shuffle, Back, -10s, Play/Pause, +10s, Next, Repeat ─── */}
      <div className="spotify-np-controls-row">
        {/* Shuffle */}
        <button
          className={`spotify-np-control-btn ${isShuffle ? 'active-green' : ''}`}
          onClick={toggleShuffle}
          title={isShuffle ? "Shuffle ON (Random songs play automatically)" : "Enable Shuffle"}
        >
          <Shuffle size={20} color={isShuffle ? '#1db954' : '#ffffff'} />
          {isShuffle && <span className="spotify-active-dot" />}
        </button>

        {/* Back / Previous Song */}
        <button
          className="spotify-np-control-btn"
          onClick={playPrev}
          title="Back to Previous Song"
        >
          <SkipBack size={30} fill="#ffffff" color="#ffffff" />
        </button>

        {/* 10 Seconds Rewind Button */}
        <button
          className="spotify-np-control-btn spotify-seek-btn"
          onClick={seekBackward10}
          title="Rewind 10 Seconds"
        >
          <RotateCcw size={26} color="#ffffff" strokeWidth={2.2} />
          <span className="spotify-seek-badge">10</span>
        </button>

        {/* Big White Circular Play / Pause Button */}
        <button
          className="spotify-np-play-circle"
          onClick={togglePlay}
          title={isPlaying ? "Pause Audio" : "Play Audio"}
        >
          {isPlaying ? (
            <Pause size={32} fill="#000000" color="#000000" />
          ) : (
            <Play size={32} fill="#000000" color="#000000" style={{ marginLeft: 3 }} />
          )}
        </button>

        {/* 10 Seconds Forward Button */}
        <button
          className="spotify-np-control-btn spotify-seek-btn"
          onClick={seekForward10}
          title="Move Forward 10 Seconds"
        >
          <RotateCw size={26} color="#ffffff" strokeWidth={2.2} />
          <span className="spotify-seek-badge">10</span>
        </button>

        {/* Next Song */}
        <button
          className="spotify-np-control-btn"
          onClick={playNext}
          title="Next Song"
        >
          <SkipForward size={30} fill="#ffffff" color="#ffffff" />
        </button>

        {/* Repeat Mode */}
        <button
          className={`spotify-np-control-btn ${isRepeat !== 'off' ? 'active-green' : ''}`}
          onClick={toggleRepeat}
          title={`Repeat Mode: ${isRepeat}`}
        >
          <Repeat size={20} color={isRepeat !== 'off' ? '#1db954' : '#ffffff'} />
          {isRepeat !== 'off' && <span className="spotify-active-dot" />}
        </button>
      </div>

      {/* ─── Bottom Device & Share / Queue Action Row ─── */}
      <div className="spotify-np-footer-row" style={{ marginTop: 'auto', paddingBottom: 16 }}>
        {bluetoothDeviceName ? (
          <div className="spotify-np-device-status" title="Connected Bluetooth audio">
            <Headphones size={17} color="#1db954" strokeWidth={2.5} />
            <span>{bluetoothDeviceName}</span>
          </div>
        ) : (
          <div />
        )}

        <div className="spotify-np-footer-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="spotify-np-footer-btn"
            onClick={() => {
              if (window.AndroidBridge && window.AndroidBridge.enterPiP) {
                window.AndroidBridge.enterPiP();
                triggerToast("📌 Displaying floating player over other apps!");
              } else if (window.AndroidBridge && window.AndroidBridge.openOverlaySettings) {
                window.AndroidBridge.openOverlaySettings();
              } else {
                triggerToast("📌 Floating mini-player active! Home button floats player over other apps.");
              }
            }}
            title="Display Floating Player Over Other Apps (PiP)"
            style={{
              background: 'rgba(255, 107, 0, 0.18)',
              border: '1px solid var(--dobby-orange)',
              borderRadius: '20px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Layers size={15} color="var(--dobby-orange)" />
            <span>Float Over Apps</span>
          </button>
          <button className="spotify-np-footer-btn" title="Share song">
            <Share2 size={20} color="#ffffff" />
          </button>
          <button
            className="spotify-np-footer-btn"
            onClick={() => setShowQueue(true)}
            title="Queue"
          >
            <ListMusic size={22} color="#ffffff" />
          </button>
        </div>
      </div>
    </div>
  );
}
