import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import {
  History, Megaphone, Settings, UserPlus, X, LogOut, ShieldCheck, Shield, Disc3, Clapperboard
} from 'lucide-react';

export default function Sidebar() {
  const {
    setActiveView,
    currentUser,
    isLoggedIn,
    setShowAuthModal,
    logoutUserAction,
    sidebarOpen,
    setSidebarOpen,
    isAdminRole,
    isSuperAdminRole,
    setShowSuperAdminModal,
    setShowAdminPanel,
  } = usePlayer();

  const displayName = (
    currentUser?.name ||
    currentUser?.username ||
    'Guest'
  ).toUpperCase();

  const initial = displayName.charAt(0) || 'A';

  const close = () => setSidebarOpen(false);

  const go = (view) => {
    setActiveView(view);
    close();
  };

  return (
    <aside
      className={`sidebar spotify-profile-drawer ${sidebarOpen ? 'sidebar--open' : ''}`}
      aria-hidden={!sidebarOpen}
      {...(!sidebarOpen ? { inert: '' } : {})}
    >
      <button
        className="sidebar-close-btn"
        onClick={close}
        aria-label="Close"
        tabIndex={sidebarOpen ? 0 : -1}
        disabled={!sidebarOpen}
      >
        <X size={22} />
      </button>

      {/* Profile card */}
      <div
        className="sp-profile-card"
        style={
          currentUser?.coverUrl
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(18,18,18,0.35), rgba(18,18,18,0.92)), url(${currentUser.coverUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        <button
          type="button"
          className="sp-profile-row"
          onClick={() => {
            setShowAuthModal(true);
            close();
          }}
        >
          <div className="sp-avatar">
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="" className="sp-avatar-img" />
            ) : (
              initial
            )}
          </div>
          <div className="sp-profile-text">
            <span className="sp-profile-name">{displayName}</span>
            <span className="sp-profile-sub">View profile</span>
          </div>
        </button>

        <div className="sp-profile-divider" />

        <button
          type="button"
          className="sp-add-account"
          onClick={() => {
            setShowAuthModal(true);
            close();
          }}
        >
          <span className="sp-add-icon">
            <UserPlus size={18} />
          </span>
          <span>Add account</span>
        </button>
      </div>

      {/* Menu list */}
      <nav className="sp-drawer-menu">
        <button type="button" className="sp-drawer-item" onClick={() => go('history')}>
          <History size={24} strokeWidth={1.75} />
          <span>Recents</span>
        </button>
        <button type="button" className="sp-drawer-item" onClick={() => go('directors')}>
          <Disc3 size={24} strokeWidth={1.75} />
          <span>Music Directors</span>
        </button>
        <button type="button" className="sp-drawer-item" onClick={() => go('actors')}>
          <Clapperboard size={24} strokeWidth={1.75} />
          <span>Actors</span>
        </button>
        <button type="button" className="sp-drawer-item" onClick={() => go('home')}>
          <Megaphone size={24} strokeWidth={1.75} />
          <span>Your Updates</span>
        </button>
        <button
          type="button"
          className="sp-drawer-item"
          onClick={() => go('settings')}
        >
          <Settings size={24} strokeWidth={1.75} />
          <span>Settings and privacy</span>
        </button>

        {isAdminRole && (
          <button
            type="button"
            className="sp-drawer-item"
            onClick={() => {
              setShowAdminPanel(true);
              close();
            }}
          >
            <Shield size={24} strokeWidth={1.75} color="#FF6B00" />
            <span>Admin Panel</span>
          </button>
        )}

        {isSuperAdminRole && (
          <button
            type="button"
            className="sp-drawer-item"
            onClick={() => {
              setShowSuperAdminModal(true);
              close();
            }}
          >
            <ShieldCheck size={24} strokeWidth={1.75} color="#ef4444" />
            <span>Super Admin Panel</span>
          </button>
        )}

        <button
          type="button"
          className="sp-drawer-item sp-drawer-item--danger"
          onClick={() => {
            logoutUserAction();
            close();
          }}
        >
          <LogOut size={24} strokeWidth={1.75} />
          <span>{isLoggedIn ? 'Log out' : 'Exit to login'}</span>
        </button>
      </nav>
    </aside>
  );
}
