import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { X, Lock, Mail, User, Sparkles, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, LogIn, UserPlus } from 'lucide-react';
import DobbyPayLogo from './DobbyPayLogo';

export default function DobbyAuthModal() {
  const {
    showAuthModal,
    setShowAuthModal,
    currentUser,
    isLoggedIn,
    loginUserAction,
    registerUserAction,
    logoutUserAction
  } = usePlayer();

  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [formData, setFormData] = useState({
    identifier: '',
    username: '',
    fullName: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!showAuthModal) return null;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setErrorMsg(null);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!formData.identifier || !formData.password) {
      setErrorMsg('Please enter your username/email and password.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await loginUserAction(formData.identifier, formData.password);
      if (res.success) {
        setSuccessMsg(`Welcome back, ${res.user.full_name || res.user.username}!`);
        setTimeout(() => {
          setShowAuthModal(false);
          setSuccessMsg(null);
        }, 1200);
      } else if (res.userNotFound) {
        setErrorMsg('User not found in database. Switching to Create Account...');
        setMode('register');
        setFormData(prev => ({
          ...prev,
          username: prev.identifier,
          fullName: prev.identifier,
          email: prev.identifier.includes('@') ? prev.identifier : ''
        }));
      } else if (res.wrongPassword) {
        setErrorMsg('Incorrect password. Please verify and try again.');
      } else {
        setErrorMsg(res.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.email || !formData.password) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await registerUserAction({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName || formData.username
      });
      if (res.success) {
        setSuccessMsg('Account created successfully! $100.00 DobbyPay bonus unlocked!');
        setTimeout(() => {
          setShowAuthModal(false);
          setSuccessMsg(null);
        }, 1500);
      } else {
        setErrorMsg(res.error || 'Registration failed.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoFill = () => {
    setFormData(prev => ({
      ...prev,
      identifier: 'aravindhan@dobbypay.com',
      password: 'password123'
    }));
  };

  return (
    <div className="modal-backdrop" onClick={() => setShowAuthModal(false)}>
      <div className="dobby-modal-card auth-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="modal-close-btn" onClick={() => setShowAuthModal(false)} title="Close">
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '8px' }}>
            <DobbyPayLogo size="medium" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '6px 0 2px 0', color: '#FFF' }}>
            {isLoggedIn ? 'DobbyPay Account' : (mode === 'login' ? 'Sign In to DobbyPay' : 'Join DobbyPay & Spotify')}
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#a1a1aa', margin: 0 }}>
            {isLoggedIn
              ? 'Liked songs and playlists are saved to this account'
              : 'Sign in to keep your library after a reinstall or on another phone'}
          </p>
        </div>

        {isLoggedIn ? (
          /* Profile info when already logged in */
          <div className="auth-profile-logged-in">
            <div className="auth-user-badge">
              <div className="user-avatar" style={{ width: '56px', height: '56px', fontSize: '1.5rem', background: 'linear-gradient(135deg, #FF6B00, #ff8800)' }}>
                {currentUser?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFF' }}>
                  {currentUser?.full_name || currentUser?.username}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>{currentUser?.email}</div>
                <span className="dobby-card-status" style={{ display: 'inline-block', marginTop: '4px' }}>
                  {currentUser?.vip_status ? '⭐ VIP MEMBER' : 'STANDARD'}
                </span>
              </div>
            </div>

            <div className="auth-stats-grid">
              <div className="auth-stat-card">
                <span className="auth-stat-label">Wallet Balance</span>
                <span className="auth-stat-value" style={{ color: '#22c55e' }}>
                  ${Number(currentUser?.wallet_balance || 0).toFixed(2)}
                </span>
              </div>
              <div className="auth-stat-card">
                <span className="auth-stat-label">Reward Points</span>
                <span className="auth-stat-value" style={{ color: '#FF6B00' }}>
                  {currentUser?.reward_points || 500} ⚡
                </span>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button
                className="btn-primary"
                style={{ flex: 1, padding: '12px', background: '#3f3f46' }}
                onClick={() => setShowAuthModal(false)}
              >
                Close
              </button>
              <button
                className="btn-primary"
                style={{ flex: 1, padding: '12px', background: '#ef4444' }}
                onClick={() => {
                  logoutUserAction();
                  setShowAuthModal(false);
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tab Switcher */}
            <div className="dobby-nav-tabs" style={{ marginBottom: '18px', width: '100%', justifyContent: 'center' }}>
              <button
                className={`dobby-tab-btn ${mode === 'login' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => { setMode('login'); setErrorMsg(null); }}
              >
                <LogIn size={15} />
                <span>Sign In</span>
              </button>
              <button
                className={`dobby-tab-btn ${mode === 'register' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => { setMode('register'); setErrorMsg(null); }}
              >
                <UserPlus size={15} />
                <span>Register</span>
              </button>
            </div>

            {/* Error / Success message */}
            {errorMsg && (
              <div className="auth-alert error">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="auth-alert success">
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Login Form */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="auth-form">
                <div className="form-group">
                  <label>Username or Email</label>
                  <div className="input-with-icon">
                    <User size={16} className="input-icon" />
                    <input
                      type="text"
                      name="identifier"
                      placeholder="e.g. Aravindhan or email@domain.com"
                      value={formData.identifier}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <div className="input-with-icon">
                    <Lock size={16} className="input-icon" />
                    <input
                      type="password"
                      name="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 12px 0' }}>
                  <button
                    type="button"
                    onClick={handleQuickDemoFill}
                    style={{ background: 'none', border: 'none', color: '#FF6B00', fontSize: '0.75rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                  >
                    Quick fill demo credentials
                  </button>
                  <span style={{ fontSize: '0.75rem', color: '#71717a' }}>MySQL Secured</span>
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loading}
                >
                  {loading ? 'Authenticating...' : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Register Form */}
            {mode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="auth-form">
                {/* Welcome Bonus Callout */}
                <div className="dobby-bonus-callout">
                  <Sparkles size={18} color="#FF6B00" />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#FF6B00' }}>
                      +$100.00 DobbyPay Welcome Bonus!
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#a1a1aa' }}>
                      Auto-credited into your MySQL wallet with 500 reward points
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Full Name</label>
                  <div className="input-with-icon">
                    <User size={16} className="input-icon" />
                    <input
                      type="text"
                      name="fullName"
                      placeholder="e.g. Aravindhan Anand"
                      value={formData.fullName}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Username *</label>
                  <div className="input-with-icon">
                    <User size={16} className="input-icon" />
                    <input
                      type="text"
                      name="username"
                      placeholder="Choose a username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Email Address *</label>
                  <div className="input-with-icon">
                    <Mail size={16} className="input-icon" />
                    <input
                      type="email"
                      name="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Password *</label>
                  <div className="input-with-icon">
                    <Lock size={16} className="input-icon" />
                    <input
                      type="password"
                      name="password"
                      placeholder="Min 6 characters"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loading}
                >
                  {loading ? 'Creating Account in MySQL...' : (
                    <>
                      <span>Create Account & Claim $100</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        )}

        {/* Security badge footer */}
        <div className="auth-security-footer">
          <ShieldCheck size={14} color="#22c55e" />
          <span>Synced with MySQL `dobbypay_users` table | End-to-end encrypted</span>
        </div>
      </div>
    </div>
  );
}
