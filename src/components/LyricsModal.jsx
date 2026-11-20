import React, { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { getSongCoverUrl } from '../services/phoneStorage';
import { X, Mic2 } from 'lucide-react';
import { fetchSaavnLyrics, lyricsPayloadToLines } from '../services/saavnClient.js';

export default function LyricsModal() {
  const { showLyrics, setShowLyrics, currentTrack, currentTime } = usePlayer();
  const activeLyricRef = useRef(null);
  const [fetchedLyrics, setFetchedLyrics] = useState(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);

  useEffect(() => {
    if (activeLyricRef.current) {
      activeLyricRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentTime]);

  useEffect(() => {
    if (!showLyrics || !currentTrack?.saavnId) {
      setFetchedLyrics(null);
      return;
    }
    if (currentTrack.lyrics?.length) {
      setFetchedLyrics(null);
      return;
    }

    let cancelled = false;
    setLyricsLoading(true);
    fetchSaavnLyrics(currentTrack.saavnId)
      .then((payload) => {
        if (cancelled) return;
        setFetchedLyrics(lyricsPayloadToLines(payload));
      })
      .catch(() => {
        if (!cancelled) setFetchedLyrics(null);
      })
      .finally(() => {
        if (!cancelled) setLyricsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showLyrics, currentTrack?.id, currentTrack?.saavnId, currentTrack?.lyrics]);

  if (!showLyrics || !currentTrack) return null;

  const lyrics =
    currentTrack.lyrics ||
    fetchedLyrics ||
    (lyricsLoading
      ? [{ time: 0, text: 'Loading lyrics…' }]
      : [{ time: 0, text: '♪ Lyrics not available for this track ♪' }]);

  // Find index of current line
  let activeIndex = 0;
  for (let i = 0; i < lyrics.length; i++) {
    if (currentTime >= lyrics[i].time) {
      activeIndex = i;
    }
  }

  return (
    <div className="lyrics-drawer">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Mic2 size={22} color="#1db954" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Lyrics</h3>
        </div>
        <button
          className="create-pl-btn"
          onClick={() => setShowLyrics(false)}
        >
          <X size={20} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <img src={getSongCoverUrl(currentTrack, '')} alt={currentTrack.title} style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{currentTrack.title}</div>
          <div style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>{currentTrack.artist}</div>
        </div>
      </div>

      <div className="lyrics-scroll">
        {lyrics.map((line, idx) => {
          const isActive = idx === activeIndex;
          return (
            <div
              key={idx}
              ref={isActive ? activeLyricRef : null}
              className={`lyric-line ${isActive ? 'active' : ''}`}
            >
              {line.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
