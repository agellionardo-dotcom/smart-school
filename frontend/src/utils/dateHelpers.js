// ✅ تحويل التاريخ والوقت لتوقيت القاهرة
export const toCairo = (date) => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleString('ar-EG', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '-';
  }
};

// ✅ الوقت فقط بتوقيت القاهرة
export const toCairoTime = (date) => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleTimeString('ar-EG', {
      timeZone: 'Africa/Cairo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '-';
  }
};

// ✅ التاريخ فقط بتوقيت القاهرة
export const toCairoDate = (date) => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('ar-EG', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return '-';
  }
};