// frontend/src/services/offlineStorage.js
import { Preferences } from '@capacitor/preferences';

// ==================== حفظ/قراءة/حذف ====================
export const saveData = async (key, value) => {
  try {
    await Preferences.set({
      key: key,
      value: JSON.stringify(value),
    });
    return true;
  } catch (error) {
    console.error('Error saving data:', error);
    return false;
  }
};

export const getData = async (key) => {
  try {
    const { value } = await Preferences.get({ key });
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Error reading data:', error);
    return null;
  }
};

export const removeData = async (key) => {
  try {
    await Preferences.remove({ key });
    return true;
  } catch (error) {
    console.error('Error removing data:', error);
    return false;
  }
};

// ==================== Queue (الطلبات المعلقة) ====================
export const addToQueue = async (item) => {
  try {
    const queue = (await getData('sync_queue')) || [];
    const newItem = {
      ...item,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      status: 'pending', // pending | syncing | failed
      attempts: 0,
      error: null,
    };
    queue.push(newItem);
    await saveData('sync_queue', queue);
    return newItem;
  } catch (error) {
    console.error('Error adding to queue:', error);
    return null;
  }
};

export const getQueue = async () => {
  return (await getData('sync_queue')) || [];
};

export const removeFromQueue = async (id) => {
  try {
    const queue = (await getData('sync_queue')) || [];
    const newQueue = queue.filter((item) => item.id !== id);
    await saveData('sync_queue', newQueue);
    return true;
  } catch (error) {
    console.error('Error removing from queue:', error);
    return false;
  }
};

export const clearQueue = async () => {
  try {
    await saveData('sync_queue', []);
    return true;
  } catch (error) {
    console.error('Error clearing queue:', error);
    return false;
  }
};

export const getQueueCount = async () => {
  const queue = await getQueue();
  return queue.length;
};

export const updateQueueItem = async (id, updates) => {
  try {
    const queue = (await getData('sync_queue')) || [];
    const index = queue.findIndex((item) => item.id === id);
    if (index !== -1) {
      queue[index] = { ...queue[index], ...updates };
      await saveData('sync_queue', queue);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating queue item:', error);
    return false;
  }
};

// ==================== ✅ جديد — دوال مساعدة ====================

// ✅ تحديث حالة طلب — syncing
export const markAsSyncing = async (id) => {
  return updateQueueItem(id, {
    status: 'syncing',
    lastAttempt: new Date().toISOString(),
  });
};

// ✅ تحديث حالة طلب — failed
export const markAsFailed = async (id, error) => {
  const queue = await getQueue();
  const item = queue.find((i) => i.id === id);
  return updateQueueItem(id, {
    status: 'failed',
    attempts: (item?.attempts || 0) + 1,
    error,
    lastAttempt: new Date().toISOString(),
  });
};

// ✅ حذف الطلبات اللي فشلت أكثر من 5 مرات
export const cleanupFailedItems = async (maxAttempts = 5) => {
  try {
    const queue = await getQueue();
    const filtered = queue.filter(
      (item) => !(item.status === 'failed' && item.attempts >= maxAttempts)
    );
    await saveData('sync_queue', filtered);
    return queue.length - filtered.length;
  } catch (error) {
    console.error('Error cleaning queue:', error);
    return 0;
  }
};

// ✅ الحصول على الطلبات الفاشلة
export const getFailedItems = async () => {
  const queue = await getQueue();
  return queue.filter((item) => item.status === 'failed');
};

// ✅ إعادة تعيين طلب فاشل إلى pending
export const retryFailedItem = async (id) => {
  return updateQueueItem(id, {
    status: 'pending',
    error: null,
  });
};

// ✅ معلومات Queue شاملة
export const getQueueStats = async () => {
  const queue = await getQueue();
  return {
    total: queue.length,
    pending: queue.filter((i) => i.status === 'pending').length,
    syncing: queue.filter((i) => i.status === 'syncing').length,
    failed: queue.filter((i) => i.status === 'failed').length,
  };
};

// ==================== كاش البيانات ====================
export const cacheData = async (key, data) => {
  return await saveData(`cache_${key}`, {
    data,
    timestamp: new Date().toISOString(),
  });
};

export const getCachedData = async (key, maxAgeMinutes = 60) => {
  const cached = await getData(`cache_${key}`);
  if (!cached) return null;

  const age = (Date.now() - new Date(cached.timestamp).getTime()) / (1000 * 60);
  if (age > maxAgeMinutes) return null;

  return cached.data;
};

// ==================== آخر مزامنة ====================
export const setLastSync = async () => {
  await saveData('last_sync', new Date().toISOString());
};

export const getLastSync = async () => {
  return await getData('last_sync');
};
// 📁 frontend/src/services/offlineStorage.js
// ⬅️ ضيف الدوال دي في آخر الملف

// ============================================
// ✅ Pending Attendance Queue
// ============================================

/**
 * إضافة سجل حضور للطابور (لما يكون أوفلاين)
 */
export async function addPendingAttendance(attendanceData) {
  try {
    const pending = await getData('pending_attendance') || [];
    pending.push({
      ...attendanceData,
      _localId: Date.now() + Math.random(), // ← معرف محلي فريد
      _savedAt: new Date().toISOString(),
    });
    await saveData('pending_attendance', pending);
    return { success: true };
  } catch (err) {
    console.error('addPendingAttendance error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * جلب كل سجلات الحضور المعلقة
 */
export async function getPendingAttendance() {
  try {
    return await getData('pending_attendance') || [];
  } catch (err) {
    console.error('getPendingAttendance error:', err);
    return [];
  }
}

/**
 * مسح سجل حضور بعد ما اترفع بنجاح
 */
export async function removePendingAttendance(localId) {
  try {
    const pending = await getData('pending_attendance') || [];
    const filtered = pending.filter(p => p._localId !== localId);
    await saveData('pending_attendance', filtered);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * عدد سجلات الحضور المعلقة
 */
export async function getPendingAttendanceCount() {
  try {
    const pending = await getData('pending_attendance') || [];
    return pending.length;
  } catch (err) {
    return 0;
  }
}

// ============================================
// ✅ Attendance History Cache (آخر 10 أيام)
// ============================================

/**
 * حفظ آخر 10 أيام من سجل الحضور في الكاش
 */
export async function cacheAttendanceHistory(history) {
  try {
    // ← خد آخر 10 أيام بس
    const limited = (history || []).slice(0, 10);
    await saveData('attendance_history', {
      data: limited,
      cachedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (err) {
    console.error('cacheAttendanceHistory error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * جلب سجل الحضور من الكاش
 */
export async function getCachedAttendanceHistory() {
  try {
    const cached = await getData('attendance_history');
    return cached?.data || [];
  } catch (err) {
    console.error('getCachedAttendanceHistory error:', err);
    return [];
  }
}