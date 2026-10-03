const router = require('express').Router();
const crypto = require('crypto');
const QRCode = require('qrcode');
const Branch = require('../models/Branch');
const Attendance = require('../models/Attendance');
const auth = require('../middleware/auth');
const checkPermission = require('../middleware/permissions');

function distance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

router.post('/generate/:branchId', auth, checkPermission('branches.edit'), async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.branchId);
    if (!branch) return res.status(404).json({ msg: 'الفرع غير موجود' });

    const token = crypto.randomBytes(16).toString('hex');
    branch.qrToken = token;
    await branch.save();

    res.json({ branch, qrToken: token });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/image/:branchId', auth, checkPermission('branches.view.all'), async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.branchId);
    if (!branch) return res.status(404).json({ msg: 'الفرع غير موجود' });
    if (!branch.qrToken) return res.status(400).json({ msg: 'لم يتم إنشاء QR بعد' });

    const qrData = JSON.stringify({
      type: 'smart_school_attendance',
      branchId: branch._id,
      token: branch.qrToken
    });

    const qrImage = await QRCode.toDataURL(qrData, {
      width: 400,
      margin: 2,
      color: { dark: '#0a1f44', light: '#ffffff' }
    });

    res.json({ qrImage, branch: branch.name, qrToken: branch.qrToken });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post('/check-in', auth, async (req, res) => {
  try {
    const { branchId, token, lat, lng } = req.body;

    if (!branchId || !token) {
      return res.status(400).json({ msg: 'بيانات QR مطلوبة' });
    }

    const branch = await Branch.findById(branchId);
    if (!branch) return res.status(404).json({ msg: 'الفرع غير موجود' });

    if (branch.qrToken !== token) {
      return res.status(400).json({ msg: 'رمز QR غير صالح أو منتهي' });
    }

    const d = distance(lat, lng, branch.location.lat, branch.location.lng);
    if (d > branch.radius) {
      return res.status(400).json({ msg: `أنت بعيد بـ ${Math.round(d)} متر عن الفرع` });
    }

    const today = new Date(); today.setHours(0,0,0,0);
    const exists = await Attendance.findOne({
      user: req.user.id,
      date: { $gte: today },
      checkIn: { $exists: true }
    });
    if (exists) return res.status(400).json({ msg: 'تم تسجيل الحضور اليوم مسبقاً' });

    const now = new Date();
    const workStart = new Date(); workStart.setHours(8, 30, 0, 0);
    const lateMinutes = now > workStart ? Math.floor((now - workStart) / 60000) : 0;

    const att = await Attendance.create({
      user: req.user.id,
      branch: branch._id,
      checkIn: now,
      checkInLocation: { lat, lng },
      lateMinutes,
      status: lateMinutes > 0 ? 'late' : 'present',
      method: 'qr'
    });

    res.json({
      msg: 'تم تسجيل الحضور عبر QR',
      attendance: att,
      branch: branch.name,
      lateMinutes
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;