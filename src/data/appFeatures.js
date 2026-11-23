/**
 * Product features shown on AuthGate + Home — Express cloud app capabilities.
 */
export const APP_FEATURES = [
  {
    id: 'cloud-api',
    title: 'Cloud Express API',
    blurb: 'Live on Render with Clever Cloud MySQL — signup, login, library sync.',
    accent: '#1DB954',
  },
  {
    id: 'resume',
    title: 'Resume playback',
    blurb: 'Close the app mid-song — reopen and continue from the same track & time.',
    accent: '#FF6B00',
  },
  {
    id: 'indian',
    title: 'Indian music hub',
    blurb: 'Tamil, Telugu, Malayalam, Kannada, Hindi & English — directors, actors, mixes.',
    accent: '#3B82F6',
  },
  {
    id: 'search',
    title: 'Multi-source search',
    blurb: 'JioSaavn, Express catalog, iTunes & FreeToUse with automatic failover.',
    accent: '#A855F7',
  },
  {
    id: 'library',
    title: 'Library & offline',
    blurb: 'Liked songs, playlists, phone storage cache, and account library sync.',
    accent: '#22C55E',
  },
  {
    id: 'wallet',
    title: 'DobbyPay wallet',
    blurb: 'Tip artists and top up — wallet + transaction history in-app.',
    accent: '#F59E0B',
  },
  {
    id: 'admin',
    title: 'Admin approvals',
    blurb: 'Admin & Super Admin approve users, listening dashboards, storage tools.',
    accent: '#EF4444',
  },
  {
    id: 'mobile',
    title: 'Android APK',
    blurb: 'Capacitor build talks to https://dobbypay-music.onrender.com/api.',
    accent: '#14B8A6',
  },
];

export const APP_FEATURE_SHORT = APP_FEATURES.slice(0, 4);
