import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Zap, X, Wallet, ArrowUpRight, ShieldCheck, History, PlusCircle, Sparkles, Music } from 'lucide-react';
import DobbyPayLogo from './DobbyPayLogo';

export default function DobbyPayWalletModal() {
  const {
    showWalletModal,
    setShowWalletModal,
    dobbyWallet,
    dobbyTransactions,
    topUpWallet,
    isLosslessMode,
    toggleLosslessMode
  } = usePlayer();

  const [activeTab, setActiveTab] = useState('wallet'); // 'wallet', 'history', 'vip'
  const [customTopUp, setCustomTopUp] = useState('');

  if (!showWalletModal) return null;

  const handleTopUp = (amount) => {
    topUpWallet(amount);
    setCustomTopUp('');
  };

  return (
    <div className="modal-backdrop" onClick={() => setShowWalletModal(false)}>
      <div className="dobby-modal-card dobby-wallet-card-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="modal-close-btn" onClick={() => setShowWalletModal(false)}>
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <DobbyPayLogo size="medium" />
          <div className="dobby-nav-tabs">
            <button
              className={`dobby-tab-btn ${activeTab === 'wallet' ? 'active' : ''}`}
              onClick={() => setActiveTab('wallet')}
            >
              <Wallet size={16} />
              <span>Wallet</span>
            </button>
            <button
              className={`dobby-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <History size={16} />
              <span>History</span>
            </button>
            <button
              className={`dobby-tab-btn ${activeTab === 'vip' ? 'active' : ''}`}
              onClick={() => setActiveTab('vip')}
            >
              <Sparkles size={16} />
              <span>VIP & Hi-Fi</span>
            </button>
          </div>
        </div>

        {activeTab === 'wallet' && (
          <>
            {/* Digital DobbyPay Card */}
            <div className="dobby-digital-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={22} fill="#FFF" color="#FFF" />
                  <span style={{ fontWeight: 800, letterSpacing: '0.05em' }}>DOBBYPAY DIGITAL WALLET</span>
                </div>
                <span className="dobby-card-status">ACTIVE</span>
              </div>

              <div style={{ margin: '20px 0 10px 0' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.85, textTransform: 'uppercase' }}>Available Balance</div>
                <div style={{ fontSize: '2.4rem', fontWeight: 900 }}>${dobbyWallet.balance.toFixed(2)}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>REWARDS BALANCE</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={14} color="#FFF" />
                    <span>{dobbyWallet.points.toLocaleString()} DobbyPoints</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.9 }}>
                  •••• 8829
                </div>
              </div>
            </div>

            {/* Quick Top-Up */}
            <div style={{ marginTop: '20px' }}>
              <label className="dobby-label">Quick Top-Up Balance</label>
              <div className="dobby-topup-grid">
                {[10, 25, 50, 100].map(val => (
                  <button key={val} className="dobby-topup-chip" onClick={() => handleTopUp(val)}>
                    <PlusCircle size={16} color="#FF6B00" />
                    <span>+${val}</span>
                  </button>
                ))}
              </div>

              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  placeholder="Custom amount ($)"
                  className="dobby-input"
                  value={customTopUp}
                  onChange={(e) => setCustomTopUp(e.target.value)}
                  min="5"
                />
                <button
                  className="dobby-action-btn-sm"
                  onClick={() => {
                    if (customTopUp && parseFloat(customTopUp) > 0) {
                      handleTopUp(parseFloat(customTopUp));
                    }
                  }}
                >
                  Add Funds
                </button>
              </div>
            </div>

            {/* DobbyPay Protection Note */}
            <div className="dobby-security-note">
              <ShieldCheck size={18} color="#FF6B00" />
              <span>100% Instant Micropayments powered by DobbyPay Vault with Zero Fee Tipping.</span>
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <div className="dobby-history-container">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>Transaction Log</h3>
            {dobbyTransactions.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#71717a', padding: '30px 0' }}>
                No transactions yet. Tip an artist to see history here!
              </div>
            ) : (
              <div className="dobby-tx-list">
                {dobbyTransactions.map(tx => (
                  <div key={tx.id} className="dobby-tx-item">
                    <div className="dobby-tx-icon">
                      {tx.type === 'topup' ? <PlusCircle size={18} color="#22c55e" /> : <Zap size={18} color="#FF6B00" fill="#FF6B00" />}
                    </div>
                    <div className="dobby-tx-details">
                      <div className="dobby-tx-title">
                        {tx.type === 'topup' ? 'Wallet Top-Up' : `Tipped ${tx.artist}`}
                      </div>
                      <div className="dobby-tx-subtitle">
                        {tx.trackTitle ? `Track: "${tx.trackTitle}" • ` : ''}{tx.date}
                      </div>
                    </div>
                    <div className={`dobby-tx-amount ${tx.type === 'topup' ? 'positive' : 'negative'}`}>
                      {tx.type === 'topup' ? `+$${tx.amount.toFixed(2)}` : `-$${tx.amount.toFixed(2)}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'vip' && (
          <div className="dobby-vip-container">
            <div className="dobby-vip-banner">
              <Sparkles size={28} color="#FF6B00" />
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>DobbyPay Hi-Fi Pass</h3>
                <p style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Unlock 24-bit 192kHz Uncompressed Audio & Exclusive Artist Rewards.</p>
              </div>
            </div>

            <div className="dobby-toggle-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Music size={22} color="#FF6B00" />
                <div>
                  <div style={{ fontWeight: 700 }}>24-Bit Lossless Hi-Fi Mode</div>
                  <div style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Studio master quality streaming enabled</div>
                </div>
              </div>
              <button
                className={`dobby-switch ${isLosslessMode ? 'active' : ''}`}
                onClick={toggleLosslessMode}
              >
                <div className="dobby-switch-handle"></div>
              </button>
            </div>

            <div className="dobby-rewards-box">
              <div style={{ fontWeight: 700, marginBottom: '6px' }}>⚡ Active VIP Benefits</div>
              <ul style={{ paddingLeft: '20px', fontSize: '0.85rem', color: '#d4d4d8', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Zero-fee instant artist tipping & micropayments</li>
                <li>Exclusive orange lightning visualizer theme</li>
                <li>Earn 10x DobbyPoints on every artist support</li>
                <li>Unlimited offline high-res FLAC downloads</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
