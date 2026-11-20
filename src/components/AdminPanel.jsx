import React, { useEffect, useMemo, useState } from 'react';
import {
  Shield, X, RefreshCw, Search, Clock, UserCheck, Users, Mail,
  Send, Ban, CheckCircle2, BarChart3
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { fetchAdminUsers, approveUserAndSendEmail } from '../services/authService';
import ListeningDashboard from './ListeningDashboard';

function isStaffRole(role) {
  const r = String(role || '').toLowerCase();
  return r === 'admin' || r === 'super_admin';
}

function needsAdminApproval(u) {
  if (isStaffRole(u.role)) return false;
  return Number(u.admin_approved) === 0 && u.status !== 'suspended' && Number(u.admin_approved) !== -1;
}

function awaitingSuper(u) {
  if (isStaffRole(u.role)) return false;
  return Number(u.admin_approved) === 1 && Number(u.superadmin_approved) !== 1 && u.status !== 'active';
}

function isRejected(u) {
  if (isStaffRole(u.role)) return false;
  return Number(u.admin_approved) === -1 || Number(u.superadmin_approved) === -1 || u.status === 'suspended';
}

export default function AdminPanel() {
  const {
    showAdminPanel,
    setShowAdminPanel,
    currentUser,
    triggerToast
  } = usePlayer();

  const [tab, setTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await fetchAdminUsers();
      setUsers(Array.isArray(list) ? list : []);
    } catch (_) {
      setUsers([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (showAdminPanel) loadUsers();
  }, [showAdminPanel]);

  const adminQueue = useMemo(() => users.filter(needsAdminApproval), [users]);
  const superQueue = useMemo(() => users.filter(awaitingSuper), [users]);
  const rejected = useMemo(() => users.filter(isRejected), [users]);
  const activeCount = useMemo(
    () => users.filter((u) => !isStaffRole(u.role) && u.status === 'active' && Number(u.admin_approved) === 1 && Number(u.superadmin_approved) === 1).length,
    [users]
  );

  const filtered = useMemo(() => {
    let list = tab === 'adminQ' ? adminQueue : tab === 'superQ' ? superQueue : rejected;
    if (!search.trim()) return list;
    const term = search.toLowerCase();
    return list.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        (u.phone && String(u.phone).includes(term))
    );
  }, [tab, adminQueue, superQueue, rejected, search]);

  const runAction = async (user, action) => {
    setBusyId(user.id);
    try {
      const res = await approveUserAndSendEmail(user.id, 'Admin', action);
      triggerToast(res.message || `Done: ${action}`);
      await loadUsers();
    } catch (err) {
      triggerToast(`❌ ${err.message || 'Action failed'}`);
    } finally {
      setBusyId(null);
    }
  };

  if (!showAdminPanel) return null;

  return (
    <div className="staff-panel-overlay" onClick={() => setShowAdminPanel(false)}>
      <div className="staff-panel-container" onClick={(e) => e.stopPropagation()}>
        <div className="staff-panel-header admin-tone">
          <div className="staff-panel-title-row">
            <div className="staff-panel-icon admin-tone">
              <Shield size={26} color="#FF6B00" />
            </div>
            <div>
              <div className="staff-panel-heading">
                <h2>Admin Panel</h2>
                <span className="staff-role-pill admin">ADMIN</span>
              </div>
              <p>Listening dashboard · Stage 1 approve · Forward to Super Admin</p>
            </div>
          </div>
          <button type="button" className="staff-close-btn" onClick={() => setShowAdminPanel(false)} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="staff-stats-grid">
          <div className="staff-stat-card">
            <Clock size={20} color="#f59e0b" />
            <div>
              <strong>{adminQueue.length}</strong>
              <span>Pending Admin</span>
            </div>
          </div>
          <div className="staff-stat-card">
            <Mail size={20} color="#FF6B00" />
            <div>
              <strong>{superQueue.length}</strong>
              <span>Awaiting Super Admin</span>
            </div>
          </div>
          <div className="staff-stat-card">
            <UserCheck size={20} color="#22c55e" />
            <div>
              <strong>{activeCount}</strong>
              <span>Active listeners</span>
            </div>
          </div>
          <div className="staff-stat-card">
            <Users size={20} color="#3b82f6" />
            <div>
              <strong>{users.length}</strong>
              <span>Total users</span>
            </div>
          </div>
        </div>

        <div className="staff-tabs">
          <button type="button" className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>
            <BarChart3 size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Listening Dashboard
          </button>
          <button type="button" className={tab === 'adminQ' ? 'active' : ''} onClick={() => setTab('adminQ')}>
            Pending Admin Review
            {adminQueue.length > 0 && <span className="staff-tab-badge">{adminQueue.length}</span>}
          </button>
          <button type="button" className={tab === 'superQ' ? 'active' : ''} onClick={() => setTab('superQ')}>
            Sent to Super Admin
            {superQueue.length > 0 && <span className="staff-tab-badge muted">{superQueue.length}</span>}
          </button>
          <button type="button" className={tab === 'rejected' ? 'active' : ''} onClick={() => setTab('rejected')}>
            Rejected / Suspended
          </button>
        </div>

        {tab === 'dashboard' ? (
          <div className="staff-list">
            <ListeningDashboard accent="#FF6B00" />
          </div>
        ) : (
          <>
            <div className="staff-toolbar">
              <div className="staff-search">
                <Search size={15} color="#71717a" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, phone..."
                />
              </div>
              <button type="button" className="staff-ghost-btn" onClick={loadUsers} disabled={loading}>
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            <div className="staff-list">
              {filtered.length === 0 ? (
                <div className="staff-empty">
                  <CheckCircle2 size={40} color="#52525b" />
                  <h3>Queue empty</h3>
                  <p>No users in this list right now.</p>
                </div>
              ) : (
                filtered.map((u) => {
                  const busy = busyId === u.id;
                  const initial = (u.name || u.email || '?').charAt(0).toUpperCase();
                  return (
                    <div key={u.id} className="staff-user-card">
                      <div className="staff-avatar">{initial}</div>
                      <div className="staff-user-meta">
                        <div className="staff-user-name">{u.name || 'User'}</div>
                        <div className="staff-user-email">{u.email}</div>
                        <div className="staff-user-sub">
                          {u.phone ? `📞 ${u.phone} · ` : ''}
                          Joined {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                        </div>
                      </div>
                      <div className="staff-actions">
                        {tab === 'adminQ' && (
                          <>
                            <button
                              type="button"
                              className="staff-btn approve"
                              disabled={busy}
                              onClick={() => runAction(u, 'admin_approve')}
                            >
                              {busy ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                              Approve &amp; Email
                            </button>
                            <button
                              type="button"
                              className="staff-btn reject"
                              disabled={busy}
                              onClick={() => runAction(u, 'admin_reject')}
                            >
                              <Ban size={14} />
                              Reject
                            </button>
                          </>
                        )}
                        {tab === 'superQ' && (
                          <span className="staff-waiting-pill">⏳ Waiting for Super Admin</span>
                        )}
                        {tab === 'rejected' && (
                          <span className="staff-rejected-pill">Suspended</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        <div className="staff-footer">
          <span>Signed in as <strong>{currentUser?.name || currentUser?.email}</strong> (Admin)</span>
          <button type="button" className="staff-done-btn" onClick={() => setShowAdminPanel(false)}>Done</button>
        </div>
      </div>
    </div>
  );
}
