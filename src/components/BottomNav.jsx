import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Home, Search } from 'lucide-react';

function LibraryIcon({ active }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m16 6 4 14" />
      <path d="M12 6v14" />
      <path d="M8 8v12" />
      <path d="M4 4v16" />
    </svg>
  );
}

export default function BottomNav() {
  const { activeView, setActiveView } = usePlayer();

  const isHome = activeView === 'home';
  const isSearch = activeView === 'search';
  const isLibrary = activeView === 'library' || activeView === 'liked' || activeView === 'playlist';
  // settings / other screens: no main tab looks selected

  return (
    <nav className="spotify-bottom-nav">
      <button
        className={`spotify-nav-tab ${isHome ? 'active' : ''}`}
        onClick={() => setActiveView('home')}
      >
        <Home size={24} strokeWidth={isHome ? 2.5 : 2} fill={isHome ? 'currentColor' : 'none'} />
        <span>Home</span>
      </button>

      <button
        className={`spotify-nav-tab ${isSearch ? 'active' : ''}`}
        onClick={() => setActiveView('search')}
      >
        <Search size={24} strokeWidth={isSearch ? 2.5 : 2} />
        <span>Search</span>
      </button>

      <button
        className={`spotify-nav-tab ${isLibrary ? 'active' : ''}`}
        onClick={() => setActiveView('library')}
      >
        <LibraryIcon active={isLibrary} />
        <span>Your Library</span>
      </button>
    </nav>
  );
}
