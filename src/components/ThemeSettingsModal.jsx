import React, { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { X, Sun, Moon, Check, Sparkles, Palette, Pipette } from 'lucide-react';

export const THEME_TEMPLATES = [
  {
    id: 'spotify',
    name: 'Spotify Emerald',
    description: 'Classic Spotify green',
    primaryColor: '#1DB954',
    secondaryColor: '#1ED760',
    gradient: 'linear-gradient(135deg, #1DB954 0%, #179b45 100%)',
    badge: 'Default'
  },
  {
    id: 'dobbypay',
    name: 'Electric Orange',
    description: 'High-energy orange accents',
    primaryColor: '#FF6B00',
    secondaryColor: '#FF3D00',
    gradient: 'linear-gradient(135deg, #FF6B00 0%, #FF3D00 100%)',
    badge: 'Bold'
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    description: 'Magenta to violet',
    primaryColor: '#EC4899',
    secondaryColor: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
    badge: 'Vibrant'
  },
  {
    id: 'sapphire',
    name: 'Midnight Sapphire',
    description: 'Deep ocean blue',
    primaryColor: '#0284C7',
    secondaryColor: '#38BDF8',
    gradient: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
    badge: 'Calm'
  },
  {
    id: 'sunset',
    name: 'Royal Amber',
    description: 'Gold to fiery red',
    primaryColor: '#F59E0B',
    secondaryColor: '#EF4444',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
    badge: 'Warm'
  },
  {
    id: 'custom',
    name: 'Custom Colors',
    description: 'Pick your own accent colors',
    primaryColor: '#1DB954',
    secondaryColor: '#1ED760',
    gradient: 'linear-gradient(135deg, #1DB954 0%, #1ED760 100%)',
    badge: 'Edit'
  }
];

export default function ThemeSettingsModal() {
  const {
    showThemeModal,
    setShowThemeModal,
    themeMode,
    toggleThemeMode,
    themeTemplate,
    setThemeTemplateAction,
    customTheme,
    setCustomThemeAction,
    triggerToast
  } = usePlayer();

  const [primary, setPrimary] = useState(customTheme?.primary || '#1DB954');
  const [secondary, setSecondary] = useState(customTheme?.secondary || '#1ED760');

  useEffect(() => {
    if (customTheme?.primary) setPrimary(customTheme.primary);
    if (customTheme?.secondary) setSecondary(customTheme.secondary);
  }, [customTheme, showThemeModal]);

  if (!showThemeModal) return null;

  const handleSelectMode = (mode) => {
    if (themeMode !== mode) {
      toggleThemeMode();
      triggerToast(`Switched to ${mode === 'dark' ? 'Dark' : 'Light'} mode`);
    }
  };

  const handleSelectTemplate = (tplId) => {
    if (tplId === 'custom') {
      setCustomThemeAction({ primary, secondary });
      triggerToast('Custom theme active — edit colors below');
      return;
    }
    const found = THEME_TEMPLATES.find(t => t.id === tplId);
    if (found) {
      setThemeTemplateAction(tplId, {
        primary: found.primaryColor,
        secondary: found.secondaryColor,
      });
      setPrimary(found.primaryColor);
      setSecondary(found.secondaryColor);
      triggerToast(`Applied: ${found.name}`);
    }
  };

  const applyCustom = () => {
    setCustomThemeAction({ primary, secondary });
    triggerToast('Custom theme saved');
  };

  return (
    <div className="modal-backdrop" onClick={() => setShowThemeModal(false)}>
      <div
        className="theme-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="theme-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="theme-header-icon-box">
              <Palette size={22} color="var(--spotify-green)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Theme &amp; Appearance
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Dark / light mode, presets, and custom colors
              </p>
            </div>
          </div>
          <button className="theme-modal-close-btn" onClick={() => setShowThemeModal(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="theme-modal-body">
          <div className="theme-section">
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 12px' }}>Display</h3>
            <div className="theme-mode-grid">
              <div
                className={`theme-mode-card ${themeMode === 'dark' ? 'selected' : ''}`}
                onClick={() => handleSelectMode('dark')}
              >
                <div className="theme-mode-info" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Moon size={16} />
                    <span style={{ fontWeight: 700 }}>Dark</span>
                    {themeMode === 'dark' && <Check size={14} color="var(--spotify-green)" />}
                  </div>
                </div>
              </div>
              <div
                className={`theme-mode-card ${themeMode === 'light' ? 'selected' : ''}`}
                onClick={() => handleSelectMode('light')}
              >
                <div className="theme-mode-info" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sun size={16} />
                    <span style={{ fontWeight: 700 }}>Light</span>
                    {themeMode === 'light' && <Check size={14} color="var(--spotify-green)" />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="theme-section" style={{ marginTop: 22 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 12px' }}>Color themes</h3>
            <div className="theme-templates-list">
              {THEME_TEMPLATES.map((tpl) => {
                const isSelected = themeTemplate === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    className={`theme-template-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectTemplate(tpl.id)}
                  >
                    <div className="template-swatch-box" style={{ background: tpl.id === 'custom' ? `linear-gradient(135deg, ${primary}, ${secondary})` : tpl.gradient }}>
                      {tpl.id === 'custom' ? <Pipette size={16} color="#fff" /> : <Sparkles size={16} color="#fff" />}
                    </div>
                    <div className="template-info">
                      <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{tpl.name}</span>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '3px 0 0' }}>{tpl.description}</p>
                    </div>
                    <div className={`template-radio ${isSelected ? 'active' : ''}`}>
                      {isSelected ? <Check size={14} strokeWidth={3} /> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom color editor */}
          <div className="theme-section" style={{ marginTop: 22 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 12px' }}>
              Custom accent colors
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Primary</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="color"
                    value={primary}
                    onChange={(e) => setPrimary(e.target.value)}
                    style={{ width: 44, height: 44, border: 'none', background: 'transparent', cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    value={primary}
                    onChange={(e) => setPrimary(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#fff',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Secondary</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="color"
                    value={secondary}
                    onChange={(e) => setSecondary(e.target.value)}
                    style={{ width: 44, height: 44, border: 'none', background: 'transparent', cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    value={secondary}
                    onChange={(e) => setSecondary(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#fff',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </label>
            </div>
            <button
              type="button"
              onClick={applyCustom}
              style={{
                marginTop: 14,
                width: '100%',
                padding: '12px 16px',
                borderRadius: 9999,
                border: 'none',
                background: `linear-gradient(135deg, ${secondary}, ${primary})`,
                color: '#000',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              Apply custom theme
            </button>
          </div>
        </div>

        <div className="theme-modal-footer">
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Saved on this device
          </div>
          <button className="theme-save-btn" onClick={() => setShowThemeModal(false)}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
