import React, { useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { X, Sparkles } from 'lucide-react';

export default function AudioVisualizer() {
  const { showVisualizer, setShowVisualizer, analyserRef, isPlaying, currentTrack } = usePlayer();
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!showVisualizer || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bufferLength = analyserRef.current ? analyserRef.current.frequencyBinCount : 32;
      const dataArray = new Uint8Array(bufferLength);

      if (analyserRef.current && isPlaying) {
        analyserRef.current.getByteFrequencyData(dataArray);
      } else {
        // Fallback smooth animated spectrum simulation if audio node is muted/silent
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = isPlaying
            ? Math.abs(Math.sin(Date.now() / 200 + i * 0.3)) * 180 + 30
            : 10;
        }
      }

      const width = canvas.width;
      const height = canvas.height;
      const barWidth = (width / bufferLength) * 1.5;
      let x = 0;

      // Draw background glow wave
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height * 0.8;
        const y = height - barHeight;
        ctx.lineTo(x, y);
        x += barWidth + 3;
      }
      ctx.lineTo(width, height);
      ctx.fillStyle = 'rgba(29, 185, 84, 0.15)';
      ctx.fill();

      // Draw frequency spectrum bars
      x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height * 0.85;

        // Gradient for each bar
        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, '#1db954');
        gradient.addColorStop(0.7, '#34d399');
        gradient.addColorStop(1, '#a7f3d0');

        ctx.fillStyle = gradient;
        ctx.shadowColor = 'rgba(29, 185, 84, 0.6)';
        ctx.shadowBlur = 12;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);

        x += barWidth + 4;
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [showVisualizer, isPlaying, analyserRef]);

  if (!showVisualizer) return null;

  return (
    <div className="visualizer-overlay">
      <div style={{ position: 'absolute', top: 24, right: 32, display: 'flex', gap: 12 }}>
        <button
          className="create-pl-btn"
          style={{ background: 'rgba(255,255,255,0.1)', width: 40, height: 40 }}
          onClick={() => setShowVisualizer(false)}
        >
          <X size={24} />
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(29,185,84,0.2)', padding: '6px 14px', borderRadius: 9999, color: '#1db954', fontWeight: 700, fontSize: '0.85rem', marginBottom: 12 }}>
          <Sparkles size={16} />
          <span>Real-time Audio Spectrum</span>
        </div>
        <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>{currentTrack?.title}</h2>
        <p style={{ color: '#a1a1aa', fontSize: '1rem', marginTop: 4 }}>{currentTrack?.artist} • {currentTrack?.album}</p>
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={320}
        className="visualizer-canvas"
      />
    </div>
  );
}
