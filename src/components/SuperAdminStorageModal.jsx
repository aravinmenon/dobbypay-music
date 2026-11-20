import React, { useState, useMemo, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import {
  ShieldCheck, CheckCircle2, RefreshCw, X, Search,
  Mail, Users, UserCheck, Send, Clock, Ban, Zap, RotateCcw, UserX, BarChart3
} from 'lucide-react';
import { fetchAdminUsers, approveUserAndSendEmail } from '../services/authService';
import ListeningDashboard from './ListeningDashboard';

function isStaffRole(role) {
  const r = String(role || '').toLowerCase();
  return r === 'admin' || r === 'super_admin';
}

/** Super Admin panel — approvals / deactivate / reactivation only (no songs). */
export default function SuperAdminStorageModal() {
  const {
    showSuperAdminModal,
    setShowSuperAdminModal,
    currentUser,
    triggerToast
  } = usePlayer();

  const [mainTab, setMainTab] = useState('dashboard');
  const [approvalSubTab, setApprovalSubTab] = useState('superQ');
  const [adminUsers, setAdminUsers] = useState([]);
  const [approvingId, setApprovingId] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

  const roleLower = String(currentUser?.role || '').toLowerCase();
  const isSuperRole = roleLower === 'super_admin';

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const list = await fetchAdminUsers();
      setAdminUsers(Array.isArray(list) ? list : []);
    } catch (_) {
      setAdminUsers([]);
    }
    setUsersLoading(false);
  };

  useEffect(() => {
    if (showSuperAdminModal) loadUsers();
  }, [showSuperAdminModal]);

  const handleUserAction = async (user, action) => {
    setApprovingId(user.id);
    const approvedBy = isSuperRole ? 'Super Admin' : 'Admin';
    try {
      const res = await approveUserAndSendEmail(user.id, approvedBy, action);
      const labels = {
        admin_approve: `✅ Admin approved ${user.name} — waiting for Super Admin`,
        super_approve: `✉️ ${user.name} fully approved — they can log in now`,
        super_fast_approve: `⚡ Fast-track activated ${user.name}`,
        admin_reject: `🚫 Rejected ${user.name}`,
        super_reject: `🚫 Super Admin rejected ${user.name}`,
        deactivate: `⏸ Deactivated ${user.name} — likes & payments blocked`,
        reactivate: `🔄 Reactivated ${user.name}`
      };
      triggerToast(res.message || labels[action] || 'Done');
      await loadUsers();
      return res;
    } catch (err) {
      triggerToast(`❌ Action failed: ${err.message}`);
    } finally {
      setApprovingId(null);
    }
  };

  const adminQueue = useMemo(
    () => (adminUsers || []).filter((u) => !isStaffRole(u.role) && Number(u.admin_approved) === 0 && Number(u.admin_approved) !== -1 && u.status !== 'suspended'),
    [adminUsers]
  );
  const superQueue = useMemo(
    () => (adminUsers || []).filter((u) => !isStaffRole(u.role) && Number(u.admin_approved) === 1 && Number(u.superadmin_approved) !== 1 && u.status !== 'active' && u.status !== 'suspended'),
    [adminUsers]
  );
  const rejectedUsers = useMemo(
    () => (adminUsers || []).filter((u) => !isStaffRole(u.role) && (Number(u.admin_approved) === -1 || Number(u.superadmin_approved) === -1 || u.status === 'suspended') && Number(u.reactivation_requested) !== 1),
    [adminUsers]
  );
  const reactivationQueue = useMemo(
    () => (adminUsers || []).filter((u) => !isStaffRole(u.role) && u.status === 'suspended' && Number(u.reactivation_requested) === 1),
    [adminUsers]
  );
  const activeCount = useMemo(
    () => (adminUsers || []).filter((u) => !isStaffRole(u.role) && u.status === 'active' && Number(u.admin_approved) === 1 && Number(u.superadmin_approved) === 1).length,
    [adminUsers]
  );

  const filteredUsers = useMemo(() => {
    let base = adminUsers || [];
    if (approvalSubTab === 'adminQ') base = adminQueue;
    else if (approvalSubTab === 'superQ') base = superQueue;
    else if (approvalSubTab === 'reactivateQ') base = reactivationQueue;
    else if (approvalSubTab === 'rejected') base = rejectedUsers;
    if (!userSearch) return base;
      const term = userSearch.toLowerCase();
    return base.filter((u) =>
        (u.name && u.name.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        (u.role && u.role.toLowerCase().includes(term))
      );
  }, [adminUsers, adminQueue, superQueue, reactivationQueue, rejectedUsers, approvalSubTab, userSearch]);

  const pendingUsersCount = useMemo(
    () => adminQueue.length + superQueue.length + reactivationQueue.length,
    [adminQueue, superQueue, reactivationQueue]
  );

  const renderUserActions = (u) => {
    const role = String(u.role || 'client').toLowerCase();
    const isAdmin = role === 'admin' || role === 'super_admin';
    const isSuspended = String(u.status) === 'suspended';
    const wantsReactivate = isSuspended && Number(u.reactivation_requested) === 1;
    const isFullyApproved = isAdmin || (Number(u.admin_approved) === 1 && Number(u.superadmin_approved) === 1 && u.status === 'active');
    const isRejected = Number(u.admin_approved) === -1 || Number(u.superadmin_approved) === -1 || isSuspended;
    const needsAdmin = !isAdmin && Number(u.admin_approved) === 0 && !isRejected;
    const needsSuper = !isAdmin && Number(u.admin_approved) === 1 && Number(u.superadmin_approved) !== 1 && !isFullyApproved && !isRejected;
    const isApproving = approvingId === u.id;

    if (isFullyApproved) {
      return (
        <div className="sa-action-row">
          <div className="sa-approved-pill">
            <CheckCircle2 size={16} />
            <span>Active</span>
          </div>
          {isSuperRole && (
            <button
              type="button"
              className="staff-btn reject"
              onClick={() => handleUserAction(u, 'deactivate')}
              disabled={isApproving}
              title="Deactivate customer — blocks login, likes sync and payments"
            >
              {isApproving ? <RefreshCw size={14} className="animate-spin" /> : <UserX size={14} />}
              Deactivate
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="sa-action-row">
        {needsAdmin && (
          <button
            type="button"
            className="superadmin-approve-btn"
            onClick={() => handleUserAction(u, 'admin_approve')}
            disabled={isApproving}
          >
            {isApproving ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            <span>Admin Approve</span>
          </button>
        )}
        {isSuperRole && needsSuper && (
          <>
            <button
              type="button"
              className="superadmin-approve-btn"
              onClick={() => handleUserAction(u, 'super_approve')}
              disabled={isApproving}
            >
              {isApproving ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              <span>Activate &amp; Email</span>
            </button>
            <button
              type="button"
              className="staff-btn fast"
              onClick={() => handleUserAction(u, 'super_fast_approve')}
              disabled={isApproving}
            >
              <Zap size={14} />
              Fast Track
            </button>
          </>
        )}
        {isSuperRole && needsAdmin && (
          <button
            type="button"
            className="staff-btn fast"
            onClick={() => handleUserAction(u, 'super_fast_approve')}
            disabled={isApproving}
          >
            <Zap size={14} />
            Fast Track
          </button>
        )}
        {!isRejected && !isFullyApproved && (
          <button
            type="button"
            className="staff-btn reject"
            onClick={() => handleUserAction(u, isSuperRole ? 'super_reject' : 'admin_reject')}
            disabled={isApproving}
          >
            <Ban size={14} />
            Reject
          </button>
        )}
        {isSuspended && isSuperRole && (
          <button
            type="button"
            className="staff-btn reactivate"
            onClick={() => handleUserAction(u, 'reactivate')}
            disabled={isApproving}
          >
            {isApproving ? <RefreshCw size={14} className="animate-spin" /> : <RotateCcw size={14} />}
            {wantsReactivate ? 'Approve Reactivation' : 'Reactivate'}
          </button>
        )}
      </div>
    );
  };

  if (!showSuperAdminModal) return null;

  return (
    <div className="superadmin-modal-overlay" onClick={() => setShowSuperAdminModal(false)}>
      <div className="superadmin-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="superadmin-header">
          <div className="superadmin-header-text">
            <div className="superadmin-shield-icon">
              <ShieldCheck size={28} color="#f59e0b" />
            </div>
            <div>
              <div className="superadmin-title-row">
                <h2>Super Admin Control Center</h2>
                <span className="superadmin-badge">SUPER ADMIN</span>
              </div>
              <p>Listening dashboard · approve, deactivate, and reactivate customers</p>
            </div>
          </div>
          <button type="button" className="superadmin-close-btn" onClick={() => setShowSuperAdminModal(false)} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="superadmin-tabs-nav">
          <button
            type="button"
            className={`superadmin-tab-btn ${mainTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setMainTab('dashboard')}
          >
            <BarChart3 size={16} />
            <span>Listening Dashboard</span>
          </button>
          <button
            type="button"
            className={`superadmin-tab-btn ${mainTab === 'approvals' ? 'active' : ''}`}
            onClick={() => setMainTab('approvals')}
          >
            <Mail size={16} />
            <span>Customer Approvals &amp; Account Control</span>
            {pendingUsersCount > 0 && (
              <span className="superadmin-pending-pill">{pendingUsersCount} PENDING</span>
            )}
          </button>
        </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {mainTab === 'dashboard' ? (
            <div className="sa-user-list" style={{ padding: '12px 20px 20px' }}>
              <ListeningDashboard accent="#f59e0b" />
            </div>
          ) : (
            <>
            <div className="superadmin-stats-grid">
              <div className="superadmin-stat-card">
                <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
                  <Clock size={22} color="#f59e0b" />
                </div>
                <div>
                  <div className="stat-value">{pendingUsersCount}</div>
                    <div className="stat-label">Pending / Reactivation</div>
                  </div>
                </div>
              <div className="superadmin-stat-card">
                <div className="stat-icon-wrapper" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
                  <UserCheck size={22} color="#22c55e" />
                </div>
                <div>
                    <div className="stat-value">{activeCount}</div>
                    <div className="stat-label">Approved &amp; Active</div>
                  </div>
                </div>
              <div className="superadmin-stat-card">
                <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
                  <Users size={22} color="#3b82f6" />
                </div>
                <div>
                  <div className="stat-value">{adminUsers.length}</div>
                    <div className="stat-label">Total Registered</div>
                  </div>
                </div>
              <div className="superadmin-stat-card">
                  <div className="stat-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
                    <UserX size={22} color="#ef4444" />
                </div>
                <div>
                    <div className="stat-value">{rejectedUsers.length}</div>
                    <div className="stat-label">Suspended / Rejected</div>
                  </div>
                </div>
              </div>

              <div className="staff-tabs" style={{ padding: '0 20px', marginTop: 8 }}>
                <button type="button" className={approvalSubTab === 'superQ' ? 'active' : ''} onClick={() => setApprovalSubTab('superQ')}>
                  Awaiting Super Admin
                  {superQueue.length > 0 && <span className="staff-tab-badge">{superQueue.length}</span>}
                </button>
                <button type="button" className={approvalSubTab === 'adminQ' ? 'active' : ''} onClick={() => setApprovalSubTab('adminQ')}>
                  Pending Admin
                  {adminQueue.length > 0 && <span className="staff-tab-badge muted">{adminQueue.length}</span>}
                </button>
                <button type="button" className={approvalSubTab === 'reactivateQ' ? 'active' : ''} onClick={() => setApprovalSubTab('reactivateQ')}>
                  Reactivation Requests
                  {reactivationQueue.length > 0 && <span className="staff-tab-badge">{reactivationQueue.length}</span>}
                </button>
                <button type="button" className={approvalSubTab === 'rejected' ? 'active' : ''} onClick={() => setApprovalSubTab('rejected')}>
                  Suspended / Rejected
                </button>
                <button type="button" className={approvalSubTab === 'all' ? 'active' : ''} onClick={() => setApprovalSubTab('all')}>
                  All Users
                </button>
            </div>

            <div className="superadmin-filter-bar">
              <div className="superadmin-search-wrapper">
                <Search size={16} color="#71717a" />
                <input
                  type="text"
                  placeholder="Search customer by name, email, or role..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              <button
                  type="button"
                className="superadmin-action-btn secondary"
                onClick={loadUsers}
                disabled={usersLoading}
                style={{ padding: '8px 14px', fontSize: '0.78rem' }}
              >
                <RefreshCw size={14} className={usersLoading ? 'animate-spin' : ''} />
                <span>Refresh Users</span>
              </button>
            </div>

              <div className="sa-user-list">
              {filteredUsers.length === 0 ? (
                <div className="superadmin-empty-state">
                  <Users size={42} color="#52525b" />
                  <h3>No Users Found</h3>
                  <p>No customers match the current filter criteria.</p>
                </div>
              ) : (
                  filteredUsers.map((u, idx) => {
                      const role = String(u.role || 'client').toLowerCase();
                      const isAdmin = role === 'admin' || role === 'super_admin';
                      const isFullyApproved = isAdmin || (Number(u.admin_approved) === 1 && Number(u.superadmin_approved) === 1 && u.status === 'active');
                    const isRejected = Number(u.admin_approved) === -1 || Number(u.superadmin_approved) === -1 || u.status === 'suspended';
                    const initial = (u.name || u.email || '?').charAt(0).toUpperCase();

                      return (
                      <article key={u.id || idx} className={`sa-user-card ${!isFullyApproved ? 'is-pending' : ''}`}>
                        <div className="sa-user-top">
                          <div className="sa-user-avatar">{initial}</div>
                          <div className="sa-user-info">
                            <div className="sa-user-name">{u.name || 'User'}</div>
                            <div className="sa-user-email">{u.email}</div>
                            <div className="sa-user-meta">
                              <span className="lang-tag">#{u.id} · {(u.role || 'client').toUpperCase()}</span>
                              {u.phone ? <span>📞 {u.phone}</span> : null}
                            </div>
                          </div>
                          <div className="sa-user-status">
                            {isFullyApproved ? (
                              <span className="status-badge-active">ACTIVE</span>
                            ) : isRejected ? (
                              <span className="status-badge-pending sa-suspended">SUSPENDED</span>
                            ) : (
                              <span className="status-badge-pending">PENDING</span>
                            )}
                          </div>
                              </div>

                        <div className="sa-approval-flags">
                          <div>
                            <span className="sa-flag-label">Admin</span>
                            {Number(u.admin_approved) === 1 || isAdmin ? (
                              <span className="sa-flag ok">Approved</span>
                            ) : Number(u.admin_approved) === -1 ? (
                              <span className="sa-flag bad">Rejected</span>
                            ) : (
                              <span className="sa-flag wait">Pending</span>
                            )}
                          </div>
                          <div>
                            <span className="sa-flag-label">Super Admin</span>
                            {Number(u.superadmin_approved) === 1 || isAdmin ? (
                              <span className="sa-flag ok">Approved</span>
                            ) : Number(u.superadmin_approved) === -1 ? (
                              <span className="sa-flag bad">Rejected</span>
                            ) : (
                              <span className="sa-flag wait">Pending</span>
              )}
            </div>
          </div>

                        {renderUserActions(u)}
                      </article>
                    );
                  })
                )}
              </div>
            </>
              )}
            </div>

        <div className="superadmin-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#a1a1aa' }}>
            <CheckCircle2 size={16} color="#22c55e" />
            <span>Logged in as <strong>{currentUser?.name || currentUser?.username}</strong> ({currentUser?.role})</span>
          </div>
          <button type="button" className="superadmin-done-btn" onClick={() => setShowSuperAdminModal(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
