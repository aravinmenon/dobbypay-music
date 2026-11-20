import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { getSongCoverUrl } from '../services/phoneStorage';
import { X, Play, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

export default function QueueSheet() {
  const {
    showQueue,
    setShowQueue,
    queue,
    queueIndex,
    currentTrack,
    isPlaying,
    removeFromQueue,
    moveQueueItem,
    playQueueIndex,
  } = usePlayer();

  const [dragFrom, setDragFrom] = useState(null);

  if (!showQueue) return null;

  const list = Array.isArray(queue) ? queue : [];

  const onDrop = (toIndex) => {
    if (dragFrom === null || dragFrom === toIndex) {
      setDragFrom(null);
      return;
    }
    moveQueueItem(dragFrom, toIndex);
    setDragFrom(null);
  };

  return (
    <div className="queue-backdrop" onClick={() => setShowQueue(false)}>
      <section
        className="queue-sheet"
        role="dialog"
        aria-label="Play queue"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="queue-sheet-head">
          <div>
            <h2>Queue</h2>
            <p>{list.length} song{list.length === 1 ? '' : 's'}</p>
          </div>
          <button type="button" className="queue-icon-btn" onClick={() => setShowQueue(false)} aria-label="Close queue">
            <X size={20} />
          </button>
        </header>

        {list.length === 0 ? (
          <p className="queue-empty">Nothing is queued. Play a mix or a song to fill it.</p>
        ) : (
          <ul className="queue-list">
            {list.map((track, index) => {
              const isCurrent = index === queueIndex || (currentTrack && track.id && track.id === currentTrack.id && index === queueIndex);
              const cover = getSongCoverUrl(track, '');
              return (
                <li
                  key={`${track.id || track.title}-${index}`}
                  className={`queue-row ${isCurrent ? 'is-current' : ''} ${dragFrom === index ? 'is-dragging' : ''}`}
                  draggable
                  onDragStart={() => setDragFrom(index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => onDrop(index)}
                  onDragEnd={() => setDragFrom(null)}
                >
                  <span className="queue-grip" title="Drag to reorder">
                    <GripVertical size={16} />
                  </span>
                  <button type="button" className="queue-play" onClick={() => playQueueIndex(index)}>
                    {cover ? <img src={cover} alt="" /> : <span className="queue-play-fallback"><Play size={14} /></span>}
                    <span className="queue-meta">
                      <span className="queue-title">{track.title || 'Unknown'}</span>
                      <span className="queue-artist">
                        {isCurrent && isPlaying ? 'Playing now · ' : ''}
                        {track.artist || track.director || 'Unknown artist'}
                      </span>
                    </span>
                  </button>
                  <div className="queue-actions">
                    <button type="button" disabled={index === 0} onClick={() => moveQueueItem(index, index - 1)} aria-label="Move up">
                      <ChevronUp size={16} />
                    </button>
                    <button type="button" disabled={index === list.length - 1} onClick={() => moveQueueItem(index, index + 1)} aria-label="Move down">
                      <ChevronDown size={16} />
                    </button>
                    <button type="button" onClick={() => removeFromQueue(index)} aria-label="Remove from queue">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
