import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Zap, CheckCircle, Info } from 'lucide-react';

export default function DobbyPayToast() {
  const { toastMessage } = usePlayer();

  if (!toastMessage || !toastMessage.text) return null;

  return (
    <div className="dobby-toast-container">
      <div className="dobby-toast-card">
        <div className="dobby-toast-badge">
          <Zap size={16} fill="#FF6B00" color="#FF6B00" />
        </div>
        <span className="dobby-toast-text">{toastMessage.text}</span>
      </div>
    </div>
  );
}
