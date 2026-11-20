import React from 'react';
import DobbyPayLogo from './DobbyPayLogo';

export default function DobbyPayAppCard({ onClick, style = {} }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#ffffff',
        borderRadius: 20,
        padding: '16px 24px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        position: 'relative',
        minWidth: 320,
        maxWidth: 420,
        gap: 18,
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        ...style
      }}
      className="dobbypay-app-card"
    >
      {/* ─── Left: Rounded Square Official App Icon with Lightning Bolt ─── */}
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: 16,
          background: 'linear-gradient(135deg, #FF6A00 0%, #FF5000 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 6px 18px rgba(255, 106, 0, 0.4)'
        }}
      >
        {/* Official Lightning Bolt Icon */}
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="#ffffff"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      </div>

      {/* ─── Center: Official Brand Typography DobbyPay + Music ─── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3
          style={{
            margin: 0,
            fontSize: '1.45rem',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <span style={{ color: '#000000' }}>Dobby</span>
          <span style={{ color: '#FF6A00' }}>Pay</span>
        </h3>
        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: '0.92rem',
            color: '#71717a',
            fontWeight: 600
          }}
        >
          Music
        </p>
      </div>

      {/* ─── Bottom-Right: "Free" Pill Badge ─── */}
      <div
        style={{
          alignSelf: 'flex-end',
          background: '#f2f2f5',
          color: '#1a1a20',
          fontSize: '0.82rem',
          fontWeight: 700,
          padding: '4px 14px',
          borderRadius: 14,
          letterSpacing: '-0.01em',
          border: '1px solid rgba(0,0,0,0.04)'
        }}
      >
        Free
      </div>
    </div>
  );
}
