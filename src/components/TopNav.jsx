import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { ChevronLeft, ChevronRight, Search, User, Zap, Sparkles, Menu, LogOut, ShieldCheck, Shield, Sun, Moon, Palette, X } from 'lucide-react';

export default function TopNav() {
  const {
    activeView,
    setActiveView,
    searchQuery,
    setSearchQuery,
    dobbyWallet,
    setShowWalletModal,
    currentUser,
    isLoggedIn,
    setShowAuthModal,
    logoutUserAction,
    toggleSidebar,
    isAdminRole,
    isSuperAdminRole,
    setShowSuperAdminModal,
    setShowAdminPanel,
    themeMode,
    toggleThemeMode,
    setShowThemeModal
  } = usePlayer();

  const isNativeMobileView = ['home', 'search', 'library', 'liked', 'playlist', 'settings', 'history', 'directors'].includes(activeView);

  const initialLetter = currentUser?.username ? currentUser.username[0].toUpperCase() : 'A';
  const displayName = currentUser?.username || 'Aravindhan';

  return (
    <header className={`top-bar ${isNativeMobileView ? 'top-bar-mobile-hide' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Hamburger menu button – visible only on mobile */}
        <button className="hamburger-btn" onClick={toggleSidebar} title="Menu">
          <Menu size={24} />
        </button>

        <div className="nav-arrows" style={{ display: 'flex', gap: '8px' }}>
          <button className="create-pl-btn" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <ChevronLeft size={20} />
          </button>
          <button className="create-pl-btn" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <ChevronRight size={20} />
          </button>
        </div>

        <div
          className="search-input-wrapper hide-mobile"
          onClick={() => {
            if (activeView !== 'search') setActiveView('search');
          }}
          style={{ cursor: 'text' }}
          title="Search songs, artists, directors, albums..."
        >
          <Search size={18} color="var(--text-main)" />
          <input
            type="text"
            placeholder="Search songs, artists, albums..."
            value={searchQuery}
            onFocus={() => {
              if (activeView !== 'search') setActiveView('search');
            }}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (activeView !== 'search') setActiveView('search');
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSearchQuery('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 2
              }}
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* DobbyPay Wallet Balance Button */}
        <button
          className="dobby-topbar-wallet-btn"
          onClick={() => setShowWalletModal(true)}
          title="Open DobbyPay Wallet"
        >
          <Zap size={16} fill="var(--spotify-green)" color="var(--spotify-green)" />
          <span style={{ fontWeight: 800, color: '#FFFFFF' }}>${dobbyWallet.balance.toFixed(2)}</span>
          <span className="dobby-pts-badge hide-mobile">{dobbyWallet.points} ⚡</span>
        </button>

        {/* DobbyPay Hi-Fi Premium Pass Button */}
        <button
          className="dobby-topbar-vip-btn hide-mobile"
          onClick={() => setShowWalletModal(true)}
        >
          <Sparkles size={16} color="#000000" />
          <span>DobbyPay VIP</span>
        </button>

        {isAdminRole && (
          <button
            className="topbar-superadmin-btn"
            onClick={() => setShowAdminPanel(true)}
            title="Admin Panel: approve registered users"
          >
            <Shield size={16} color="#FF6B00" />
            <span className="hide-mobile">Admin Panel</span>
          </button>
        )}

        {isSuperAdminRole && (
          <button
            className="topbar-superadmin-btn"
            onClick={() => setShowSuperAdminModal(true)}
            title="Super Admin: approve, deactivate, reactivate customers"
          >
            <ShieldCheck size={16} color="#ef4444" />
            <span className="hide-mobile">Super Admin</span>
          </button>
        )}

        {/* Theme Dark/Light Mode 1-Click Switcher */}
        <button
          className="topbar-theme-toggle-btn"
          onClick={toggleThemeMode}
          title={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Dark and Light Mode"
        >
          {themeMode === 'dark' ? <Sun size={17} color="#f59e0b" /> : <Moon size={17} color="#3b82f6" />}
        </button>

        {/* Theme & Template Customization Modal Button */}
        <button
          className="topbar-theme-toggle-btn"
          onClick={() => setShowThemeModal(true)}
          title="Choose Themes & Color Templates"
          aria-label="Theme & Template Settings"
        >
          <Palette size={17} color="var(--dobby-orange)" />
        </button>

        {/* MySQL Auth Profile Chip */}
        <div
          className="profile-chip"
          onClick={() => setShowAuthModal(true)}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          title={isLoggedIn ? `Logged in as ${displayName}` : 'Sign In or Register'}
        >
          <div
            className="user-avatar"
            style={{
              background: isLoggedIn ? 'linear-gradient(135deg, #FF6B00, #ff8800)' : 'linear-gradient(135deg, #f06292, #e91e63)',
              color: '#FFF',
              fontWeight: 800
            }}
          >
            {isLoggedIn ? initialLetter : <User size={14} />}
          </div>
          <span className="hide-mobile" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            {isLoggedIn ? displayName : 'Sign In'}
          </span>
        </div>

        {/* Prominent Log Out Button */}
        {isLoggedIn && (
          <button
            className="topbar-logout-btn"
            onClick={logoutUserAction}
            title="Log Out of DobbyPay Music"
          >
            <LogOut size={16} color="#ffffff" />
            <span className="hide-mobile">Log Out</span>
          </button>
        )}
      </div>
    </header>
  );
}
