// frontend/src/components/ChartContainer.jsx

import React from 'react';
import useElementSize from '../hooks/useElementSize';

/**
 * ✅ بديل آمن لـ ResponsiveContainer
 * بيشتغل على كل WebView (قديم + حديث)
 *
 * الاستخدام:
 * <ChartContainer height={300}>
 *   {({ width, height }) => (
 *     <BarChart width={width} height={height} data={...}>...</BarChart>
 *   )}
 * </ChartContainer>
 */
export default function ChartContainer({
  height = 300,
  minWidth = 280,          // ← زودناها لضمان عرض معقول
  children,
  style = {},
}) {
  const [ref, size] = useElementSize({
    pollInterval: 400,      // ← قللناها لتحسين الاستجابة
    initialWidth: 0,
    initialHeight: height,
  });

  // ✅ لو الـ width لسه 0، نستخدم minWidth مؤقتاً
  // عشان الشارت يظهر فوراً بدل ما نستنى الـ polling
  const finalWidth = size.width > 0 ? size.width : minWidth;
  const finalHeight = height;

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        minHeight: height,
        ...style,
      }}
    >
      {/* ✅ دايمًا نعرض — مفيش شرط على width */}
      {children({ width: finalWidth, height: finalHeight })}
    </div>
  );
}