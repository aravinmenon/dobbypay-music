import React, { useEffect, useRef } from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import PlayerBar from './components/PlayerBar';
import HomeView from './components/HomeView';
import SearchView from './components/SearchView';
import PlaylistView from './components/PlaylistView';
import LibraryView from './components/LibraryView';
import IndianMusicHub from './components/IndianMusicHub';
import LanguagesView from './components/LanguagesView';
import MusicDirectorsView from './components/MusicDirectorsView';
import ActorsView from './components/ActorsView';
import FreeToUseHub from './components/FreeToUseHub';
import AudioVisualizer from './components/AudioVisualizer';
import LyricsModal from './components/LyricsModal';
import DobbyPayTipModal from './components/DobbyPayTipModal';
import DobbyPayWalletModal from './components/DobbyPayWalletModal';
import DobbyAuthModal from './components/DobbyAuthModal';
import DobbyPayToast from './components/DobbyPayToast';
import BottomNav from './components/BottomNav';
import NowPlayingModal from './components/NowPlayingModal';
import SuperAdminStorageModal from './components/SuperAdminStorageModal';
import AdminPanel from './components/AdminPanel';
import ThemeSettingsModal from './components/ThemeSettingsModal';
import SettingsView from './components/SettingsView';
import HistoryView from './components/HistoryView';
import QueueSheet from './components/QueueSheet';
import AuthGate from './components/AuthGate';

function MainLayout() {
  const { activeView, sidebarOpen, setSidebarOpen, searchQuery } = usePlayer();
  const contentRef = useRef(null);

  // Open a fresh page at the top — never leave the user scrolled mid-page
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const scroller = root.querySelector('.view-content');
    if (scroller) scroller.scrollTop = 0;
    root.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [activeView, searchQuery]);

  return (
    <div className="app-container">
      <div className="main-viewport">
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}
        <Sidebar />
        <main className="content-wrapper" ref={contentRef}>
          <TopNav />
          {activeView === 'home' && <HomeView />}
          {activeView === 'languages' && <LanguagesView />}
          {activeView === 'directors' && <MusicDirectorsView />}
          {activeView === 'actors' && <ActorsView />}
          {activeView === 'indian' && <IndianMusicHub />}
          {activeView === 'freetouse' && <FreeToUseHub />}
          {activeView === 'search' && <SearchView />}
          {activeView === 'library' && <LibraryView />}
          {activeView === 'playlist' && <PlaylistView />}
          {activeView === 'liked' && <LibraryView />}
          {activeView === 'settings' && <SettingsView />}
          {activeView === 'history' && <HistoryView />}
        </main>
        <LyricsModal />
        <AudioVisualizer />
        <NowPlayingModal />
        <QueueSheet />
        <ThemeSettingsModal />
        <DobbyPayTipModal />
        <DobbyPayWalletModal />
        <DobbyAuthModal />
        <SuperAdminStorageModal />
        <AdminPanel />
        <DobbyPayToast />
      </div>
      <PlayerBar />
      <BottomNav />
    </div>
  );
}

function AppShell() {
  const { isLoggedIn } = usePlayer();

  if (!isLoggedIn) {
    return <AuthGate />;
  }

  return <MainLayout />;
}

export default function App() {
  return (
    <PlayerProvider>
      <AppShell />
    </PlayerProvider>
  );
}
