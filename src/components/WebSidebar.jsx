import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import {
  Home,
  Search,
  Library,
  Disc3,
  Clapperboard,
  Globe2,
  History,
  Settings,
  Shield,
  ShieldCheck,
  LogOut,
  Wallet,
} from 'lucide-react';
import DobbyPayLogo from './DobbyPayLogo';

export default function WebSidebar() {
  const {
    activeView,
    setActiveView,
    currentUser,
    logoutUserAction,
    isAdminRole,
    isSuperAdminRole,
    setShowAdminPanel,
    setShowSuperAdminModal,
    setShowWalletModal,
    dobbyWallet,
  } = usePlayer();

  const go = (view) => setActiveView(view);
  const name = currentUser?.name || currentUser?.username || 'Listener';
  const initial = String(name).charAt(0).toUpperCase();

  const items = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'Your Library', icon: Library },
    { id: 'indian', label: 'Indian Hub', icon: Globe2 },
    { id: 'directors', label: 'Directors', icon: Disc3 },
    { id: 'actors', label: 'Actors', icon: Clapperboard },
    { id: 'history', label: 'Recents', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="web-sidebar" aria-label="Main navigation">
      <button type="button" className="web-sidebar-brand" onClick={() => go('home')}>
        <DobbyPayLogo size="small" />
        <span>DobbyPay Music</span>
      </button>

      <nav className="web-sidebar-nav">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`web-nav-item ${activeView === id || (id === 'library' && (activeView === 'liked' || activeView === 'playlist')) ? 'active' : ''}`}
            onClick={() => go(id)}
          >
            <Icon size={20} strokeWidth={activeView === id ? 2.4 : 1.9} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="web-sidebar-footer">
        <button type="button" className="web-wallet-chip" onClick={() => setShowWalletModal(true)}>
          <Wallet size={16} />
          <span>₹{Number(dobbyWallet?.balance || 0).toFixed(0)}</span>
        </button>

        {isAdminRole && (
          <button type="button" className="web-nav-item" onClick={() => setShowAdminPanel(true)}>
            <Shield size={18} color="#FF6B00" />
            <span>Admin</span>
          </button>
        )}
        {isSuperAdminRole && (
          <button type="button" className="web-nav-item" onClick={() => setShowSuperAdminModal(true)}>
            <ShieldCheck size={18} color="#ef4444" />
            <span>Super Admin</span>
          </button>
        )}

        <div className="web-user-row">
          <div className="web-user-avatar">{initial}</div>
          <div className="web-user-meta">
            <strong>{name}</strong>
            <span>{currentUser?.role || 'client'}</span>
          </div>
          <button type="button" className="web-logout-btn" onClick={logoutUserAction} title="Log out">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
