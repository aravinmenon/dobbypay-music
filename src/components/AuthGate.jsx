import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import {
  Lock, Mail, User, Phone, ArrowRight,
  ShieldAlert, AlertCircle, CheckCircle2, LogIn, UserPlus,
  MessageCircle, ExternalLink, RefreshCw
} from 'lucide-react';
import DobbyPayLogo from './DobbyPayLogo';
import SupportChatWidget from './SupportChatWidget';
import {
  requestAccountReactivation,
  getApiBase,
  setApiBaseOverride,
  clearDeadApiOverride
} from '../services/authService';

export default function AuthGate() {
  const {
    loginUserAction,
    registerUserAction,
    triggerToast
  } = usePlayer();

  // Mode defaults to 'login'
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [formData, setFormData] = useState({
    identifier: '',
    username: '',
    fullName: '',
    email: '',
    phone: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);
  const [approvalAlert, setApprovalAlert] = useState(null); // { user, error, adminWhatsApp }
  const [apiUrlDraft, setApiUrlDraft] = useState(() => {
    try { return getApiBase(); } catch { return ''; }
  });


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMsg(null);
    setStatusMsg(null);
  };

  // Standard Username / Email + Password Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!formData.identifier || !formData.password) {
      setErrorMsg('Please enter your username/email and password.');
      if (typeof triggerToast === 'function') {
        triggerToast('⚠️ Please enter username/email and password');
      }
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setStatusMsg(null);
    setApprovalAlert(null);

    try {
      const res = await loginUserAction(formData.identifier, formData.password);
      
      if (res.success) {
        // Logged in!
        return;
      }

      if (res.notApproved || res.suspended) {
        setApprovalAlert({
          user: res.user,
          error: res.error,
          adminWhatsApp: res.adminWhatsApp || '+918270006116',
          suspended: !!res.suspended || res.user?.status === 'suspended',
          reactivationRequested: !!res.reactivationRequested || Number(res.user?.reactivation_requested) === 1
        });
        if (typeof triggerToast === 'function') {
          triggerToast(
            res.suspended || res.user?.status === 'suspended'
              ? '🚫 Account suspended — request reactivation'
              : '⏳ Account awaiting Admin & Super Admin approval'
          );
        }
        return;
      }

      if (res.userNotFound) {
        // User NOT found in users table: alert via toaster and automatically switch to Create Account mode!
        const idVal = formData.identifier.trim();
        const isEmail = idVal.includes('@');
        const defaultName = isEmail ? idVal.split('@')[0] : idVal;

        if (typeof triggerToast === 'function') {
          triggerToast(`⚠️ User "${idVal}" not found in database! Please register.`);
        }
        setErrorMsg(`User "${idVal}" is not registered. Please create an account below.`);

        setFormData(prev => ({
          ...prev,
          username: defaultName,
          fullName: defaultName,
          email: isEmail ? idVal : '',
          password: prev.password || ''
        }));

        // Switch to Create Account / Register tab!
        setMode('register');
        return;
      }

      if (res.wrongPassword) {
        if (typeof triggerToast === 'function') {
          triggerToast('❌ Incorrect password! Please check and try again.');
        }
        setErrorMsg('Incorrect password. Please verify your password and try again.');
        return;
      }

      // Other login error
      if (typeof triggerToast === 'function') {
        triggerToast(`❌ ${res.error || 'Login failed'}`);
      }
      setErrorMsg(res.error || 'Login failed. Please check your credentials.');
    } catch (err) {
      if (typeof triggerToast === 'function') {
        triggerToast(`❌ Login error: ${err.message}`);
      }
      setErrorMsg(err.message || 'Login error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Standard Registration
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.email || !formData.password) {
      setErrorMsg('Please enter all required fields.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setStatusMsg(null);
    setApprovalAlert(null);

    try {
      const res = await registerUserAction({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName || formData.username,
        phone: formData.phone
      });
      if (res.success) {
        // Switch to Login tab and pre-fill email
        const regEmail = formData.email;
        setMode('login');
        setFormData(prev => ({
          ...prev,
          identifier: regEmail,
          password: ''
        }));
        setApprovalAlert({
          isNewRegistration: true,
          user: res.user,
          error: res.message || 'Registration stored in database! Pending Admin & Super Admin approval.',
          adminWhatsApp: res.adminWhatsApp || '+918270006116'
        });
      } else {
        const isConflict = res.alreadyExists || (res.error && res.error.toLowerCase().includes('already registered'));
        if (isConflict) {
          if (typeof triggerToast === 'function') {
            triggerToast('⚠️ Already registered! Switched to Sign In.');
          }
          setErrorMsg('This account already exists in database. Switched to Sign In. Please enter your password.');
          setFormData(prev => ({
            ...prev,
            identifier: prev.email || prev.username,
            password: ''
          }));
          setMode('login');
        } else {
          if (typeof triggerToast === 'function') {
            triggerToast(`❌ ${res.error || 'Registration failed'}`);
          }
          setErrorMsg(res.error || 'Registration failed.');
        }
      }
    } catch (err) {
      if (typeof triggerToast === 'function') {
        triggerToast(`❌ ${err.message || 'Registration failed'}`);
      }
      setErrorMsg(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };



  const openWhatsAppApproval = () => {
    if (!approvalAlert) return;
    const phone = (approvalAlert.adminWhatsApp || '918270006116').replace(/[^0-9]/g, '');
    const user = approvalAlert.user || {};
    const suspended = !!approvalAlert.suspended;
    const text = encodeURIComponent(
      suspended
        ? `Hello Super Admin, my DobbyPay Music account was suspended.\n\n` +
          `👤 Name: ${user.name || user.username || 'User'}\n` +
          `📧 Email: ${user.email || 'N/A'}\n` +
          `🆔 User ID: ${user.id || 'N/A'}\n\n` +
          `Please reactivate my account so I can log in, like songs and use payments again. Thank you!`
        : `Hello Admin, I have registered on DobbyPay Music.\n\n` +
          `👤 Name: ${user.name || user.username || 'User'}\n` +
          `📧 Email: ${user.email || 'N/A'}\n` +
          `🆔 User ID: ${user.id || 'N/A'}\n` +
          `💼 Role: ${user.role || 'client'}\n\n` +
          `Please approve my access so I can log in. Thank you!`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  const handleRequestReactivation = async () => {
    if (!approvalAlert?.user) return;
    setLoading(true);
    try {
      const res = await requestAccountReactivation(approvalAlert.user);
      setApprovalAlert((prev) => ({
        ...prev,
        reactivationRequested: true,
        error: res.message || 'Reactivation request sent to Super Admin.'
      }));
      triggerToast?.('📨 Reactivation request sent to Super Admin');
    } catch (err) {
      setErrorMsg(err.message || 'Could not request reactivation');
      triggerToast?.(`❌ ${err.message || 'Request failed'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-gate-page">
      <div className="auth-gate-backdrop" />

      <div className="auth-gate-card">
        {/* Brand Header */}
        <div className="auth-gate-header">
          <DobbyPayLogo size="large" />
          <h1 className="auth-gate-title">
            {mode === 'register' ? 'Sign up for DobbyPay Music' : 'Log in to DobbyPay Music'}
          </h1>
        </div>

        {/* Pending Approval Alert Modal / Banner */}
        {approvalAlert && (
          <div className="auth-approval-alert-card" style={approvalAlert.isNewRegistration ? { borderColor: 'rgba(34, 197, 94, 0.4)', background: 'rgba(34, 197, 94, 0.08)' } : {}}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div className="auth-approval-icon-box" style={approvalAlert.isNewRegistration ? { background: 'rgba(34, 197, 94, 0.15)' } : {}}>
                {approvalAlert.isNewRegistration ? (
                  <CheckCircle2 size={26} color="#22c55e" />
                ) : (
                  <ShieldAlert size={26} color="#f59e0b" />
                )}
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 800, color: approvalAlert.isNewRegistration ? '#22c55e' : (approvalAlert.suspended ? '#ef4444' : '#f59e0b') }}>
                  {approvalAlert.isNewRegistration
                    ? '🎉 Registration Stored to Database — Approval Pending'
                    : approvalAlert.suspended
                      ? (approvalAlert.reactivationRequested
                        ? '⏸ Suspended — Reactivation Requested'
                        : '🚫 Account Suspended by Super Admin')
                      : 'Admin / Super Admin Approval Required'}
                </h3>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.82rem', color: '#e4e4e7', lineHeight: 1.45 }}>
                  {approvalAlert.isNewRegistration ? (
                    <>
                      Hello <strong>{approvalAlert.user?.name || approvalAlert.user?.username}</strong>! Your account has been registered in the MySQL database (Role: <strong>{approvalAlert.user?.role || 'client'}</strong>, Status: <span style={{ color: '#f59e0b' }}>pending</span>).
                      <br />
                      Before you can log in, an <strong>Admin</strong> or <strong>Super Admin</strong> must approve your account. Send a quick approval request on WhatsApp below, then enter your password to sign in once approved!
                    </>
                  ) : approvalAlert.suspended ? (
                    <>
                      Hello <strong>{approvalAlert.user?.name || approvalAlert.user?.username}</strong>! Your account is <strong style={{ color: '#ef4444' }}>suspended</strong>.
                      Login, liked songs sync and payments are blocked.
                      {approvalAlert.reactivationRequested
                        ? ' Your reactivation request is waiting for Super Admin.'
                        : ' Request reactivation below, or WhatsApp Super Admin.'}
                    </>
                  ) : (
                    <>
                      Hello <strong>{approvalAlert.user?.name || approvalAlert.user?.username}</strong>! Your account is registered as <strong>{approvalAlert.user?.role || 'client'}</strong> (Status: <span style={{ color: '#f59e0b' }}>{approvalAlert.user?.status || 'pending'}</span>), but has not yet been approved by an Admin or Super Admin.
                    </>
                  )}
                </p>

                {/* WhatsApp Button + Re-check Button */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {approvalAlert.suspended && !approvalAlert.reactivationRequested && (
                    <button
                      type="button"
                      onClick={handleRequestReactivation}
                      className="auth-recheck-btn"
                      disabled={loading}
                    >
                      <RefreshCw size={15} />
                      <span>Request Reactivation</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={openWhatsAppApproval}
                    className="auth-whatsapp-btn"
                  >
                    <MessageCircle size={18} fill="#ffffff" color="#22c55e" />
                    <span>{approvalAlert.suspended ? 'WhatsApp Super Admin' : 'Send Approval Request on WhatsApp'}</span>
                    <ExternalLink size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={handleLoginSubmit}
                    className="auth-recheck-btn"
                    title="Click to log in once approved / reactivated"
                  >
                    <RefreshCw size={15} />
                    <span>Sign In Now</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Switcher: Sign In vs Create Account */}
        <div className="auth-gate-tabs">
          <button
            className={`auth-gate-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setErrorMsg(null); }}
          >
            <LogIn size={16} />
            <span>Sign In</span>
          </button>
          <button
            className={`auth-gate-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setErrorMsg(null); }}
          >
            <UserPlus size={16} />
            <span>Create Account</span>
          </button>
        </div>

        {/* Standard Error Alert */}
        {errorMsg && (
          <div className="auth-gate-error-banner" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Connection Settings — paste new public API URL without rebuilding APK */}
        {(errorMsg && /resolve host|Network error|Failed to fetch|timeout/i.test(String(errorMsg))) && (
          <div style={{
            marginBottom: 12,
            padding: '12px 14px',
            borderRadius: 10,
            background: 'rgba(255,107,0,0.1)',
            border: '1px solid rgba(255,107,0,0.35)'
          }}>
            <div style={{ fontSize: '0.8rem', color: '#ffb37a', marginBottom: 8, lineHeight: 1.4 }}>
              Server link expired. On your PC keep <strong>npm run server</strong> + <strong>npm run public-api</strong> running, then paste the new HTTPS API URL here (ends with <code>/api</code>).
            </div>
            <div className="input-with-icon" style={{ marginBottom: 8 }}>
              <input
                type="url"
                value={apiUrlDraft}
                onChange={(e) => setApiUrlDraft(e.target.value)}
                placeholder="https://xxxx.trycloudflare.com/api"
                style={{ width: '100%' }}
              />
            </div>
            <button
              type="button"
              className="auth-recheck-btn"
              onClick={() => {
                clearDeadApiOverride(errorMsg || '');
                const result = setApiBaseOverride(apiUrlDraft.trim());
                if (!result.ok) {
                  setErrorMsg(result.error || 'Invalid API URL');
                  return;
                }
                setStatusMsg(`API saved: ${result.url || apiUrlDraft.trim()}. Try Log In again.`);
                setErrorMsg(null);
                if (typeof triggerToast === 'function') triggerToast('✅ Server URL saved');
              }}
            >
              <RefreshCw size={15} />
              <span>Save Server URL</span>
            </button>
          </div>
        )}

        {/* Confirmed Provider Status Notice */}
        {statusMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            color: '#22c55e',
            fontSize: '0.82rem',
            marginBottom: '12px',
            lineHeight: 1.4
          }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* 1. DEFAULT: Standard Username / Email + Password Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="auth-form">
            <div className="form-group">
              <label>Email or Username</label>
              <div className="input-with-icon">
                <User size={16} className="input-icon" />
                <input
                  type="text"
                  name="identifier"
                  placeholder="Email or username"
                  value={formData.identifier}
                  onChange={handleChange}
                  required
                  autoFocus
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

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
              style={{ marginTop: '8px' }}
            >
              {loading ? 'Logging in...' : (
                <>
                  <span>Log In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <p className="auth-switch-hint">
              Don&apos;t have an account?{' '}
              <button type="button" className="auth-text-link" onClick={() => { setMode('register'); setErrorMsg(null); }}>
                Sign up
              </button>
            </p>
          </form>
        )}

        {/* Registration Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="auth-form">
            <div className="form-group">
              <label>Full name</label>
              <div className="input-with-icon">
                <User size={16} className="input-icon" />
                <input
                  type="text"
                  name="fullName"
                  placeholder="Enter your name"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Username</label>
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
              <label>Email</label>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  name="email"
                  placeholder="name@domain.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Mobile (optional)</label>
              <div className="input-with-icon">
                <Phone size={16} className="input-icon" />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone number"
                  value={formData.phone}
                  onChange={handleChange}
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
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
              style={{ marginTop: '8px' }}
            >
              {loading ? 'Creating account...' : (
                <>
                  <span>Sign up</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <p className="auth-switch-hint">
              Already have an account?{' '}
              <button type="button" className="auth-text-link" onClick={() => { setMode('login'); setErrorMsg(null); }}>
                Log in
              </button>
            </p>
          </form>
        )}

      </div>

      {/* Support chat only on login / registration screen */}
      <SupportChatWidget />
    </div>
  );
}
