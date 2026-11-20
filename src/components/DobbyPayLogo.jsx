import React from 'react';
import logoImg from '../assets/dobbypay-logo.png';

export default function DobbyPayLogo({ size = 'medium', className = '', onClick }) {
  const isSmall = size === 'small';
  const isLarge = size === 'large';

  const height = isSmall ? '28px' : isLarge ? '52px' : '38px';

  return (
    <div 
      className={`dobby-pay-logo ${className}`} 
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none'
      }}
    >
      <img 
        src={logoImg} 
        alt="DobbyPay Music" 
        style={{ 
          height: height, 
          width: 'auto',
          objectFit: 'contain',
          filter: 'drop-shadow(0 2px 8px rgba(255, 107, 0, 0.3))'
        }} 
      />
    </div>
  );
}
