// ============================================
// Smart School — GradientButton
// ============================================
// زر بتدرج لوني
// Props:
//   - variant : "primary" | "success" | "danger" | "warning" | "navy" | "ghost"
//   - size    : "sm" | "md" | "lg"
//   - fullWidth: boolean
//   - icon    : ReactNode (اختياري)
//   - loading : boolean
// ============================================

import React from 'react';
import '../../styles/glass.css';
import '../../styles/theme.css';

const GradientButton = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon = null,
  loading = false,
  disabled = false,
  className = '',
  style = {},
  ...rest
}) => {
  const sizeMap = {
    sm: { padding: '8px 16px', fontSize: '14px' },
    md: { padding: '12px 24px', fontSize: '16px' },
    lg: { padding: '16px 32px', fontSize: '18px' },
  };

  const gradientMap = {
    primary: 'var(--ss-grad-primary)',
    success: 'var(--ss-grad-success)',
    danger: 'var(--ss-grad-danger)',
    warning: 'var(--ss-grad-warning)',
    navy: 'var(--ss-grad-navy)',
    fluid: 'var(--ss-grad-fluid)',
    waves: 'var(--ss-grad-waves)',
    ghost: 'transparent',
  };

  const isGhost = variant === 'ghost';

  const baseStyle = {
    ...sizeMap[size],
    width: fullWidth ? '100%' : 'auto',
    background: isGhost ? 'transparent' : gradientMap[variant] || gradientMap.primary,
    color: isGhost ? 'var(--ss-text-primary)' : '#fff',
    border: isGhost ? '1px solid var(--ss-border-glass)' : 'none',
    boxShadow: isGhost ? 'none' : '0 4px 16px rgba(0,0,0,0.2)',
    opacity: disabled || loading ? 0.6 : 1,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    ...style,
  };

  return (
    <button
      className={`ss-btn ${className}`}
      style={baseStyle}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span
          className="ss-spinner"
          style={{
            width: 16,
            height: 16,
            border: '2px solid rgba(255,255,255,0.3)',
            borderTopColor: '#fff',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'ss-spin-slow 0.8s linear infinite',
          }}
        />
      ) : (
        icon
      )}
      {children}
    </button>
  );
};

export default GradientButton;