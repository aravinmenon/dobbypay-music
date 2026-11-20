import React, { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import {
  IMAGE_UPLOAD_TYPES,
  SUGGESTED_IMAGES,
  fileToProfileDataUrl,
} from '../data/suggestedImages';
import {
  ChevronLeft, Download, Upload, Heart, Palette, ShieldAlert, FileJson,
  User, Smartphone, Save, ImagePlus, Trash2, LogOut, Shield, ShieldCheck
} from 'lucide-react';

export default function SettingsView() {
  const {
    likedTrackIds,
    likedTracksData,
    exportLikedSongsBackup,
    importLikedSongsFromJson,
    setShowThemeModal,
    setActiveView,
    triggerToast,
    currentUser,
    updateProfileAction,
    autoDownloadLiked,
    toggleAutoDownloadLiked,
    phoneStoredTracks,
    currentTrack,
    setSongCoverImage,
    resolveSongCover,
    songCoverVersion,
    isLoggedIn,
    logoutUserAction,
    isAdminRole,
    isSuperAdminRole,
    setShowAdminPanel,
    setShowSuperAdminModal,
  } = usePlayer();

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageType, setImageType] = useState('avatar');
  const [profileForm, setProfileForm] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    setProfileForm({
      name: currentUser?.name || '',
      username: currentUser?.username || '',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '',
    });
  }, [currentUser]);

  const songPreviewUrl = resolveSongCover(
    currentTrack,
    SUGGESTED_IMAGES[0].url
  );

  const applyImage = (url) => {
    if (imageType === 'song') {
      if (!currentTrack) {
        triggerToast('Play a song first, then upload its cover');
        return;
      }
      setSongCoverImage(currentTrack, url);
      return;
    }
    if (imageType === 'cover') {
      updateProfileAction({ coverUrl: url });
    } else {
      updateProfileAction({ avatarUrl: url });
    }
  };

  const handleSuggestedPick = (url) => {
    applyImage(url);
  };

  const handleImageFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploadingImage(true);
    try {
      const dataUrl = await fileToProfileDataUrl(file, {
        maxEdge: imageType === 'avatar' ? 512 : 960,
        quality: 0.82,
      });
      applyImage(dataUrl);
    } catch (err) {
      triggerToast(`❌ ${err.message || 'Upload failed'}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const clearImage = () => {
    if (imageType === 'song') {
      if (!currentTrack) {
        triggerToast('Play a song first');
        return;
      }
      setSongCoverImage(currentTrack, '');
      return;
    }
    if (imageType === 'cover') updateProfileAction({ coverUrl: '' });
    else updateProfileAction({ avatarUrl: '' });
  };

  const likedCount = Math.max(
    likedTrackIds?.length || 0,
    likedTracksData?.length || 0
  );
  const phoneCount = phoneStoredTracks?.length || 0;

  const handleDownload = () => {
    if (!likedCount) {
      triggerToast('No liked songs to export yet');
      return;
    }
    exportLikedSongsBackup();
  };

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const result = importLikedSongsFromJson(text);
      if (result?.ok) {
        setTimeout(() => setActiveView('liked'), 600);
      }
    } catch (err) {
      triggerToast(`❌ Could not read file: ${err.message || 'Unknown error'}`);
    } finally {
      setImporting(false);
    }
  };

  const handleProfileSave = (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      triggerToast('Please enter your display name');
      return;
    }
    setSavingProfile(true);
    try {
      updateProfileAction({
        name: profileForm.name.trim(),
        username: profileForm.username.trim() || profileForm.name.trim().toLowerCase().replace(/\s+/g, '_'),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
      });
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="view-content sp-settings">
      <div className="sp-settings-header">
        <button
          type="button"
          className="sp-settings-back"
          onClick={() => setActiveView('home')}
          aria-label="Back"
        >
          <ChevronLeft size={28} />
        </button>
        <h1 className="sp-settings-title">Settings</h1>
      </div>

      <p className="sp-settings-lead">
        Update your profile, and save liked songs to this phone&apos;s local storage.
      </p>

      {/* ── Suggested / upload image ── */}
      <section className="sp-settings-card">
        <div className="sp-settings-card-head">
          <ImagePlus size={20} color="var(--spotify-green, #1db954)" />
          <div>
            <h2>Profile &amp; song images</h2>
            <p>Pick suggested art or upload — including song-wise covers</p>
          </div>
        </div>

        <div className="sp-image-type-row">
          {IMAGE_UPLOAD_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`sp-chip ${imageType === t.id ? 'active' : ''}`}
              onClick={() => setImageType(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="sp-image-type-hint">
          {IMAGE_UPLOAD_TYPES.find((t) => t.id === imageType)?.hint}
        </p>

        {imageType === 'song' && (
          <div className="sp-song-cover-target" key={songCoverVersion}>
            {currentTrack ? (
              <>
                <strong>{currentTrack.title}</strong>
                <span>{currentTrack.artist || currentTrack.singers || 'Now playing'}</span>
              </>
            ) : (
              <span>No song playing — open Home, play a track, then upload its cover here.</span>
            )}
          </div>
        )}

        <div className="sp-image-preview-row">
          <div
            className={`sp-image-preview ${imageType === 'avatar' ? 'is-avatar' : 'is-cover'}`}
            style={{
              backgroundImage: `url(${
                imageType === 'song'
                  ? songPreviewUrl
                  : imageType === 'cover'
                    ? (currentUser?.coverUrl || SUGGESTED_IMAGES[0].url)
                    : (currentUser?.avatarUrl || SUGGESTED_IMAGES[1].url)
              })`,
            }}
          />
          <div className="sp-image-preview-actions">
            <button
              type="button"
              className="sp-settings-action"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploadingImage || (imageType === 'song' && !currentTrack)}
            >
              <Upload size={20} />
              <div className="sp-settings-action-text">
                <strong>{uploadingImage ? 'Uploading…' : 'Upload from phone'}</strong>
                <span>
                  {imageType === 'song'
                    ? 'JPG / PNG — saved for this song only'
                    : 'JPG / PNG — saved on this device'}
                </span>
              </div>
            </button>
            <button type="button" className="sp-settings-action" onClick={clearImage}>
              <Trash2 size={20} />
              <div className="sp-settings-action-text">
                <strong>
                  Remove {imageType === 'song' ? 'song cover' : imageType === 'cover' ? 'cover' : 'photo'}
                </strong>
                <span>
                  {imageType === 'song'
                    ? 'Back to original album art'
                    : 'Back to letter avatar / default'}
                </span>
              </div>
            </button>
          </div>
        </div>

        <p className="sp-suggested-label">Suggested</p>
        <div className="sp-suggested-grid">
          {SUGGESTED_IMAGES.map((img) => {
            const selected =
              imageType === 'song'
                ? songPreviewUrl === img.url
                : imageType === 'cover'
                  ? currentUser?.coverUrl === img.url
                  : currentUser?.avatarUrl === img.url;
            return (
              <button
                key={img.id}
                type="button"
                className={`sp-suggested-thumb ${selected ? 'active' : ''}`}
                onClick={() => handleSuggestedPick(img.url)}
                title={img.label}
                disabled={imageType === 'song' && !currentTrack}
              >
                <img src={img.url} alt={img.label} />
                <span>{img.label}</span>
              </button>
            );
          })}
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleImageFile}
        />
      </section>

      {/* ── Profile update ── */}
      <section className="sp-settings-card">
        <div className="sp-settings-card-head">
          <User size={20} color="var(--spotify-green, #1db954)" />
          <div>
            <h2>Your profile</h2>
            <p>Name shown on Home and in the sidebar</p>
          </div>
        </div>

        <form className="sp-profile-form" onSubmit={handleProfileSave}>
          <label className="sp-profile-field">
            <span>Display name</span>
            <input
              type="text"
              value={profileForm.name}
              onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Your name"
              maxLength={60}
              autoComplete="name"
            />
          </label>
          <label className="sp-profile-field">
            <span>Username</span>
            <input
              type="text"
              value={profileForm.username}
              onChange={(e) => setProfileForm((p) => ({ ...p, username: e.target.value }))}
              placeholder="username"
              maxLength={40}
              autoComplete="username"
            />
          </label>
          <label className="sp-profile-field">
            <span>Email</span>
            <input
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="you@email.com"
              autoComplete="email"
            />
          </label>
          <label className="sp-profile-field">
            <span>Phone</span>
            <input
              type="tel"
              value={profileForm.phone}
              onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+91 …"
              autoComplete="tel"
            />
          </label>
          <button type="submit" className="sp-settings-save-btn" disabled={savingProfile}>
            <Save size={18} />
            {savingProfile ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      </section>

      {/* ── Like → phone download ── */}
      <section className="sp-settings-card">
        <div className="sp-settings-card-head">
          <Smartphone size={20} color="var(--spotify-green, #1db954)" />
          <div>
            <h2>Like → phone storage</h2>
            <p>{phoneCount} song{phoneCount === 1 ? '' : 's'} saved on this device</p>
          </div>
        </div>

        <button
          type="button"
          className={`sp-settings-action sp-settings-toggle ${autoDownloadLiked ? 'is-on' : ''}`}
          onClick={toggleAutoDownloadLiked}
        >
          <Heart size={20} fill={autoDownloadLiked ? 'var(--spotify-green, #1db954)' : 'none'} color="var(--spotify-green, #1db954)" />
          <div className="sp-settings-action-text">
            <strong>{autoDownloadLiked ? 'Auto-download ON' : 'Auto-download OFF'}</strong>
            <span>
              {autoDownloadLiked
                ? 'Tapping ♥ saves the song to phone local storage (and caches audio when possible)'
                : 'Likes only stay in Liked Songs — no phone download'}
            </span>
          </div>
          <span className={`sp-toggle-pill ${autoDownloadLiked ? 'on' : ''}`} aria-hidden>
            {autoDownloadLiked ? 'ON' : 'OFF'}
          </span>
        </button>
      </section>

      <section className="sp-settings-card">
        <div className="sp-settings-card-head">
          <Heart size={20} color="var(--spotify-green, #1db954)" fill="var(--spotify-green, #1db954)" />
          <div>
            <h2>Liked songs backup</h2>
            <p>{likedCount} liked song{likedCount === 1 ? '' : 's'} on this device</p>
          </div>
        </div>

        <button type="button" className="sp-settings-action" onClick={handleDownload}>
          <Download size={20} />
          <div className="sp-settings-action-text">
            <strong>Download liked songs JSON</strong>
            <span>Save before uninstall so likes are not lost</span>
          </div>
          <FileJson size={18} opacity={0.7} />
        </button>

        <button
          type="button"
          className="sp-settings-action"
          onClick={handlePickFile}
          disabled={importing}
        >
          <Upload size={20} />
          <div className="sp-settings-action-text">
            <strong>{importing ? 'Importing…' : 'Upload liked songs JSON'}</strong>
            <span>Restore likes — they appear in Liked Songs</span>
          </div>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </section>

      <section className="sp-settings-card">
        <button
          type="button"
          className="sp-settings-action"
          onClick={() => setShowThemeModal(true)}
        >
          <Palette size={20} />
          <div className="sp-settings-action-text">
            <strong>Theme &amp; appearance</strong>
            <span>Dark / light mode and custom colors</span>
          </div>
        </button>
      </section>

      {(isAdminRole || isSuperAdminRole) && (
        <section className="sp-settings-card">
          {isAdminRole && (
            <button
              type="button"
              className="sp-settings-action"
              onClick={() => setShowAdminPanel(true)}
            >
              <Shield size={20} color="#FF6B00" />
              <div className="sp-settings-action-text">
                <strong>Admin Panel</strong>
                <span>Listening dashboard · stage-1 approve / reject</span>
              </div>
            </button>
          )}
          {isSuperAdminRole && (
            <button
              type="button"
              className="sp-settings-action"
              onClick={() => setShowSuperAdminModal(true)}
            >
              <ShieldCheck size={20} color="#ef4444" />
              <div className="sp-settings-action-text">
                <strong>Super Admin Panel</strong>
                <span>Listening dashboard, approve, deactivate, reactivate</span>
              </div>
            </button>
          )}
        </section>
      )}

      <section className="sp-settings-card">
        <button
          type="button"
          className="sp-settings-action sp-settings-logout"
          onClick={() => logoutUserAction()}
        >
          <LogOut size={20} color="#f87171" />
          <div className="sp-settings-action-text">
            <strong style={{ color: '#f87171' }}>
              {isLoggedIn ? 'Log out' : 'Exit to login'}
            </strong>
            <span>
              {isLoggedIn
                ? 'Sign out of DobbyPay Music and return to the login screen'
                : 'Leave guest mode and return to the login screen'}
            </span>
          </div>
        </button>
      </section>

      <div className="sp-settings-note">
        <ShieldAlert size={16} />
        <span>
          Uninstall clears app storage. Keep the JSON file in Downloads or Files to restore later.
        </span>
      </div>
    </div>
  );
}
