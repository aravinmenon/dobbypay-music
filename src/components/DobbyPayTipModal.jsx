import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Zap, X, Heart, Sparkles, CheckCircle, Wallet } from 'lucide-react';
import DobbyPayLogo from './DobbyPayLogo';

export default function DobbyPayTipModal() {
  const {
    showTipModal,
    setShowTipModal,
    targetTipTrack,
    dobbyWallet,
    sendTip,
    setShowWalletModal
  } = usePlayer();

  const [amount, setAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!showTipModal || !targetTipTrack) return null;

  const activeAmount = customAmount ? parseFloat(customAmount) || 0 : amount;
  const hasBalance = dobbyWallet.balance >= activeAmount && activeAmount > 0;

  const handleSendTip = () => {
    if (!hasBalance) return;
    sendTip(targetTipTrack, activeAmount, note);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setShowTipModal(false);
      setCustomAmount('');
      setNote('');
    }, 1800);
  };

  return (
    <div className="modal-backdrop" onClick={() => setShowTipModal(false)}>
      <div className="dobby-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="modal-close-btn" onClick={() => setShowTipModal(false)}>
          <X size={20} />
        </button>

        {!isSuccess ? (
          <>
            {/* Header */}
            <div className="dobby-modal-header">
              <DobbyPayLogo size="small" />
              <span className="dobby-modal-subtitle">Instant Artist Tip & Micro-payment</span>
            </div>

            {/* Track Info Card */}
            <div className="dobby-track-preview">
              <img src={targetTipTrack.coverUrl} alt={targetTipTrack.title} className="dobby-track-thumb" />
              <div>
                <div className="dobby-track-title">{targetTipTrack.title}</div>
                <div className="dobby-track-artist">By {targetTipTrack.artist}</div>
                <div className="dobby-badge-mini">
                  <Zap size={12} fill="#FF6B00" color="#FF6B00" />
                  <span>DobbyPay Verified Artist</span>
                </div>
              </div>
            </div>

            {/* Tip Amount Selector */}
            <div style={{ marginTop: '16px' }}>
              <label className="dobby-label">Select Tip Amount (USD)</label>
              <div className="dobby-tip-grid">
                {[1, 3, 5, 10].map(val => (
                  <button
                    key={val}
                    className={`dobby-tip-chip ${!customAmount && amount === val ? 'active' : ''}`}
                    onClick={() => {
                      setAmount(val);
                      setCustomAmount('');
                    }}
                  >
                    <span>${val}</span>
                    <small>+{(val * 10)} ⚡ pts</small>
                  </button>
                ))}
              </div>

              <div style={{ marginTop: '10px' }}>
                <input
                  type="number"
                  placeholder="Or enter custom amount ($)"
                  className="dobby-input"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  min="0.5"
                  step="0.5"
                />
              </div>
            </div>

            {/* Custom Note */}
            <div style={{ marginTop: '14px' }}>
              <label className="dobby-label">Add a message for {targetTipTrack.artist} (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Love this beat! Keep creating ❤️"
                className="dobby-input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={60}
              />
            </div>

            {/* Balance Bar */}
            <div className="dobby-balance-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                <Wallet size={16} color="#FF6B00" />
                <span style={{ color: '#a1a1aa' }}>DobbyPay Balance:</span>
                <strong style={{ color: '#fff' }}>${dobbyWallet.balance.toFixed(2)}</strong>
              </div>
              {dobbyWallet.balance < activeAmount && (
                <button
                  className="dobby-topup-btn"
                  onClick={() => {
                    setShowTipModal(false);
                    setShowWalletModal(true);
                  }}
                >
                  + Add Funds
                </button>
              )}
            </div>

            {/* Submit Action */}
            <button
              className="dobby-action-btn"
              disabled={!hasBalance}
              onClick={handleSendTip}
            >
              <Zap size={20} fill="#FFF" color="#FFF" />
              <span>Send ${activeAmount.toFixed(2)} Tip with DobbyPay</span>
            </button>
          </>
        ) : (
          <div className="dobby-success-box">
            <div className="dobby-success-icon">
              <CheckCircle size={48} color="#FF6B00" />
            </div>
            <h2>Tip Sent Successfully!</h2>
            <p style={{ color: '#a1a1aa', marginTop: '6px' }}>
              You sent <strong>${activeAmount.toFixed(2)}</strong> to <strong>{targetTipTrack.artist}</strong>.
            </p>
            <div className="dobby-reward-pill">
              <Sparkles size={16} color="#FF6B00" />
              <span>Earned +{(activeAmount * 10)} DobbyPoints Cashback!</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
