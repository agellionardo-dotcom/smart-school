const router = require('express').Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// ============================================
// ✅ Firebase Admin (v12+ API)
// ============================================
let messaging = null;

try {
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (serviceAccountRaw) {
    const { initializeApp, cert, getApps } = require('firebase-admin/app');
    const { getMessaging } = require('firebase-admin/messaging');

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountRaw);
    } catch (parseErr) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT مش JSON صالح — تأكد من الصيغة');
    }

    if (getApps().length === 0) {
      initializeApp({
        credential: cert(serviceAccount)
      });
    }

    messaging = getMessaging();
    console.log('✅ Firebase Admin initialized');
  } else {
    console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT missing — Push notifications disabled');
  }
} catch (err) {
  console.warn('⚠️ Firebase Admin init failed:', err.message);
}

// ============================================
// ✅ Helper: إرسال إشعار لمستخدم واحد
// ============================================
async function sendToUser(userId, notification, data = {}) {
  if (!messaging) {
    return { success: false, error: 'Firebase Admin not initialized' };
  }

  try {
    const user = await User.findById(userId);
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      return { success: false, error: 'No tokens found' };
    }

    const tokens = user.fcmTokens.map(t => t.token);

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: notification.title || 'Smart School',
        body: notification.body || '',
      },
      data: {
        ...data,
        click_action: data.url || '/dashboard',
      },
      webpush: {
        fcmOptions: {
          link: data.url || '/dashboard',
        },
        notification: {
          icon: '/logo.png',
          badge: '/logo.png',
          vibrate: [200, 100, 200],
        },
      },
    });

    const failedTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errorCode = resp.error?.code;
        if (
          errorCode === 'messaging/invalid-registration-token' ||
          errorCode === 'messaging/registration-token-not-registered'
        ) {
          failedTokens.push(tokens[idx]);
        }
      }
    });

    if (failedTokens.length > 0) {
      await User.findByIdAndUpdate(userId, {
        $pull: { fcmTokens: { token: { $in: failedTokens } } },
      });
    }

    return {
      success: true,
      sent: response.successCount,
      failed: response.failureCount,
    };
  } catch (err) {
    console.error('sendToUser error:', err);
    return { success: false, error: err.message };
  }
}

// ============================================
// ✅ Helper: إرسال جماعي
// ============================================
async function sendToMany(userIds, notification, data = {}) {
  const results = [];
  for (const userId of userIds) {
    const result = await sendToUser(userId, notification, data);
    results.push({ userId, ...result });
  }
  return results;
}

// ============================================
// ✅ POST /notifications/register
// ============================================
router.post('/register', auth, async (req, res) => {
  try {
    const { fcmToken, platform = 'web' } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ msg: 'fcmToken مطلوب' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'المستخدم غير موجود' });

    const existing = user.fcmTokens.find(t => t.token === fcmToken);
    if (existing) {
      existing.lastUsedAt = new Date();
      existing.platform = platform;
    } else {
      user.fcmTokens.push({
        token: fcmToken,
        platform,
        addedAt: new Date(),
        lastUsedAt: new Date(),
      });
    }

    if (user.fcmTokens.length > 10) {
      user.fcmTokens = user.fcmTokens.slice(-10);
    }

    await user.save();

    res.json({
      success: true,
      msg: 'تم تسجيل الإشعارات بنجاح',
      count: user.fcmTokens.length,
    });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ POST /notifications/unregister
// ============================================
router.post('/unregister', auth, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) return res.status(400).json({ msg: 'fcmToken مطلوب' });

    await User.findByIdAndUpdate(req.user.id, {
      $pull: { fcmTokens: { token: fcmToken } },
    });

    res.json({ success: true, msg: 'تم إلغاء التسجيل' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ GET /notifications/prefs
// ============================================
router.get('/prefs', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('notificationPrefs');
    res.json(user.notificationPrefs || {});
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ PUT /notifications/prefs
// ============================================
router.put('/prefs', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { notificationPrefs: req.body },
      { new: true }
    ).select('notificationPrefs');

    res.json({ success: true, prefs: user.notificationPrefs });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ POST /notifications/test
// ============================================
router.post('/test', auth, async (req, res) => {
  try {
    if (!messaging) {
      return res.status(503).json({ msg: 'Firebase Admin not initialized' });
    }

    const result = await sendToUser(
      req.user.id,
      {
        title: '🔔 اختبار',
        body: 'الإشعارات شغالة بنجاح!',
      },
      { url: '/dashboard' }
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ POST /notifications/send
// ============================================
router.post('/send', auth, async (req, res) => {
  try {
    if (!['superadmin', 'manager', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ msg: 'غير مصرح' });
    }

    if (!messaging) {
      return res.status(503).json({ msg: 'Firebase Admin not initialized' });
    }

    const { userIds, notification, data } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ msg: 'userIds مطلوب' });
    }

    if (!notification?.title) {
      return res.status(400).json({ msg: 'notification.title مطلوب' });
    }

    const results = await sendToMany(userIds, notification, data || {});

    const totalSent = results.reduce((s, r) => s + (r.sent || 0), 0);
    const totalFailed = results.reduce((s, r) => s + (r.failed || 0), 0);

    res.json({
      success: true,
      totalSent,
      totalFailed,
      results,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ GET /notifications/status
// ============================================
router.get('/status', auth, (req, res) => {
  res.json({
    firebaseReady: !!messaging,
    environment: process.env.NODE_ENV || 'development',
  });
});

module.exports = router;
module.exports.sendToUser = sendToUser;
module.exports.sendToMany = sendToMany;