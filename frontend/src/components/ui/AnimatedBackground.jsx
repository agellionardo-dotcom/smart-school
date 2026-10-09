// ============================================
// Smart School — AnimatedBackground
// ============================================
// خلفية متحركة بـ 4 variants:
//   - "fluid"  : أشكال سائلة متدفقة (افتراضي)
//   - "glass"  : زجاجي + كرات ملونة
//   - "pastel" : باستيل + صلصال
//   - "waves"  : موجات هندسية متداخلة
// ============================================

import React, { useMemo } from 'react';
import '../../styles/animations.css';

const AnimatedBackground = ({ variant = 'fluid', className = '' }) => {
  const content = useMemo(() => {
    switch (variant) {
      case 'glass':
        return (
          <div className={`ss-bg-glass ${className}`} aria-hidden="true">
            <span className="ss-glass-orb ss-orb-1" />
            <span className="ss-glass-orb ss-orb-2" />
            <span className="ss-glass-orb ss-orb-3" />
          </div>
        );

      case 'pastel':
        return (
          <div className={`ss-bg-pastel ${className}`} aria-hidden="true">
            <span className="ss-clay-shape ss-clay-1" />
            <span className="ss-clay-shape ss-clay-2" />
            <span className="ss-clay-shape ss-clay-3" />
          </div>
        );

      case 'waves':
        return (
          <div className={`ss-bg-waves ${className}`} aria-hidden="true">
            <span className="ss-wave ss-wave-1" />
            <span className="ss-wave ss-wave-2" />
            <span className="ss-wave ss-wave-3" />
            <span className="ss-wave ss-wave-4" />
          </div>
        );

      case 'fluid':
      default:
        return (
          <div className={`ss-bg-fluid ${className}`} aria-hidden="true">
            <span className="ss-blob-3" />
          </div>
        );
    }
  }, [variant, className]);

  return content;
};

export default AnimatedBackground;