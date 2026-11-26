import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { MOCK_TRACKS, MOCK_PLAYLISTS } from '../data/mockTracks';
import { resolveExactSongAudio, isAudioPreviewUrl } from '../services/audioSource.js';
import { normalizeTrackForPlayback } from '../services/playbackSourceManager.js';
import { resolveLongestDurationAudio } from '../services/apiDurationResolver.js';
import {
  getPhoneStoredTracks,
  saveTrackToPhone,
  saveAllTracksToPhone,
  exportTracksAsJson,
  exportLikedSongsAsJson,
  parseLikedSongsBackup,
  cacheTrackAudioOffline,
  removeTrackFromPhone,
  isSongSavedOnPhone,
  clearPhoneStorage,
  getPhoneStorageStats,
  addRecentlyPlayed,
  getRecentlyPlayed,
  getSongCoverUrl,
  setSongCoverOverride,
} from '../services/phoneStorage.js';
import { CURATED_TRACKS } from '../data/indianMusicData';
import { registerUser, loginUser, getCurrentUser, logoutUser, updateCurrentUserProfile, apiFetch } from '../services/authService';
import { recordSongPlay } from '../services/listeningAnalytics';
import { searchSongsFromApi, fetchDirectorHitsFromApi } from '../services/musicApi';
import { fetchAccountLibrary, saveAccountLibrary } from '../services/librarySync';
import { savePlaybackSession, loadPlaybackSession } from '../services/playbackSession.js';

const PlayerContext = createContext();

function readSavedPlaybackSession() {
  try {
    return loadPlaybackSession();
  } catch (_) {
    return null;
  }
}

function createPlayerAudio() {
  const audio = new Audio();
  audio.preload = 'auto';
  audio.setAttribute('playsinline', 'true');
  audio.setAttribute('webkit-playsinline', 'true');
  // Helps some WebViews keep decoding while screen is off
  return audio;
}

function notifyAndroidPlayback(title, artist, playing = true) {
  try {
    if (typeof window === 'undefined' || !window.AndroidPlayback) return;
    const safeTitle = String(title || 'Playing');
    const safeArtist = String(artist || '');
    if (typeof window.AndroidPlayback.updatePlayback === 'function') {
      window.AndroidPlayback.updatePlayback(safeTitle, safeArtist, !!playing);
      return;
    }
    if (playing && window.AndroidPlayback.startPlaybackService) {
      window.AndroidPlayback.startPlaybackService(safeTitle, safeArtist);
    }
  } catch (_) {}
}

function stopAndroidPlayback() {
  try {
    if (typeof window !== 'undefined' && window.AndroidPlayback?.stopPlaybackService) {
      window.AndroidPlayback.stopPlaybackService();
    }
  } catch (_) {}
}

function keepAndroidTimersAlive() {
  try {
    if (typeof window !== 'undefined' && window.AndroidPlayback?.keepTimersAlive) {
      window.AndroidPlayback.keepTimersAlive();
    }
  } catch (_) {}
}

export function PlayerProvider({ children }) {
  const audioRef = useRef(createPlayerAudio());
  const playNextRef = useRef(null);
  const playTrackRef = useRef(null);
  const playPrevRef = useRef(null);
  const wakeLockRef = useRef(null);
  const suppressAndroidNotifyRef = useRef(false);

  const initialSessionRef = useRef(readSavedPlaybackSession());
  const initialSession = initialSessionRef.current;
  const initialTrack = initialSession?.track || MOCK_TRACKS[0];
  const initialQueue =
    initialSession?.queue?.length > 0 ? initialSession.queue : MOCK_TRACKS;
  const initialQueueIndex = Math.min(
    Math.max(0, initialSession?.queueIndex || 0),
    Math.max(0, initialQueue.length - 1)
  );
  const resumePositionRef = useRef(Math.max(0, Number(initialSession?.position) || 0));
  const resumeWasPlayingRef = useRef(Boolean(initialSession?.wasPlaying));
  const didRestoreSessionRef = useRef(false);
  const lastPersistAtRef = useRef(0);

  const currentTrackRef = useRef(initialTrack);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceNodeRef = useRef(null);
  /** Listening analytics session for Admin/Super Admin dashboards */
  const playSessionRef = useRef(null);
  const currentUserRef = useRef(null);

  const [tracks] = useState(MOCK_TRACKS);
  const [currentTrack, setCurrentTrack] = useState(initialTrack);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(resumePositionRef.current || 0);
  const [duration, setDuration] = useState(initialTrack.durationSec || MOCK_TRACKS[0].durationSec);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackError, setPlaybackError] = useState(null);
  const [previewEnded, setPreviewEnded] = useState(false);

  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState('off'); // 'off', 'all', 'one'

  const [queue, setQueue] = useState(initialQueue);
  const [queueIndex, setQueueIndex] = useState(initialQueueIndex);

  // Keep responsive refs synchronized so audio event listeners never use stale closures
  const isShuffleRef = useRef(false);
  const isRepeatRef = useRef('off');
  const queueRef = useRef(initialQueue);
  const queueIndexRef = useRef(initialQueueIndex);

  const isPlayingRef = useRef(false);

  useEffect(() => { isShuffleRef.current = isShuffle; }, [isShuffle]);
  useEffect(() => { isRepeatRef.current = isRepeat; }, [isRepeat]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Navigation & Modal views
  const [activeView, setActiveViewRaw] = useState('home'); // 'home', 'search', 'library', 'playlist', 'liked'
  const activeViewRef = useRef('home');
  const viewHistoryRef = useRef([]);

  useEffect(() => {
    activeViewRef.current = activeView;
  }, [activeView]);

  /** Navigate and record history so Android/hardware Back can return to the previous screen. */
  const setActiveView = (next) => {
    const resolved = typeof next === 'function' ? next(activeViewRef.current) : next;
    if (!resolved || resolved === activeViewRef.current) return;
    viewHistoryRef.current.push(activeViewRef.current);
    if (viewHistoryRef.current.length > 40) {
      viewHistoryRef.current = viewHistoryRef.current.slice(-40);
    }
    activeViewRef.current = resolved;
    setActiveViewRaw(resolved);
  };

  const goBackView = () => {
    while (viewHistoryRef.current.length > 0) {
      const prev = viewHistoryRef.current.pop();
      if (prev && prev !== activeViewRef.current) {
        activeViewRef.current = prev;
        setActiveViewRaw(prev);
        return true;
      }
    }
    if (activeViewRef.current !== 'home') {
      activeViewRef.current = 'home';
      setActiveViewRaw('home');
      return true;
    }
    return false;
  };

  const navigateToView = (newView) => {
    setActiveView(newView);
  };

  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState(null);

  const [showVisualizer, setShowVisualizer] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  // Always close the profile drawer when navigating to another screen
  useEffect(() => {
    setSidebarOpen(false);
  }, [activeView]);

  // Persistence for liked songs & user playlists
  const [likedTrackIds, setLikedTrackIds] = useState(() => {
    try {
      const saved = localStorage.getItem('spotify_liked_tracks');
      return saved ? JSON.parse(saved) : ['track-1', 'track-2'];
    } catch {
      return ['track-1', 'track-2'];
    }
  });

  const [likedTracksData, setLikedTracksData] = useState(() => {
    try {
      const saved = localStorage.getItem('spotify_liked_tracks_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    // Seed full track objects for default liked ids so backup/export works
    return MOCK_TRACKS.filter((t) => ['track-1', 'track-2'].includes(t.id));
  });

  const [userPlaylists, setUserPlaylists] = useState(() => {
    try {
      const saved = localStorage.getItem('spotify_user_playlists');
      return saved ? JSON.parse(saved) : MOCK_PLAYLISTS;
    } catch {
      return MOCK_PLAYLISTS;
    }
  });

  // 100% On-Device Phone Storage state (Offline & Cached Songs, Stats, History)
  const [phoneStoredTracks, setPhoneStoredTracks] = useState(() => getPhoneStoredTracks());
  const [recentlyPlayedTracks, setRecentlyPlayedTracks] = useState(() => getRecentlyPlayed());
  const [storageStats, setStorageStats] = useState(() => getPhoneStorageStats());

  useEffect(() => {
    localStorage.setItem('spotify_liked_tracks', JSON.stringify(likedTrackIds));
  }, [likedTrackIds]);

  useEffect(() => {
    localStorage.setItem('spotify_liked_tracks_data', JSON.stringify(likedTracksData));
  }, [likedTracksData]);


  useEffect(() => {
    localStorage.setItem('spotify_user_playlists', JSON.stringify(userPlaylists));
  }, [userPlaylists]);

  // ─── Theme & Template Customization ───
  const [themeMode, setThemeMode] = useState(() => {
    try {
      return localStorage.getItem('dobbypay_theme_mode') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const [themeTemplate, setThemeTemplate] = useState(() => {
    try {
      return localStorage.getItem('dobbypay_theme_template') || 'spotify';
    } catch {
      return 'spotify';
    }
  });

  const [customTheme, setCustomTheme] = useState(() => {
    try {
      const raw = localStorage.getItem('dobbypay_custom_theme');
      return raw
        ? JSON.parse(raw)
        : { primary: '#1DB954', secondary: '#1ED760' };
    } catch {
      return { primary: '#1DB954', secondary: '#1ED760' };
    }
  });

  const [showThemeModal, setShowThemeModal] = useState(false);

  const applyThemeCssVars = (primary, secondary) => {
    const root = document.documentElement;
    root.style.setProperty('--spotify-green', primary);
    root.style.setProperty('--spotify-green-hover', secondary);
    root.style.setProperty('--dobby-orange', primary);
    root.style.setProperty('--dobby-orange-hover', secondary);
    root.style.setProperty('--dobby-orange-glow', `${primary}59`);
    root.style.setProperty('--spotify-green-glow', `${primary}59`);
    root.style.setProperty('--dobby-gradient', `linear-gradient(135deg, ${secondary} 0%, ${primary} 100%)`);
    root.style.setProperty('--border-focus', `${primary}80`);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    try {
      localStorage.setItem('dobbypay_theme_mode', themeMode);
    } catch {}
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-template', themeTemplate);
    try {
      localStorage.setItem('dobbypay_theme_template', themeTemplate);
    } catch {}

    if (themeTemplate === 'custom') {
      applyThemeCssVars(customTheme.primary, customTheme.secondary);
    }
  }, [themeTemplate, customTheme]);

  const toggleThemeMode = () => {
    setThemeMode(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setThemeTemplateAction = (tpl, colors = null) => {
    setThemeTemplate(tpl);
    if (colors?.primary) {
      applyThemeCssVars(colors.primary, colors.secondary || colors.primary);
    }
    try {
      localStorage.setItem('dobbypay_theme_template', tpl);
    } catch {}
  };

  const setCustomThemeAction = (colors) => {
    const next = {
      primary: colors.primary || '#1DB954',
      secondary: colors.secondary || colors.primary || '#1ED760',
    };
    setCustomTheme(next);
    setThemeTemplate('custom');
    applyThemeCssVars(next.primary, next.secondary);
    try {
      localStorage.setItem('dobbypay_custom_theme', JSON.stringify(next));
      localStorage.setItem('dobbypay_theme_template', 'custom');
    } catch {}
  };

  // Web Audio API Setup for Visualizer
  const initWebAudio = () => {
    if (audioCtxRef.current) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceNodeRef.current = source;
    } catch (err) {
      console.warn("Web Audio API CORS or initialization fallback:", err);
    }
  };

  // ─── MediaSession & Screen-Off / Background Next Track Automation ───
  const preloadedMapRef = useRef(new Set());

  const requestWakeLock = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.wakeLock?.request) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch (_) {
      // Screen wake lock optional; Android PARTIAL_WAKE_LOCK is in the service
    }
    keepAndroidTimersAlive();
  };

  const releaseWakeLock = async () => {
    try {
      await wakeLockRef.current?.release?.();
    } catch (_) {}
    wakeLockRef.current = null;
  };

  const updateMediaSession = (track, playing = true) => {
    if (!track || typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      const title = track.title || 'Track';
      const artist = track.artist || track.director || 'Spotify';
      const album = track.album || track.film || 'Spotify';
      const coverSrc = getSongCoverUrl(track, '');
      const artwork = coverSrc
        ? [{ src: coverSrc, sizes: '512x512', type: 'image/jpeg' }]
        : [];

      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album,
        artwork
      });

      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';

      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          notifyAndroidPlayback(title, artist);
        }).catch(() => {});
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current.pause();
        setIsPlaying(false);
        navigator.mediaSession.playbackState = 'paused';
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        playNextRef.current?.();
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        playPrevRef.current?.();
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && details.seekTime !== null) {
          audioRef.current.currentTime = details.seekTime;
          setCurrentTime(details.seekTime);
        }
      });

      notifyAndroidPlayback(title, artist, playing);
      if (playing) requestWakeLock();
      else releaseWakeLock();
    } catch (e) {
      console.warn("MediaSession update error:", e);
    }
  };

  const preloadNextTrack = () => {
    const activeQueue = (queueRef.current && queueRef.current.length > 0) ? queueRef.current : tracks;
    if (!activeQueue || activeQueue.length === 0) return;

    let nextTrack = null;
    if (isShuffleRef.current) {
      const candidates = activeQueue.filter((_, idx) => idx !== queueIndexRef.current);
      if (candidates.length > 0) {
        nextTrack = candidates[Math.floor(Math.random() * candidates.length)];
      }
    } else if (queueIndexRef.current + 1 < activeQueue.length) {
      nextTrack = activeQueue[queueIndexRef.current + 1];
    }

    if (!nextTrack || preloadedMapRef.current.has(nextTrack.id || nextTrack.title)) return;
    preloadedMapRef.current.add(nextTrack.id || nextTrack.title);

    if (nextTrack.audioUrl) return;

    resolveLongestDurationAudio(nextTrack).then(best => {
      if (best && best.audioUrl) {
        nextTrack.audioUrl = best.audioUrl;
        nextTrack.durationSec = best.durationSec || nextTrack.durationSec;
      }
    }).catch(() => {});
  };

  // Audio Event Listeners (uses refs to avoid stale closures and dropped playback events)
  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);

      if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
        try {
          if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
            navigator.mediaSession.setPositionState({
              duration: audio.duration,
              playbackRate: audio.playbackRate || 1,
              position: audio.currentTime || 0
            });
          }
        } catch (_) {}
      }

      // Persist last song + position so reopen resumes where the user stopped
      const now = Date.now();
      if (now - lastPersistAtRef.current > 2000) {
        lastPersistAtRef.current = now;
        const t = currentTrackRef.current;
        if (t) {
          savePlaybackSession({
            track: t,
            queue: queueRef.current,
            queueIndex: queueIndexRef.current,
            position: audio.currentTime || 0,
            wasPlaying: !audio.paused,
          });
        }
      }

      // Preload next track 12s before end so auto-next playback is 100% instant
      if (audio.duration && audio.currentTime > audio.duration - 12) {
        preloadNextTrack();
      }
    };

    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handlePlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
      setPlaybackError(null);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      const playingTrack = currentTrackRef.current;
      if (playingTrack) notifyAndroidPlayback(playingTrack.title, playingTrack.artist || playingTrack.director, true);
    };

    const handlePause = () => {
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
      const pausedTrack = currentTrackRef.current;
      if (pausedTrack) {
        savePlaybackSession({
          track: pausedTrack,
          queue: queueRef.current,
          queueIndex: queueIndexRef.current,
          position: audio.currentTime || 0,
          wasPlaying: false,
        });
      }
      if (suppressAndroidNotifyRef.current) return;
      if (pausedTrack) notifyAndroidPlayback(pausedTrack.title, pausedTrack.artist || pausedTrack.director, false);
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
    };

    const handleLoadedMetadata = () => {
      setIsBuffering(false);
      setPlaybackError(null);
      const mediaDuration = audio.duration;
      if (mediaDuration && !isNaN(mediaDuration) && mediaDuration > 0) {
        const exactDuration = Math.floor(mediaDuration);
        setDuration(exactDuration);

        const isPreviewStream =
          Boolean(currentTrackRef.current?.isPreview) ||
          isAudioPreviewUrl(audio.src) ||
          exactDuration <= 45;

        if (isPreviewStream) {
          const updated = {
            ...currentTrackRef.current,
            isPreview: true,
            isFullSong: false,
            quality: '30s Preview',
            durationSec: exactDuration,
            duration: `0:${exactDuration < 10 ? '0' : ''}${exactDuration}`
          };
          currentTrackRef.current = updated;
          setCurrentTrack(prev => ({ ...prev, ...updated }));
        } else {
          const mins = Math.floor(exactDuration / 60);
          const secs = exactDuration % 60;
          const updated = {
            ...currentTrackRef.current,
            isPreview: false,
            isFullSong: true,
            quality: currentTrackRef.current?.quality && !currentTrackRef.current.quality.includes('Preview') ? currentTrackRef.current.quality : 'Full HQ',
            durationSec: exactDuration,
            duration: `${mins}:${secs < 10 ? '0' : ''}${secs}`
          };
          currentTrackRef.current = updated;
          setCurrentTrack(prev => ({ ...prev, ...updated }));
        }
      } else {
        const fallbackSecs = currentTrackRef.current?.durationSec || 240;
        setDuration(fallbackSecs);
      }
    };

    const handleEnded = () => {
      setIsBuffering(false);
      setPreviewEnded(false);
      keepAndroidTimersAlive();

      if (isRepeatRef.current === 'one') {
        audio.currentTime = 0;
        audio.play().catch(err => console.warn("Repeat playback error:", err));
        return;
      }

      // Always call latest playNext via ref so lock-screen / background autoplay works
      const next = playNextRef.current;
      if (typeof next === 'function') {
        next();
      }
    };

    const handleError = (e) => {
      console.warn("Audio playback error event, attempting failover:", audio.error);
      const track = currentTrackRef.current;
      if (track && !audio.__didFailover) {
        audio.__didFailover = true;
        // Search exact iTunes stream as reliable failover
        resolveExactSongAudio(track.title, track.artist).then(resolved => {
          if (resolved && resolved.audioUrl && resolved.audioUrl !== audio.src) {
            console.log("Automatic failover to working audio stream:", resolved.audioUrl);
            audio.src = resolved.audioUrl;
            audio.play().then(() => {
              setIsPlaying(true);
              setIsBuffering(false);
              setPlaybackError(null);
            }).catch(() => {
              triggerToast(`⚠️ Skipped unavailable song: ${track.title}`);
              setTimeout(() => { playNextRef.current?.(); }, 1000);
            });
            return;
          } else {
            triggerToast(`⚠️ Song unavailable. Playing next song...`);
            setTimeout(() => { playNextRef.current?.(); }, 1000);
          }
        }).catch(() => {
          triggerToast(`⚠️ Song unavailable. Playing next song...`);
          setTimeout(() => { playNextRef.current?.(); }, 1000);
        });
      } else {
        setIsBuffering(false);
        setIsPlaying(false);
        setPlaybackError(null);
        triggerToast(`⚠️ Audio error. Playing next song...`);
        setTimeout(() => { playNextRef.current?.(); }, 1000);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const persistPlaybackNow = (wasPlayingOverride) => {
    const audio = audioRef.current;
    const t = currentTrackRef.current;
    if (!t || !audio) return;
    savePlaybackSession({
      track: t,
      queue: queueRef.current,
      queueIndex: queueIndexRef.current,
      position: audio.currentTime || 0,
      wasPlaying:
        typeof wasPlayingOverride === 'boolean' ? wasPlayingOverride : !audio.paused,
    });
  };

  // Restore last song + seek position after app reopen (do not jump to first mock track)
  useEffect(() => {
    if (didRestoreSessionRef.current) return;
    const session = initialSessionRef.current;
    if (!session?.track) {
      didRestoreSessionRef.current = true;
      return;
    }
    didRestoreSessionRef.current = true;

    const audio = audioRef.current;
    const track = normalizeTrackForPlayback(session.track);
    currentTrackRef.current = track;
    setCurrentTrack(track);
    const q = session.queue?.length ? session.queue : [track];
    setQueue(q);
    queueRef.current = q;
    const idx = Math.min(Math.max(0, session.queueIndex || 0), q.length - 1);
    setQueueIndex(idx);
    queueIndexRef.current = idx;

    const streamUrl = track.audioUrl || track.previewUrl || null;
    if (!streamUrl || !audio) return;

    const targetPos = Math.max(0, Number(session.position) || 0);
    const shouldResumePlay = Boolean(session.wasPlaying);

    const applySeekAndMaybePlay = () => {
      try {
        const max = Number.isFinite(audio.duration) && audio.duration > 0
          ? Math.max(0, audio.duration - 0.35)
          : targetPos;
        const seekTo = Math.min(targetPos, max);
        if (seekTo > 0) audio.currentTime = seekTo;
        setCurrentTime(seekTo);
        setDuration(audio.duration || track.durationSec || 0);
      } catch (_) {}

      updateMediaSession(track, shouldResumePlay);
      if (shouldResumePlay) {
        setIsPlaying(true);
        notifyAndroidPlayback(track.title, track.artist || track.director, true);
        audio.play().then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
        }).catch(() => {
          // Browser may block autoplay until user taps — keep song + position ready
          setIsPlaying(false);
          persistPlaybackNow(false);
        });
      } else {
        setIsPlaying(false);
      }
    };

    try {
      audio.src = streamUrl;
      audio.load();
    } catch (_) {}

    if (audio.readyState >= 1) {
      applySeekAndMaybePlay();
    } else {
      audio.addEventListener('loadedmetadata', applySeekAndMaybePlay, { once: true });
    }
  }, []);

  // Keep WebView timers + audio alive when phone locks / app backgrounds
  useEffect(() => {
    const onVisibility = () => {
      keepAndroidTimersAlive();
      const audio = audioRef.current;
      if (!audio) return;
      if (document.visibilityState === 'hidden') {
        persistPlaybackNow(!audio.paused);
        if (!audio.paused) {
          const t = currentTrackRef.current;
          if (t) {
            updateMediaSession(t, true);
            notifyAndroidPlayback(t.title, t.artist);
          }
        }
      }
      if (document.visibilityState === 'visible' && isPlayingRef.current && audio.paused && audio.src) {
        audio.play().catch(() => {});
      }
    };

    const onPageHide = () => {
      persistPlaybackNow();
      keepAndroidTimersAlive();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('freeze', onPageHide);

    let removeCapListener = null;
    (async () => {
      try {
        const { App } = await import('@capacitor/app');
        removeCapListener = await App.addListener('appStateChange', ({ isActive }) => {
          keepAndroidTimersAlive();
          if (!isActive) {
            persistPlaybackNow();
            const t = currentTrackRef.current;
            if (t && !audioRef.current?.paused) {
              updateMediaSession(t, true);
              notifyAndroidPlayback(t.title, t.artist);
            }
          } else if (isPlayingRef.current && audioRef.current?.paused && audioRef.current?.src) {
            audioRef.current.play().catch(() => {});
          }
        });
      } catch (_) {}
    })();

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('freeze', onPageHide);
      try { removeCapListener?.remove?.(); } catch (_) {}
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      updateMediaSession(currentTrackRef.current, false);
    } else {
      if (previewEnded) {
        audio.currentTime = 0;
        setCurrentTime(0);
        setPreviewEnded(false);
      }
      if (!audio.src && currentTrack) {
        audio.src = currentTrack.audioUrl || getSafeAudioUrl(currentTrack);
      }
      audio.play().then(() => {
        setIsPlaying(true);
        setPlaybackError(null);
      }).catch(err => {
        console.warn("Audio play failed:", err);
        setIsPlaying(false);
      });
    }
  };

  const FULL_LENGTH_POOL = [
    "https://archive.org/download/anirudh-hit-songs-tamil-128k/A-Love-Blossoms-Instrumental.mp3",
    "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aaacha-Paatcha-MassTamilan.com.mp3",
    "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aada%20Sonnaal.mp3",
    "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aadaatha-Manamum-MassTamilan.fm.mp3",
    "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aadi%20Sivan%20Tholil%20Irukkum.mp3",
    "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aadi-Varattum-MassTamilan.com.mp3",
    "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aadi_Pattam.mp3",
    "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aadi_Pizhaithaalum_Paadi_Pizhaithaalum_%5BMassWala.Com%5D.mp3",
    "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aadidu%20Peyygaley.mp3",
    "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aadiyae-Attam-Enna-MassTamilan.fm.mp3"
  ];

  // Play safe audio URL helper
  const getSafeAudioUrl = (track, index = 0) => {
    if (track && track.audioUrl) {
      return track.audioUrl;
    }
    return '';
  };

  /** Strip remasters / "From Album" noise so duplicate catalog rows compare equal */
  const normalizeSongTitle = (title = '') =>
    String(title)
      .toLowerCase()
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/['"''']/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  /** True when next/prev should treat two queue rows as the same listen */
  const isSameListeningSong = (a, b) => {
    if (!a || !b) return false;
    if (a === b) return true;
    if (a.id && b.id && a.id === b.id) return true;
    if (a.saavnId && b.saavnId && String(a.saavnId) === String(b.saavnId)) return true;
    if (a.audioUrl && b.audioUrl && a.audioUrl === b.audioUrl) return true;
    const t1 = normalizeSongTitle(a.title);
    const t2 = normalizeSongTitle(b.title);
    return Boolean(t1) && t1 === t2;
  };

  const resolveQueueIndex = (activeQueue, trackToPlay, preferredIndex = null) => {
    if (
      typeof preferredIndex === 'number' &&
      preferredIndex >= 0 &&
      preferredIndex < activeQueue.length
    ) {
      return preferredIndex;
    }

    // Exact object / id first — never collapse duplicates by title alone
    let idx = activeQueue.findIndex((t) => t === trackToPlay);
    if (idx === -1 && trackToPlay?.id) {
      idx = activeQueue.findIndex((t) => t?.id && t.id === trackToPlay.id);
    }
    if (idx === -1 && trackToPlay?.saavnId) {
      idx = activeQueue.findIndex(
        (t) => t?.saavnId && String(t.saavnId) === String(trackToPlay.saavnId)
      );
    }
    if (idx === -1) {
      const wantTitle = normalizeSongTitle(trackToPlay?.title);
      const wantAlbum = normalizeSongTitle(trackToPlay?.album || trackToPlay?.film || '');
      const from = Math.max(0, queueIndexRef.current);
      idx = activeQueue.findIndex((t, i) => {
        if (i < from) return false;
        if (normalizeSongTitle(t?.title) !== wantTitle) return false;
        if (!wantAlbum) return true;
        return normalizeSongTitle(t?.album || t?.film || '') === wantAlbum;
      });
      if (idx === -1) {
        idx = activeQueue.findIndex((t) => normalizeSongTitle(t?.title) === wantTitle);
      }
    }
    return idx !== -1 ? idx : 0;
  };

  const flushListeningSession = (opts = {}) => {
    const session = playSessionRef.current;
    if (!session) return;
    const now = Date.now();
    let secs = Number(session.accumulatedSec) || 0;
    if (session.tickingSince) {
      secs += Math.max(0, Math.floor((now - session.tickingSince) / 1000));
    }
    const playBump = opts.countPlay ? 1 : 0;
    playSessionRef.current = opts.keepSession
      ? { ...session, accumulatedSec: 0, tickingSince: opts.resumeTick ? now : null }
      : null;

    const user = currentUserRef.current;
    const role = String(user?.role || '').toLowerCase();
    if (!user?.id || role === 'admin' || role === 'super_admin') return;
    if (secs < 1 && playBump < 1) return;

    recordSongPlay({
      userId: user.id,
      songId: session.songId,
      title: session.title,
      artist: session.artist,
      coverUrl: session.coverUrl,
      listenSeconds: secs,
      playCount: playBump
    }).catch(() => {});
  };

  const beginListeningSession = (trackToPlay) => {
    flushListeningSession({ countPlay: false });
    const user = currentUserRef.current;
    const role = String(user?.role || '').toLowerCase();
    if (!user?.id || role === 'admin' || role === 'super_admin') {
      playSessionRef.current = null;
      return;
    }
    const songId = String(trackToPlay?.id || trackToPlay?.rawId || '').trim();
    if (!songId) return;
    playSessionRef.current = {
      songId,
      title: trackToPlay.title || 'Unknown',
      artist: trackToPlay.artist || '',
      coverUrl: trackToPlay.coverUrl || trackToPlay.image || trackToPlay.albumArt || null,
      accumulatedSec: 0,
      tickingSince: Date.now()
    };
    flushListeningSession({ countPlay: true, keepSession: true, resumeTick: true });
  };

  const playTrack = (track, newQueue = null, preferredIndex = null) => {
    if (!track) return;
    const audio = audioRef.current;

    // Gracefully stop active playback before loading new source
    try {
      audio.pause();
    } catch (_) {}
    audio.__didFailover = false;

    setPlaybackError(null);
    setPreviewEnded(false);
    setIsBuffering(true);

    let trackToPlay = normalizeTrackForPlayback(track);
    const isTrackPreview = trackToPlay.isPreview;

    currentTrackRef.current = trackToPlay;
    setCurrentTrack(trackToPlay);
    setCurrentTime(0);
    setDuration(trackToPlay.durationSec);

    // Analytics for Admin / Super Admin listening dashboards
    try {
      beginListeningSession(trackToPlay);
    } catch (_) {}

    // 2. Store song in Phone Local Storage & Recently Played History
    try {
      saveTrackToPhone(trackToPlay);
      addRecentlyPlayed(trackToPlay);
      setPhoneStoredTracks(getPhoneStoredTracks());
      setRecentlyPlayedTracks(getRecentlyPlayed());
      setStorageStats(getPhoneStorageStats());
    } catch (e) {
      console.warn("Phone storage cache note:", e);
    }

    const activeQueue = (newQueue && newQueue.length > 0)
      ? newQueue
      : ((queueRef.current && queueRef.current.length > 0) ? queueRef.current : tracks);
    setQueue(activeQueue);
    queueRef.current = activeQueue;

    const validIdx = resolveQueueIndex(activeQueue, trackToPlay, preferredIndex);
    setQueueIndex(validIdx);
    queueIndexRef.current = validIdx;

    savePlaybackSession({
      track: trackToPlay,
      queue: activeQueue,
      queueIndex: validIdx,
      position: 0,
      wasPlaying: true,
    });

    // 3. Set new audio source and trigger playback immediately (sync play keeps lock-screen autoplay allowed)
    const startPlaybackWithUrl = (streamUrl) => {
      if (!streamUrl) return;
      keepAndroidTimersAlive();
      try {
        if (audio.src !== streamUrl) {
          audio.src = streamUrl;
          audio.load();
        }
      } catch (_) {}

      setIsPlaying(true);
      updateMediaSession(trackToPlay, true);
      notifyAndroidPlayback(trackToPlay.title, trackToPlay.artist);

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
          setPlaybackError(null);
          updateMediaSession(currentTrackRef.current || trackToPlay, true);
          preloadNextTrack();
        }).catch(err => {
          setIsBuffering(false);
          if (err.name !== 'AbortError') {
            console.warn("Direct play notice:", err.message);
            // Retry once immediately (important when screen is locked)
            setTimeout(() => {
              audio.play().then(() => {
                setIsPlaying(true);
                setIsBuffering(false);
                notifyAndroidPlayback(trackToPlay.title, trackToPlay.artist);
              }).catch(() => {
                resolveExactSongAudio(trackToPlay.title, trackToPlay.artist).then(resolved => {
                  if (resolved && resolved.audioUrl && resolved.audioUrl !== streamUrl) {
                    audio.src = resolved.audioUrl;
                    audio.play().then(() => {
                      setIsPlaying(true);
                      setIsBuffering(false);
                      notifyAndroidPlayback(trackToPlay.title, trackToPlay.artist);
                    }).catch(() => {
                      setIsPlaying(false);
                      setPlaybackError("Failed to play audio stream.");
                      triggerToast('⚠️ Skipping broken song…');
                      setTimeout(() => { playNextRef.current?.(); }, 500);
                    });
                  } else {
                    setIsPlaying(false);
                    setPlaybackError("Failed to play audio stream.");
                    triggerToast('⚠️ Skipping broken song…');
                    setTimeout(() => { playNextRef.current?.(); }, 500);
                  }
                }).catch(() => {
                  setIsPlaying(false);
                  setPlaybackError("Failed to play audio stream.");
                  triggerToast('⚠️ Skipping broken song…');
                  setTimeout(() => { playNextRef.current?.(); }, 500);
                });
              });
            }, 250);
          }
        });
      }
    };

    // 1. If track already has an audioUrl (genuine song/preview), PLAY IT DIRECTLY!
    // Never play a random instrumental or swap streams mid-playback!
    if (trackToPlay.audioUrl) {
      startPlaybackWithUrl(trackToPlay.audioUrl);

      // Background duration/metadata enrichment only (does NOT replace audio.src)
      resolveLongestDurationAudio(trackToPlay).then(bestAudio => {
        if (bestAudio) {
          const isPrev = Boolean(bestAudio.isPreview);
          const enriched = {
            ...trackToPlay,
            durationSec: bestAudio.durationSec || trackToPlay.durationSec,
            duration: bestAudio.duration || trackToPlay.duration,
            quality: bestAudio.quality || (isPrev ? '30s Preview' : 'Full HQ'),
            apiSource: bestAudio.apiName,
            isPreview: isPrev,
            isFullSong: !isPrev
          };
          currentTrackRef.current = enriched;
          setCurrentTrack(prev => ({ ...prev, ...enriched }));
          setDuration(enriched.durationSec);
          updateMediaSession(enriched);
        }
      }).catch(() => {});
    } else {
      // 2. Track has no audioUrl: resolve exact stream before playing
      setIsBuffering(true);
      resolveLongestDurationAudio(trackToPlay).then(bestAudio => {
        if (bestAudio && bestAudio.audioUrl) {
          const isPrev = Boolean(bestAudio.isPreview);
          trackToPlay.audioUrl = bestAudio.audioUrl;
          trackToPlay.durationSec = bestAudio.durationSec || trackToPlay.durationSec;
          trackToPlay.duration = bestAudio.duration || trackToPlay.duration;
          trackToPlay.isPreview = isPrev;
          trackToPlay.isFullSong = !isPrev;
          currentTrackRef.current = trackToPlay;
          setCurrentTrack({ ...trackToPlay });
          setDuration(trackToPlay.durationSec);
          updateMediaSession(trackToPlay);
          startPlaybackWithUrl(bestAudio.audioUrl);
        } else {
          resolveExactSongAudio(trackToPlay.title, trackToPlay.artist).then(exact => {
            if (exact && exact.audioUrl) {
              trackToPlay.audioUrl = exact.audioUrl;
              currentTrackRef.current = trackToPlay;
              setCurrentTrack({ ...trackToPlay });
              updateMediaSession(trackToPlay);
              startPlaybackWithUrl(exact.audioUrl);
            } else {
              setIsBuffering(false);
              setIsPlaying(false);
              setPlaybackError(`Audio stream not found for "${trackToPlay.title}".`);
              triggerToast(`⚠️ Audio unavailable for "${trackToPlay.title}". Playing next song...`);
              setTimeout(() => { playNextRef.current?.(); }, 600);
            }
          }).catch(() => {
            setIsBuffering(false);
            setIsPlaying(false);
            triggerToast(`⚠️ Playback error. Playing next song...`);
            setTimeout(() => { playNextRef.current?.(); }, 600);
          });
        }
      }).catch(err => {
        console.warn("Background audio resolution error:", err);
        setIsBuffering(false);
        setIsPlaying(false);
        triggerToast(`⚠️ Playback error. Playing next song...`);
        setTimeout(() => { playNextRef.current?.(); }, 600);
      });
    }

      };

  /** One tap: queue every known song and start from the first */
  const playAllSongs = (songList = null) => {
    const phoneSongs = Array.isArray(phoneStoredTracks) ? phoneStoredTracks : [];
    const pool = Array.isArray(songList) && songList.length > 0
      ? songList
      : [...CURATED_TRACKS, ...MOCK_TRACKS, ...phoneSongs];

    // Deduplicate by title+artist
    const seen = new Set();
    const allSongs = [];
    for (const t of pool) {
      if (!t) continue;
      const key = `${(t.title || '').toLowerCase().trim()}::${(t.artist || '').toLowerCase().trim()}`;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      allSongs.push(t);
    }

    if (allSongs.length === 0) {
      triggerToast('⚠️ No songs available to play');
      return;
    }

    setQueue(allSongs);
    queueRef.current = allSongs;
    setQueueIndex(0);
    queueIndexRef.current = 0;
    triggerToast(`▶️ Playing all ${allSongs.length} songs`);
    playTrack(allSongs[0], allSongs);
  };

  const stopTrack = () => {
    const audio = audioRef.current;
    suppressAndroidNotifyRef.current = true;
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
    stopAndroidPlayback();
    releaseWakeLock();
    try {
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    } catch (_) {}
    setTimeout(() => { suppressAndroidNotifyRef.current = false; }, 500);
  };

  // Intelligent Helper: find next track from SAME MOVIE or SAME MUSIC DIRECTOR
  const findNextRelatedTrack = async (current, activeQueue = []) => {
    if (!current) return null;

    const currentMovie = (current.album || current.film || '').toLowerCase().trim();
    const currentDirector = (current.director || current.composer || '').toLowerCase().trim();
    const currentLang = (current.language || 'tamil').toLowerCase().trim();

    // 1. Check in activeQueue (same movie or same director)
    if (activeQueue && activeQueue.length > 1) {
      if (currentMovie && currentMovie !== 'single') {
        const qMovie = activeQueue.find(t =>
          t.id !== current.id &&
          t.title.toLowerCase().trim() !== current.title.toLowerCase().trim() &&
          ((t.album && t.album.toLowerCase().trim() === currentMovie) || (t.film && t.film.toLowerCase().trim() === currentMovie))
        );
        if (qMovie) return qMovie;
      }

      if (currentDirector) {
        const qDir = activeQueue.find(t =>
          t.id !== current.id &&
          t.title.toLowerCase().trim() !== current.title.toLowerCase().trim() &&
          ((t.director && t.director.toLowerCase().includes(currentDirector)) || (t.composer && t.composer.toLowerCase().includes(currentDirector)))
        );
        if (qDir) return qDir;
      }
    }

    // 2. Check in local CURATED_TRACKS pool
    if (currentMovie && currentMovie !== 'single') {
      const curMovie = CURATED_TRACKS.find(t =>
        t.id !== current.id &&
        t.title.toLowerCase().trim() !== current.title.toLowerCase().trim() &&
        ((t.album && t.album.toLowerCase().trim() === currentMovie) || (t.film && t.film.toLowerCase().trim() === currentMovie))
      );
      if (curMovie) return curMovie;
    }

    if (currentDirector) {
      const curDir = CURATED_TRACKS.find(t =>
        t.id !== current.id &&
        t.title.toLowerCase().trim() !== current.title.toLowerCase().trim() &&
        ((t.director && t.director.toLowerCase().includes(currentDirector)) || (t.composer && t.composer.toLowerCase().includes(currentDirector)))
      );
      if (curDir) return curDir;
    }

    // 3. Dynamic Search: fetch songs from JioSaavn for the SAME MOVIE first, then SAME MUSIC DIRECTOR
    try {
      if (currentMovie && currentMovie !== 'single' && currentMovie !== 'soundtrack') {
        const movieResults = await searchSongsFromApi(`${current.album || current.film} ${currentLang}`, 15, currentLang);
        if (Array.isArray(movieResults)) {
          const nextMovie = movieResults.find(t =>
            t.id !== current.id &&
            t.title.toLowerCase().trim() !== current.title.toLowerCase().trim()
          );
          if (nextMovie) return nextMovie;
        }
      }

      if (currentDirector) {
        const dirResults = await fetchDirectorHitsFromApi(current.director || current.composer, 25, currentLang);
        if (Array.isArray(dirResults)) {
          const nextDir = dirResults.find(t =>
            t.id !== current.id &&
            t.title.toLowerCase().trim() !== current.title.toLowerCase().trim()
          );
          if (nextDir) return nextDir;
        }
      }
    } catch (err) {
      console.warn("Auto-next related track search error:", err);
    }

    return null;
  };

  const playNext = async () => {
    keepAndroidTimersAlive();
    const startTrack = (track, q, preferredIndex = null) => {
      const fn = playTrackRef.current || playTrack;
      fn(track, q, preferredIndex);
    };

    const activeQueue = (queueRef.current && queueRef.current.length > 0)
      ? queueRef.current
      : ((queue && queue.length > 0) ? queue : tracks);
    const curIdx = queueIndexRef.current;
    const shuffleActive = isShuffleRef.current;
    const current = currentTrackRef.current || currentTrack || activeQueue[curIdx];

    // 1. SHUFFLE MODE — pick a different song (not just a different index)
    if (shuffleActive) {
      if (activeQueue.length > 1) {
        const candidateIndices = activeQueue
          .map((_, i) => i)
          .filter((i) => i !== curIdx && !isSameListeningSong(current, activeQueue[i]));
        const pool = candidateIndices.length > 0
          ? candidateIndices
          : activeQueue.map((_, i) => i).filter((i) => i !== curIdx);
        const randomIdx = pool[Math.floor(Math.random() * pool.length)];
        const nextTrack = activeQueue[randomIdx];
        if (nextTrack) {
          setQueueIndex(randomIdx);
          queueIndexRef.current = randomIdx;
          startTrack(nextTrack, activeQueue, randomIdx);
          return;
        }
      } else {
        const availablePool = CURATED_TRACKS.filter((t) => !isSameListeningSong(current, t));
        if (availablePool.length > 0) {
          const randomTrack = availablePool[Math.floor(Math.random() * availablePool.length)];
          const newQueue = [...activeQueue, randomTrack];
          setQueue(newQueue);
          queueRef.current = newQueue;
          setQueueIndex(newQueue.length - 1);
          queueIndexRef.current = newQueue.length - 1;
          startTrack(randomTrack, newQueue, newQueue.length - 1);
          return;
        }
      }
    }

    // 2. SEQUENTIAL MODE: skip duplicate title/id rows so Next is always a different song
    if (curIdx + 1 < activeQueue.length) {
      let nextIdx = curIdx + 1;
      while (
        nextIdx < activeQueue.length &&
        isSameListeningSong(current, activeQueue[nextIdx])
      ) {
        nextIdx += 1;
      }
      if (nextIdx < activeQueue.length) {
        setQueueIndex(nextIdx);
        queueIndexRef.current = nextIdx;
        const nextTrack = activeQueue[nextIdx];
        if (nextTrack) {
          startTrack(nextTrack, activeQueue, nextIdx);
          return;
        }
      }
    }

    // 3. Repeat All — land on first track that differs from current when possible
    if (isRepeatRef.current === 'all' && activeQueue.length > 0) {
      let wrapIdx = 0;
      while (
        wrapIdx < activeQueue.length &&
        isSameListeningSong(current, activeQueue[wrapIdx])
      ) {
        wrapIdx += 1;
      }
      if (wrapIdx >= activeQueue.length) wrapIdx = 0;
      setQueueIndex(wrapIdx);
      queueIndexRef.current = wrapIdx;
      startTrack(activeQueue[wrapIdx], activeQueue, wrapIdx);
      return;
    }

    // 4. Smart Autoplay: Find related track from same movie / music director
    if (current) {
      const smartNext = await findNextRelatedTrack(current, activeQueue);
      if (smartNext && !isSameListeningSong(current, smartNext)) {
        const isSameFilm = smartNext.album && current.album && smartNext.album.toLowerCase().trim() === current.album.toLowerCase().trim();
        const reasonBadge = isSameFilm
          ? `🎬 Movie: ${smartNext.album}`
          : `🎼 Composer: ${smartNext.director || current.director || 'Artist'}`;
        triggerToast(`▶️ Next Up (${reasonBadge}): ${smartNext.title}`);
        const updatedQueue = [...activeQueue, smartNext];
        setQueue(updatedQueue);
        queueRef.current = updatedQueue;
        setQueueIndex(updatedQueue.length - 1);
        queueIndexRef.current = updatedQueue.length - 1;
        startTrack(smartNext, updatedQueue, updatedQueue.length - 1);
        return;
      }
    }

    // 5. Endless Autoplay Fallback: pick another song from CURATED_TRACKS
    const fallbackCandidates = CURATED_TRACKS.filter((t) =>
      !isSameListeningSong(current, t) &&
      !activeQueue.some((q) => isSameListeningSong(q, t))
    );
    if (fallbackCandidates.length > 0) {
      const fallbackTrack = fallbackCandidates[Math.floor(Math.random() * Math.min(25, fallbackCandidates.length))];
      const updatedQueue = [...activeQueue, fallbackTrack];
      setQueue(updatedQueue);
      queueRef.current = updatedQueue;
      setQueueIndex(updatedQueue.length - 1);
      queueIndexRef.current = updatedQueue.length - 1;
      startTrack(fallbackTrack, updatedQueue, updatedQueue.length - 1);
      return;
    }

    // 6. Wrap around to first different song so music never stops
    if (activeQueue.length > 0) {
      let wrapIdx = 0;
      while (
        wrapIdx < activeQueue.length &&
        isSameListeningSong(current, activeQueue[wrapIdx])
      ) {
        wrapIdx += 1;
      }
      if (wrapIdx >= activeQueue.length) wrapIdx = 0;
      setQueueIndex(wrapIdx);
      queueIndexRef.current = wrapIdx;
      startTrack(activeQueue[wrapIdx], activeQueue, wrapIdx);
    }
  };

  const playPrev = () => {
    keepAndroidTimersAlive();
    const activeQueue = (queueRef.current && queueRef.current.length > 0) ? queueRef.current : tracks;
    if (!activeQueue || activeQueue.length === 0) return;

    if (currentTime > 5) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    const curIdx = queueIndexRef.current;
    const current = currentTrackRef.current || activeQueue[curIdx];
    let prevIdx = (curIdx - 1 + activeQueue.length) % activeQueue.length;
    let guard = 0;
    while (
      guard < activeQueue.length &&
      isSameListeningSong(current, activeQueue[prevIdx])
    ) {
      prevIdx = (prevIdx - 1 + activeQueue.length) % activeQueue.length;
      guard += 1;
    }
    setQueueIndex(prevIdx);
    queueIndexRef.current = prevIdx;
    const prevTrack = activeQueue[prevIdx];
    if (prevTrack) {
      (playTrackRef.current || playTrack)(prevTrack, activeQueue, prevIdx);
    }
  };

  const removeFromQueue = (index) => {
    const current = queueRef.current || [];
    if (index < 0 || index >= current.length) return;
    const next = current.filter((_, i) => i !== index);
    const cur = queueIndexRef.current;
    setQueue(next);
    queueRef.current = next;
    if (next.length === 0) {
      setQueueIndex(0);
      queueIndexRef.current = 0;
      stopTrack();
      return;
    }
    if (index < cur) {
      const nextIndex = cur - 1;
      setQueueIndex(nextIndex);
      queueIndexRef.current = nextIndex;
      return;
    }
    if (index === cur) {
      const nextIndex = Math.min(index, next.length - 1);
      setQueueIndex(nextIndex);
      queueIndexRef.current = nextIndex;
      playTrack(next[nextIndex], next, nextIndex);
    }
  };

  const moveQueueItem = (from, to) => {
    const list = [...(queueRef.current || [])];
    if (from < 0 || to < 0 || from >= list.length || to >= list.length || from === to) return;
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    let cur = queueIndexRef.current;
    if (cur === from) cur = to;
    else if (from < cur && to >= cur) cur -= 1;
    else if (from > cur && to <= cur) cur += 1;
    setQueue(list);
    queueRef.current = list;
    setQueueIndex(cur);
    queueIndexRef.current = cur;
  };

  const playQueueIndex = (index) => {
    const list = queueRef.current || [];
    const track = list[index];
    if (!track) return;
    playTrack(track, list, index);
  };

  // Keep refs pointing at latest functions (ended / MediaSession / lock-screen)
  playNextRef.current = playNext;
  playTrackRef.current = playTrack;
  playPrevRef.current = playPrev;

  if (typeof window !== 'undefined') {
    window.__mediaControl = (action) => {
      const command = String(action || '');
      const audio = audioRef.current;
      if (command === 'next') {
        playNextRef.current?.();
        return;
      }
      if (command === 'prev' || command === 'previous') {
        playPrevRef.current?.();
        return;
      }
      if (command === 'pause') {
        try { audio.pause(); } catch (_) {}
        setIsPlaying(false);
        updateMediaSession(currentTrackRef.current, false);
        return;
      }
      if (command === 'play') {
        audio.play().then(() => {
          setIsPlaying(true);
          updateMediaSession(currentTrackRef.current, true);
        }).catch(() => {});
      }
    };
  }

  const toggleShuffle = () => {
    setIsShuffle(prev => {
      const next = !prev;
      isShuffleRef.current = next;
      triggerToast(next ? "🔀 Shuffle Mode ON (Any song will play automatically)" : "➡️ Shuffle Mode OFF (Order Play)");
      return next;
    });
  };

  const toggleRepeat = () => {
    setIsRepeat(prev => {
      const next = prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off';
      isRepeatRef.current = next;
      triggerToast(next === 'one' ? "🔂 Repeat 1 Song" : next === 'all' ? "🔁 Repeat All Queue" : "➡️ Repeat Off");
      return next;
    });
  };

  const seekTo = (seconds) => {
  const target = Math.max(0, Math.min(seconds, duration || audioRef.current.duration || 0));
  if (audioRef.current) {
    audioRef.current.currentTime = target;
  }
  setCurrentTime(target);
};

const seekForward10 = () => {
  const cur = audioRef.current?.currentTime || currentTime || 0;
  const maxDur = duration || audioRef.current?.duration || (cur + 10);
  const target = Math.min(maxDur, cur + 10);
  seekTo(target);
  triggerToast("⏩ +10s Forward");
  return target;
};

const seekBackward10 = () => {
  const cur = audioRef.current?.currentTime || currentTime || 0;
  const target = Math.max(0, cur - 10);
  seekTo(target);
  triggerToast("⏪ -10s Rewind");
  return target;
};

const seekBy = (deltaSeconds) => {
  const cur = audioRef.current?.currentTime || currentTime || 0;
  const maxDur = duration || audioRef.current?.duration || (cur + 10);
  const target = Math.max(0, Math.min(maxDur, cur + deltaSeconds));
  seekTo(target);
  triggerToast(deltaSeconds >= 0 ? `⏩ +${deltaSeconds}s` : `⏪ ${deltaSeconds}s`);
  return target;
};

const changeVolume = (val) => {
  setVolume(val);
  audioRef.current.volume = val;
  if (val === 0) setIsMuted(true);
  else setIsMuted(false);
};

const toggleMute = () => {
  if (isMuted) {
    audioRef.current.volume = volume || 0.5;
    setIsMuted(false);
  } else {
    audioRef.current.volume = 0;
    setIsMuted(true);
  }
};

const [autoDownloadLiked, setAutoDownloadLiked] = useState(() => {
  try {
    const saved = localStorage.getItem('spotify_auto_download_liked');
    return saved === null ? true : saved === 'true';
  } catch {
    return true;
  }
});

useEffect(() => {
  try {
    localStorage.setItem('spotify_auto_download_liked', String(autoDownloadLiked));
  } catch (_) {}
}, [autoDownloadLiked]);

const toggleAutoDownloadLiked = () => {
  setAutoDownloadLiked((prev) => {
    const next = !prev;
    triggerToast(next
      ? '📥 Liked songs will download to phone storage'
      : 'Liked songs will not auto-download');
    return next;
  });
};

const downloadLikedTrackToPhone = async (track) => {
  if (!track) return { saved: false, cached: false };
  let saved = false;
  let cached = false;
  try {
    saved = Boolean(saveTrackToPhone(track));
    setPhoneStoredTracks(getPhoneStoredTracks());
    setStorageStats(getPhoneStorageStats());
  } catch (e) {
    console.warn('Phone save on like failed:', e);
  }
  try {
    cached = Boolean(await cacheTrackAudioOffline(track));
  } catch (e) {
    console.warn('Offline audio cache on like failed:', e);
  }
  return { saved, cached };
};

const syncLikesToAccount = (nextIds, nextTracks, nextPlaylists = userPlaylists) => {
  const user = currentUserRef.current;
  if (!user?.id) return;
  saveAccountLibrary(user.id, {
    likedTrackIds: nextIds,
    likedTracks: nextTracks,
    playlists: nextPlaylists,
  }).then((res) => {
    if (res?.suspended) {
      triggerToast('⛔ Likes sync blocked — account suspended');
    } else if (!res?.ok) {
      console.warn('Like DB upsert failed:', res?.error);
    }
  }).catch((err) => console.warn('Like DB upsert:', err.message));
};

const toggleLike = (trackId, trackObj = null) => {
  const isCurrentlyLiked = likedTrackIds.includes(trackId);
  let nextIds = likedTrackIds;
  let nextTracks = likedTracksData;

  if (isCurrentlyLiked) {
    nextIds = likedTrackIds.filter((id) => id !== trackId);
    nextTracks = likedTracksData.filter((t) => t.id !== trackId);
    setLikedTrackIds(nextIds);
    setLikedTracksData(nextTracks);
    triggerToast('Removed from Liked Songs');
  } else {
    nextIds = likedTrackIds.includes(trackId) ? likedTrackIds : [...likedTrackIds, trackId];
    setLikedTrackIds(nextIds);

    const target = trackObj || (currentTrack?.id === trackId ? currentTrack : null);
    if (target) {
      const already = likedTracksData.some(
        (t) => t.id === trackId || (t.title === target.title && t.artist === target.artist)
      );
      nextTracks = already ? likedTracksData : [target, ...likedTracksData];
      setLikedTracksData(nextTracks);

      if (autoDownloadLiked) {
        downloadLikedTrackToPhone(target).then(({ saved, cached }) => {
          if (cached) {
            triggerToast(`💚 Liked & saved to account + offline: ${target.title}`);
          } else if (saved) {
            triggerToast(`💚 Liked & saved to account + phone: ${target.title}`);
          } else {
            triggerToast(`💚 Liked — saved to your account`);
          }
        });
      } else {
        triggerToast(`💚 Liked — saved to your account`);
      }
    } else {
      triggerToast('💚 Liked — saved to your account');
    }
  }

  // User-based MySQL upsert (same row updated; no new user_libraries row per like)
  syncLikesToAccount(nextIds, nextTracks);
};

const updateProfileAction = (updates = {}) => {
  try {
    const next = updateCurrentUserProfile(updates);
    setCurrentUser(next);
    const keys = Object.keys(updates || {});
    const onlyImages = keys.length > 0 && keys.every((k) => k === 'avatarUrl' || k === 'coverUrl');
    if (onlyImages) {
      const cleared = updates.avatarUrl === '' || updates.coverUrl === '';
      triggerToast(cleared ? 'Image removed' : '✅ Image saved to profile');
    } else {
      triggerToast(`✅ Profile updated — ${next.name}`);
    }
    return { ok: true, user: next };
  } catch (e) {
    triggerToast(`❌ Profile update failed: ${e.message || 'Unknown error'}`);
    return { ok: false, error: e.message };
  }
};

const [songCoverVersion, setSongCoverVersion] = useState(0);

const setSongCoverImage = (track, imageUrl) => {
  if (!track) {
    triggerToast('Play a song first, then set its cover');
    return { ok: false };
  }
  const ok = setSongCoverOverride(track, imageUrl || '');
  if (!ok) {
    triggerToast('❌ Could not save song cover');
    return { ok: false };
  }
  setSongCoverVersion((v) => v + 1);
  // Refresh now-playing UI / lock-screen art without mutating the API cover
  if (currentTrackRef.current && (
    (track.id && currentTrackRef.current.id === track.id) ||
    (track.title && currentTrackRef.current.title === track.title)
  )) {
    const refreshed = { ...currentTrackRef.current };
    currentTrackRef.current = refreshed;
    setCurrentTrack(refreshed);
    updateMediaSession(refreshed, isPlayingRef.current);
  }
  triggerToast(imageUrl ? `✅ Cover saved for “${track.title}”` : 'Song cover removed');
  return { ok: true };
};

const resolveSongCover = (track, fallback = '') => getSongCoverUrl(track, fallback);

const createPlaylistWithTracks = (title, description, coverUrl, trackList) => {
  const newPl = {
    id: `pl-user-${Date.now()}`,
    title: title || "My New Playlist",
    description: description || "Custom playlist created by you.",
    coverUrl: coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
    tracksCount: trackList.length,
    color: "#FF6B00",
    owner: "Dobby AI Bot",
    trackIds: trackList.map(t => t.id),
    customTracks: trackList
  };
  setUserPlaylists(prev => [newPl, ...prev]);
  setSelectedPlaylistId(newPl.id);
  setActiveView('playlist');
  triggerToast(`⚡ Created '${newPl.title}' with ${trackList.length} AI recommended tracks!`);
  return newPl;
};

const addTrackToPlaylist = (playlistId, trackId) => {
  setUserPlaylists(prev => prev.map(pl => {
    if (pl.id === playlistId) {
      if (!pl.trackIds.includes(trackId)) {
        return { ...pl, trackIds: [...pl.trackIds, trackId], tracksCount: pl.trackIds.length + 1 };
      }
    }
    return pl;
  }));
};

const navigateToPlaylist = (id) => {
  setSelectedPlaylistId(id);
  setActiveView('playlist');
};

// DobbyPay Wallet & Micropayments State
const [dobbyWallet, setDobbyWallet] = useState(() => {
  try {
    const saved = localStorage.getItem('dobby_wallet');
    return saved ? JSON.parse(saved) : { balance: 250.00, points: 1250, plan: 'VIP Pass Active' };
  } catch {
    return { balance: 250.00, points: 1250, plan: 'VIP Pass Active' };
  }
});

const [dobbyTransactions, setDobbyTransactions] = useState(() => {
  try {
    const saved = localStorage.getItem('dobby_transactions');
    return saved ? JSON.parse(saved) : [
      { id: 'tx-1', type: 'tip', artist: 'Neon Dreamers', trackTitle: 'Midnight City Lights', amount: 5.00, date: 'Today, 2:15 PM' },
      { id: 'tx-2', type: 'topup', artist: 'DobbyPay Wallet', trackTitle: '', amount: 50.00, date: 'Yesterday' }
    ];
  } catch {
    return [];
  }
});

// DobbyPay MySQL User Authentication State
const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(localStorage.getItem('dobbypay_current_user')));
const [showAuthModal, setShowAuthModal] = useState(false);

currentUserRef.current = currentUser;

// Pause / resume listen-time ticking; heartbeat flush every 15s while playing
useEffect(() => {
  const session = playSessionRef.current;
  if (!session) return undefined;

  if (isPlaying) {
    if (!session.tickingSince) session.tickingSince = Date.now();
    const timer = setInterval(() => {
      flushListeningSession({ countPlay: false, keepSession: true, resumeTick: true });
    }, 15000);
    return () => clearInterval(timer);
  }

  if (session.tickingSince) {
    session.accumulatedSec =
      (Number(session.accumulatedSec) || 0) +
      Math.max(0, Math.floor((Date.now() - session.tickingSince) / 1000));
    session.tickingSince = null;
  }
  return undefined;
}, [isPlaying]);

useEffect(() => {
  const onHide = () => flushListeningSession({ countPlay: false });
  window.addEventListener('beforeunload', onHide);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') onHide();
  });
  return () => {
    window.removeEventListener('beforeunload', onHide);
    flushListeningSession({ countPlay: false });
  };
}, []);

const [showWalletModal, setShowWalletModal] = useState(false);
const [showTipModal, setShowTipModal] = useState(false);
const [targetTipTrack, setTargetTipTrack] = useState(null);
const [toastMessage, setToastMessage] = useState(null);
const [isLosslessMode, setIsLosslessMode] = useState(true);

useEffect(() => {
  localStorage.setItem('dobby_wallet', JSON.stringify(dobbyWallet));
}, [dobbyWallet]);

useEffect(() => {
  localStorage.setItem('dobby_transactions', JSON.stringify(dobbyTransactions));
}, [dobbyTransactions]);

const triggerToast = (text) => {
  setToastMessage({ text });
  setTimeout(() => {
    setToastMessage(null);
  }, 3200);
};

const openTipModal = (track) => {
  setTargetTipTrack(track || currentTrack);
  setShowTipModal(true);
};

const sendTip = (track, amount, note) => {
  const tipAmount = parseFloat(amount) || 0;
  if (dobbyWallet.balance < tipAmount || tipAmount <= 0) return;

  setDobbyWallet(prev => ({
    ...prev,
    balance: prev.balance - tipAmount,
    points: prev.points + Math.round(tipAmount * 10)
  }));

  const newTx = {
    id: `tx-${Date.now()}`,
    type: 'tip',
    artist: track.artist,
    trackTitle: track.title,
    amount: tipAmount,
    note: note || '',
    date: 'Just now'
  };

  setDobbyTransactions(prev => [newTx, ...prev]);
  triggerToast(`⚡ Sent $${tipAmount.toFixed(2)} DobbyPay Tip to ${track.artist}!`);
};

const topUpWallet = (amount) => {
  const addAmt = parseFloat(amount) || 0;
  if (addAmt <= 0) return;

  setDobbyWallet(prev => ({
    ...prev,
    balance: prev.balance + addAmt,
    points: prev.points + Math.round(addAmt * 5)
  }));

  const newTx = {
    id: `tx-${Date.now()}`,
    type: 'topup',
    artist: 'DobbyPay Vault',
    trackTitle: 'Funds Added',
    amount: addAmt,
    date: 'Just now'
  };

  setDobbyTransactions(prev => [newTx, ...prev]);
  triggerToast(`💰 Added $${addAmt.toFixed(2)} to your DobbyPay Wallet!`);
};

// Authentication Actions (MySQL backed)
const loginUserAction = async (identifier, password) => {
  try {
    const res = await loginUser({ identifier, password });
    if (res.success && res.user) {
      setCurrentUser(res.user);
      setIsLoggedIn(true);
      if (res.user.wallet_balance !== undefined) {
        setDobbyWallet(prev => ({
          ...prev,
          balance: Number(res.user.wallet_balance),
          points: Number(res.user.reward_points || prev.points),
          plan: res.user.vip_status ? 'VIP Pass Active' : 'Standard'
        }));
      }
      triggerToast(`⚡ Welcome back, ${res.user.name || res.user.full_name || res.user.username}!`);
      return { success: true, user: res.user };
    }
    if (res.notApproved || res.suspended) {
      return {
        success: false,
        notApproved: true,
        suspended: !!res.suspended,
        reactivationRequested: !!res.reactivationRequested,
        error: res.error,
        user: res.user,
        adminWhatsApp: res.adminWhatsApp || '+918270006116'
      };
    }
    return {
      success: false,
      userNotFound: !!res.userNotFound,
      wrongPassword: !!res.wrongPassword,
      error: res.error || 'Login failed'
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const registerUserAction = async ({ username, email, password, fullName, phone }) => {
  try {
    const res = await registerUser({ username, email, password, fullName, phone });
    if (res.success && res.user) {
      // User stored in MySQL database as pending approval
      // DO NOT log them in directly! They must be approved by Admin & Super Admin first.
      triggerToast(`✅ Registered ${res.user.name || res.user.username}! Awaiting Admin & Super Admin approval.`);
      return {
        success: true,
        pendingApproval: true,
        user: res.user,
        message: res.message || 'Registration submitted! Please wait for Admin & Super Admin approval before logging in.',
        adminWhatsApp: res.adminWhatsApp || null,
        whatsappUrl: res.whatsappUrl || null,
        whatsappSent: !!res.whatsappSent,
        whatsappStatus: res.whatsappStatus || null,
      };
    }
    return {
      success: false,
      alreadyExists: !!res.alreadyExists,
      error: res.error || 'Registration failed'
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const libraryHydratedFor = useRef(null);
const applyingRemoteLibrary = useRef(false);

const logoutUserAction = () => {
  logoutUser();
  setCurrentUser(null);
  setIsLoggedIn(false);
  libraryHydratedFor.current = null;
  applyingRemoteLibrary.current = true;
  setLikedTrackIds([]);
  setLikedTracksData([]);
  try { sessionStorage.removeItem('dobbypay_guest_session'); } catch (_) {}
  triggerToast('👋 Signed out of DobbyPay');
};

useEffect(() => {
  const userId = currentUser?.id;
  if (!userId) {
    libraryHydratedFor.current = null;
    return undefined;
  }
  let cancelled = false;
  libraryHydratedFor.current = null;
  // Clear previous account's likes until this user's DB payload loads
  applyingRemoteLibrary.current = true;
  setLikedTrackIds([]);
  setLikedTracksData([]);
  (async () => {
    try {
      const remote = await fetchAccountLibrary(userId);
      if (cancelled) return;
      applyingRemoteLibrary.current = true;
      setLikedTrackIds(remote.likedTrackIds || []);
      setLikedTracksData(remote.likedTracks || []);
      if (Array.isArray(remote.playlists)) setUserPlaylists(remote.playlists);
      const n = (remote.likedTrackIds || []).length;
      if (n > 0) {
        triggerToast(`💚 Restored ${n} liked song${n === 1 ? '' : 's'} from your account`);
      }
    } catch (err) {
      console.warn('Library sync:', err.message);
    } finally {
      if (!cancelled) libraryHydratedFor.current = String(userId);
    }
  })();
  return () => { cancelled = true; };
}, [currentUser?.id]);

useEffect(() => {
  const userId = currentUser?.id;
  if (!userId || libraryHydratedFor.current !== String(userId)) return undefined;
  if (applyingRemoteLibrary.current) {
    applyingRemoteLibrary.current = false;
    return undefined;
  }
  const handle = setTimeout(() => {
    saveAccountLibrary(userId, {
      likedTrackIds,
      likedTracks: likedTracksData,
      playlists: userPlaylists,
    }).catch((err) => console.warn('Library save:', err.message));
  }, 800);
  return () => clearTimeout(handle);
}, [currentUser?.id, likedTrackIds, likedTracksData, userPlaylists]);



const toggleLosslessMode = () => {
  setIsLosslessMode(prev => {
    const nextState = !prev;
    triggerToast(nextState ? "⚡ DobbyPay 24-Bit Hi-Fi Lossless Mode Activated!" : "Standard Quality Mode Active");
    return nextState;
  });
};

  const saveToPhone = (trackToSave = currentTrack) => {
    if (!trackToSave) return;
    const ok = saveTrackToPhone(trackToSave);
    if (ok) {
      setPhoneStoredTracks(getPhoneStoredTracks());
      setStorageStats(getPhoneStorageStats());
      triggerToast(`📱 Saved "${trackToSave.title}" to Phone Storage! (ஆஃப்லைன் சேமிக்கப்பட்டது)`);
    }
  };

  const removeFromPhone = (trackId) => {
    if (!trackId) return;
    const ok = removeTrackFromPhone(trackId);
    if (ok) {
      setPhoneStoredTracks(getPhoneStoredTracks());
      setStorageStats(getPhoneStorageStats());
      triggerToast("🗑️ Removed from Phone Storage");
    }
  };

  const isSavedOnPhone = (trackId) => {
    return isSongSavedOnPhone(trackId);
  };

  const clearAllPhoneStorage = () => {
    clearPhoneStorage();
    setPhoneStoredTracks([]);
    setStorageStats(getPhoneStorageStats());
    triggerToast("🧹 Cleared all Phone Storage!");
  };

  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const userRole = String(currentUser?.role || '').toLowerCase();
  const isAdminRole = userRole === 'admin';
  const isSuperAdminRole = userRole === 'super_admin';
  const isSuperAdmin = isAdminRole || isSuperAdminRole;

  // Super Admin: Download and sync ALL catalog songs into local storage
  const downloadAllSongsToLocalStorage = async () => {
    try {
      triggerToast('🔄 Fetching all catalog songs from MySQL database...');
      let allSongs = [...CURATED_TRACKS, ...MOCK_TRACKS];

      // Fetch from Express MySQL catalog (/api/songs)
      try {
        const res = await apiFetch('songs?limit=1000');
        if (res.ok) {
          const data = await res.json();
          const songsList = data?.songs || data?.results || (Array.isArray(data) ? data : []);
          if (Array.isArray(songsList) && songsList.length > 0) {
            allSongs = [...songsList, ...allSongs];
          }
        }
      } catch (e) {
        console.warn('Express /api/songs fetch notice:', e.message);
      }

      // Batch save into localStorage
      const result = saveAllTracksToPhone(allSongs);
      setPhoneStoredTracks(getPhoneStoredTracks());
      setStorageStats(getPhoneStorageStats());
      triggerToast(`📥 Super Admin: Cached ${result.total} songs to Local Storage! (+${result.added} new)`);
      return result;
    } catch (err) {
      triggerToast(`❌ Error saving songs: ${err.message}`);
      return null;
    }
  };

  // Super Admin: Export all songs to JSON backup file
  const exportAllSongsBackup = () => {
    const count = exportTracksAsJson();
    triggerToast(`💾 Exported ${count} songs backup to file!`);
  };

  /** Download liked songs JSON (save before uninstall) */
  const exportLikedSongsBackup = () => {
    const catalog = [...(likedTracksData || []), ...MOCK_TRACKS, ...CURATED_TRACKS, ...(phoneStoredTracks || [])];
    const byId = new Map();
    catalog.forEach((t) => {
      if (t?.id && !byId.has(t.id)) byId.set(t.id, t);
    });

    const resolvedTracks = (likedTrackIds || [])
      .map((id) => byId.get(id))
      .filter(Boolean);

    // Keep any liked track objects that somehow lack an id match
    (likedTracksData || []).forEach((t) => {
      if (t?.id && !resolvedTracks.some((r) => r.id === t.id)) {
        resolvedTracks.push(t);
      }
    });

    const count = exportLikedSongsAsJson(
      likedTrackIds,
      resolvedTracks,
      `dobbypay_liked_songs_${new Date().toISOString().slice(0, 10)}.json`
    );
    triggerToast(`💾 Downloaded ${count} liked song${count === 1 ? '' : 's'} JSON`);
    return count;
  };

  /**
   * Restore liked songs from uploaded JSON text/object.
   * Merges with existing likes so nothing is wiped by accident.
   */
  const importLikedSongsFromJson = (raw) => {
    try {
      const { likedTrackIds: importedIds, likedTracks: importedTracks } = parseLikedSongsBackup(raw);

      setLikedTrackIds((prev) => {
        const next = new Set(prev);
        importedIds.forEach((id) => next.add(id));
        importedTracks.forEach((t) => next.add(t.id));
        return [...next];
      });

      setLikedTracksData((prev) => {
        const map = new Map();
        (prev || []).forEach((t) => {
          if (t?.id) map.set(t.id, t);
        });
        importedTracks.forEach((t) => {
          if (!t?.id) return;
          map.set(t.id, { ...(map.get(t.id) || {}), ...t });
        });
        return [...map.values()];
      });

      const n = importedTracks.length || importedIds.length;
      triggerToast(`💚 Restored ${n} liked song${n === 1 ? '' : 's'} — open Liked Songs`);
      return { ok: true, count: n };
    } catch (err) {
      triggerToast(`❌ Import failed: ${err.message || 'Invalid JSON'}`);
      return { ok: false, error: err.message };
    }
  };

  // Hardware & Capacitor Back Button Handling
  const handleBackButtonRef = useRef(() => false);
  handleBackButtonRef.current = () => {
    // 1. Close open modals / sheets first
    if (showQueue) { setShowQueue(false); return true; }
    if (showNowPlaying) { setShowNowPlaying(false); return true; }
    if (showLyrics) { setShowLyrics(false); return true; }
    if (showVisualizer) { setShowVisualizer(false); return true; }
    if (showThemeModal) { setShowThemeModal(false); return true; }
    if (showWalletModal) { setShowWalletModal(false); return true; }
    if (showTipModal) { setShowTipModal(false); return true; }
    if (showAuthModal) { setShowAuthModal(false); return true; }
    if (showSuperAdminModal) { setShowSuperAdminModal(false); return true; }
    if (showAdminPanel) { setShowAdminPanel(false); return true; }
    if (sidebarOpen) { setSidebarOpen(false); return true; }

    // 2. Previous screen in navigation stack (never close the app here)
    return goBackView();
  };

  useEffect(() => {
    window.__handleAndroidBackButton = () => {
      try {
        return !!handleBackButtonRef.current();
      } catch (_) {
        return false;
      }
    };

    let appListener = null;
    let lastTap = 0;
    try {
      import('@capacitor/app')
        .then(({ App: CapApp }) => {
          if (CapApp && typeof CapApp.addListener === 'function') {
            return CapApp.addListener('backButton', ({ canGoBack }) => {
              const handled = handleBackButtonRef.current();
              if (handled) return;
              // WebView history (rare) — still prefer not killing the app
              if (canGoBack && typeof window !== 'undefined' && window.history.length > 1) {
                window.history.back();
                return;
              }
              const now = Date.now();
              if (now - lastTap < 2000) {
                // Keep music alive: send app to background instead of killing process
                try {
                  if (typeof CapApp.minimizeApp === 'function') CapApp.minimizeApp();
                  else if (typeof CapApp.exitApp === 'function') CapApp.exitApp();
                } catch (_) {}
              } else {
                lastTap = now;
                triggerToast('Press back again to leave');
              }
            }).catch(() => {});
          }
        })
        .then((listener) => {
          appListener = listener;
        })
        .catch(() => {});
    } catch (_) {}

    return () => {
      try { delete window.__handleAndroidBackButton; } catch (_) {}
      if (appListener && typeof appListener.remove === 'function') {
        try { appListener.remove(); } catch (_) {}
      }
    };
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        tracks,
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
        queue,
        queueIndex,
        showQueue,
        setShowQueue,
        removeFromQueue,
        moveQueueItem,
        playQueueIndex,
        likedTrackIds,
        likedTracksData,
        setLikedTracksData,
        userPlaylists,
        activeView,
        setActiveView,
        selectedPlaylistId,
        setSelectedPlaylistId,
        searchQuery,
        setSearchQuery,
        selectedGenre,
        setSelectedGenre,
        showVisualizer,
        setShowVisualizer,
        showLyrics,
        setShowLyrics,
        showNowPlaying,
        setShowNowPlaying,
        analyserRef,
        playTrack,
        playAllSongs,
        togglePlay,
        stopTrack,
        playNext,
        playPrev,
        seekTo,
        seekForward10,
        seekBackward10,
        seekBy,
        changeVolume,
        toggleMute,
        toggleLike,
        createPlaylist: (name) => createPlaylistWithTracks(name, "Custom playlist", null, []),
        createPlaylistWithTracks,
        addTrackToPlaylist,
        navigateToPlaylist,
        // Phone Storage exports (100% on-device, no MySQL required)
        phoneStoredTracks,
        recentlyPlayedTracks,
        storageStats,
        saveToPhone,
        removeFromPhone,
        isSavedOnPhone,
        clearAllPhoneStorage,
        // Admin / Super Admin panel exports
        isSuperAdmin,
        isAdminRole,
        isSuperAdminRole,
        downloadAllSongsToLocalStorage,
        exportAllSongsBackup,
        exportLikedSongsBackup,
        importLikedSongsFromJson,
        showSuperAdminModal,
        setShowSuperAdminModal,
        showAdminPanel,
        setShowAdminPanel,
        // DobbyPay context exports
        dobbyWallet,
        dobbyTransactions,
        showWalletModal,
        setShowWalletModal,
        showTipModal,
        setShowTipModal,
        targetTipTrack,
        openTipModal,
        sendTip,
        topUpWallet,
        // DobbyPay Auth exports
        currentUser,
        isLoggedIn,
        showAuthModal,
        setShowAuthModal,
        loginUserAction,
        registerUserAction,
        logoutUserAction,
        updateProfileAction,
        autoDownloadLiked,
        toggleAutoDownloadLiked,
        downloadLikedTrackToPhone,
        setSongCoverImage,
        resolveSongCover,
        songCoverVersion,
        getSongCoverUrl,
        toastMessage,
        isLosslessMode,
        toggleLosslessMode,
        sidebarOpen,
        setSidebarOpen,
        toggleSidebar,
        isBuffering,
        playbackError,
        previewEnded,
        triggerToast,
        // Theme & Template customization
        themeMode,
        themeTemplate,
        customTheme,
        toggleThemeMode,
        setThemeTemplateAction,
        setCustomThemeAction,
        showThemeModal,
        setShowThemeModal,
        navigateToView
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);

