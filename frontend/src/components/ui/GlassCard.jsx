// ============================================
// Smart School — GlassCard
// ============================================
// كارت زجاجي reusable
// Props:
//   - variant  : "glass" | "clay" | "gradient" | "neon"
//   - padding  : "sm" | "md" | "lg"
//   - hover    : boolean (يظهر تأثير hover)
//   - className: string
// ============================================

import React from 'react';
import '../../styles/glass.css';

const GlassCard = ({
  children,
  variant = 'glass',
  padding = 'md',
  hover = true,
  className = '',
  style = {},
  onClick,
  ...rest
}) => {
  const paddingMap = {
    sm: '12px',
    md: '20px',
    lg: '28px',
  };

  const variantClass = {
    glass: 'ss-glass',
    clay: 'ss-clay',
    gradient: 'ss-gradient-card',
    neon: 'ss-neon-border ss-glass',
  }[variant] || 'ss-glass';

  const hoverClass = hover ? 'ss-hover-lift' : '';

  return (
    <div
      className={`${variantClass} ${hoverClass} ${className}`}
      style={{ padding: paddingMap[padding], ...style }}
      onClick={onClick}
      {...rest}
    >
      {children}
    </div>
  );
};

export default GlassCard;