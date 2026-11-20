import React, { useEffect, useState } from 'react';
import {
  RefreshCw, Clock, Music2, Users, Headphones, BarChart3
} from 'lucide-react';
import { fetchListeningDashboard, formatListenDuration } from '../services/listeningAnalytics';

/**
 * Shared listening analytics for Admin + Super Admin side dashboards.
 * Shows per-user play time and most-played songs.
 */
export default function ListeningDashboard({ accent = '#FF6B00' }) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalPlays: 0,
    totalListenSeconds: 0,
    uniqueListeners: 0,
    uniqueSongs: 0
  });
  const [topSongs, setTopSongs] = useState([]);
  const [topListeners, setTopListeners] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchListeningDashboard();
      setSummary(data.summary || summary);
      setTopSongs(data.topSongs || []);
      setTopListeners(data.topListeners || []);
    } catch (_) {
      setTopSongs([]);
      setTopListeners([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const maxSongPlays = Math.max(1, ...topSongs.map((s) => Number(s.playCount) || 0));
  const maxUserSecs = Math.max(1, ...topListeners.map((u) => Number(u.listenSeconds) || 0));

  return (
    <div className="listen-dash">
      <div className="listen-dash-toolbar">
        <div className="listen-dash-intro">
          <BarChart3 size={18} color={accent} />
          <div>
            <strong>Listening dashboard</strong>
            <span>User play time · most played songs</span>
          </div>
        </div>
        <button type="button" className="staff-ghost-btn" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="listen-dash-stats">
        <div className="listen-dash-stat">
          <Headphones size={18} color={accent} />
          <div>
            <strong>{summary.totalPlays}</strong>
            <span>Total plays</span>
          </div>
        </div>
        <div className="listen-dash-stat">
          <Clock size={18} color="#f59e0b" />
          <div>
            <strong>{formatListenDuration(summary.totalListenSeconds)}</strong>
            <span>Total listen time</span>
          </div>
        </div>
        <div className="listen-dash-stat">
          <Users size={18} color="#22c55e" />
          <div>
            <strong>{summary.uniqueListeners}</strong>
            <span>Active listeners</span>
          </div>
        </div>
        <div className="listen-dash-stat">
          <Music2 size={18} color="#3b82f6" />
          <div>
            <strong>{summary.uniqueSongs}</strong>
            <span>Unique songs</span>
          </div>
        </div>
      </div>

      <div className="listen-dash-grid">
        <section className="listen-dash-panel">
          <h3>Most played songs</h3>
          {topSongs.length === 0 ? (
            <div className="listen-dash-empty">
              No plays recorded yet. When customers play songs, rankings appear here.
            </div>
          ) : (
            <ul className="listen-dash-list">
              {topSongs.map((song, idx) => {
                const pct = Math.round(((Number(song.playCount) || 0) / maxSongPlays) * 100);
                return (
                  <li key={song.songId || idx} className="listen-dash-row">
                    <span className="listen-dash-rank">{idx + 1}</span>
                    <div
                      className="listen-dash-cover"
                      style={song.coverUrl ? { backgroundImage: `url(${song.coverUrl})` } : undefined}
                    />
                    <div className="listen-dash-meta">
                      <div className="listen-dash-title">{song.title || 'Unknown'}</div>
                      <div className="listen-dash-sub">{song.artist || '—'}</div>
                      <div className="listen-dash-bar-track">
                        <div
                          className="listen-dash-bar-fill"
                          style={{ width: `${pct}%`, background: accent }}
                        />
                      </div>
                    </div>
                    <div className="listen-dash-metrics">
                      <strong>{song.playCount} plays</strong>
                      <span>{formatListenDuration(song.listenSeconds)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="listen-dash-panel">
          <h3>Users by listen time</h3>
          {topListeners.length === 0 ? (
            <div className="listen-dash-empty">
              No listener activity yet.
            </div>
          ) : (
            <ul className="listen-dash-list">
              {topListeners.map((user, idx) => {
                const pct = Math.round(((Number(user.listenSeconds) || 0) / maxUserSecs) * 100);
                const initial = (user.name || user.email || '?').charAt(0).toUpperCase();
                return (
                  <li key={user.userId || idx} className="listen-dash-row">
                    <span className="listen-dash-rank">{idx + 1}</span>
                    <div className="listen-dash-avatar">{initial}</div>
                    <div className="listen-dash-meta">
                      <div className="listen-dash-title">{user.name || `User #${user.userId}`}</div>
                      <div className="listen-dash-sub">{user.email || '—'}</div>
                      <div className="listen-dash-bar-track">
                        <div
                          className="listen-dash-bar-fill"
                          style={{ width: `${pct}%`, background: accent }}
                        />
                      </div>
                    </div>
                    <div className="listen-dash-metrics">
                      <strong>{formatListenDuration(user.listenSeconds)}</strong>
                      <span>{user.playCount} plays · {user.uniqueSongs || 0} songs</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
