// frontend/src/hooks/useElementSize.js

import { useState, useEffect, useRef } from 'react';

/**
 * ✅ Hook بديل لـ ResizeObserver
 * بيشتغل على WebView القديم (Android 8/9/10) والحديث
 *
 * - Polling كل 500ms (خفيف جداً)
 * - window resize listener
 * - بيرجع [ref, { width, height }]
 */
export default function useElementSize(options = {}) {
  const {
    pollInterval = 500,
    initialWidth = 0,
    initialHeight = 0,
  } = options;

  const ref = useRef(null);
  const [size, setSize] = useState({
    width: initialWidth,
    height: initialHeight,
  });

  useEffect(() => {
    let lastW = 0;
    let lastH = 0;

    const update = () => {
      const el = ref.current;
      if (!el) return;   // ← بس هنا (مش في بداية الـ effect)

      const w = el.offsetWidth || el.clientWidth || 0;
      const h = el.offsetHeight || el.clientHeight || 0;

      if (w !== lastW || h !== lastH) {
        lastW = w;
        lastH = h;
        setSize({ width: w, height: h });
      }
    };

    // ✅ قياس فوري (بعد أول paint)
    update();

    // ✅ polling — يشتغل على كل WebView (يتعامل مع ref اللي لسه ما اتربطش)
    const interval = setInterval(update, pollInterval);

    // ✅ نستمع لـ resize
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [pollInterval]);

  return [ref, size];
}