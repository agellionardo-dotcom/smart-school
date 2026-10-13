// frontend/src/services/syncService.js
// ============================================
// خدمة المزامنة الموحّدة
// ============================================
// - تعمل sync للطلبات المعلقة
// - بتبعت كل التفاصيل (biometric, face, deviceId)
// - بترجع تفاصيل كل عملية (نجح/فشل/سبب)
// ============================================

import api from '../api';
import {
  getQueue,
  removeFromQueue,
  updateQueueItem,
  setLastSync,
} from './offlineStorage';
import { isOnline } from './networkStatus';

// ============================================
// ✅ إرسال طلب واحد للـ Backend
// ============================================
async function sendRequest(item) {
  const endpoint = item.type === 'checkin' ? 'checkin' : 'checkout';

  // ✅ نبعت كل التفاصيل الممكنة
  const payload = {
    lat: item.lat,
    lng: item.lng,
    biometricUsed: item.biometricUsed || false,
    biometricType: item.biometricType || null,
    faceVerified: item.faceVerified || false,
    faceDistance: item.faceDistance || null,
    deviceId: item.user || item.deviceId || null,
  };

  const { data } = await api.post(`/attendance/${endpoint}`, payload);
  return data;
}

// ============================================
// ✅ مزامنة كل الطلبات المعلقة
// ============================================
export async function syncQueue(options = {}) {
  const { silent = false, onProgress = null } = options;

  const results = {
    total: 0,
    success: 0,
    failed: 0,
    errors: [],
    syncedItems: [],
  };

  try {
    // ✅ فحص الاتصال
    const online = await isOnline();
    if (!online) {
      if (!silent) console.log('[Sync] 📴 لا يوجد اتصال');
      return { ...results, offline: true };
    }

    const queue = await getQueue();
    results.total = queue.length;

    if (queue.length === 0) {
      if (!silent) console.log('[Sync] ✅ لا توجد طلبات معلقة');
      return results;
    }

    if (!silent) {
      console.log(`[Sync] 🚀 بدء مزامنة ${queue.length} طلب...`);
    }

    // ✅ معالجة كل طلب
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];

      // تحديث الحالة
      await updateQueueItem(item.id, { status: 'syncing' });

      if (onProgress) {
        onProgress({
          current: i + 1,
          total: queue.length,
          item,
        });
      }

      try {
        const result = await sendRequest(item);

        // ✅ نجح
        await removeFromQueue(item.id);
        results.success++;
        results.syncedItems.push({
          id: item.id,
          type: item.type,
          timestamp: item.timestamp,
          result,
        });

        if (!silent) {
          console.log(`[Sync] ✅ ${item.type} — نجح`);
        }
      } catch (err) {
        // ❌ فشل
        const errMsg =
          err.response?.data?.msg ||
          err.response?.data?.message ||
          err.message ||
          'فشل';

        results.failed++;
        results.errors.push({
          id: item.id,
          type: item.type,
          error: errMsg,
          status: err.response?.status,
        });

        // تحديث حالة الطلب
        await updateQueueItem(item.id, {
          status: 'failed',
          attempts: (item.attempts || 0) + 1,
          error: errMsg,
          lastAttempt: new Date().toISOString(),
        });

        if (!silent) {
          console.warn(`[Sync] ❌ ${item.type} — ${errMsg}`);
        }
      }
    }

    // ✅ تحديث آخر مزامنة
    await setLastSync();

    if (!silent) {
      console.log(
        `[Sync] 🎯 انتهت المزامنة: ${results.success} نجح، ${results.failed} فشل`
      );
    }

    return results;
  } catch (err) {
    console.error('[Sync] خطأ عام:', err);
    results.errors.push({
      id: 'general',
      error: err.message,
    });
    return results;
  }
}

// ============================================
// ✅ مزامنة سريعة (صامتة)
// ============================================
export async function syncQueueSilent() {
  return syncQueue({ silent: true });
}

// ============================================
// ✅ فحص وجود طلبات معلقة
// ============================================
export async function hasPendingItems() {
  const queue = await getQueue();
  return queue.length > 0;
}

// ============================================
// ✅ مزامنة عند فتح التطبيق
// ============================================
export async function syncOnAppOpen() {
  try {
    const online = await isOnline();
    if (!online) return { skipped: true, reason: 'offline' };

    const queue = await getQueue();
    if (queue.length === 0) return { skipped: true, reason: 'empty' };

    console.log(`[Sync] 🔄 مزامنة عند فتح التطبيق — ${queue.length} طلب`);
    return await syncQueue({ silent: false });
  } catch (err) {
    console.warn('[Sync] فشل مزامنة عند الفتح:', err);
    return { error: err.message };
  }
}