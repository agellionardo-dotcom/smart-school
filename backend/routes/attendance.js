const router = require('express').Router();
const Attendance = require('../models/Attendance');
const Branch = require('../models/Branch');
const auth = require('../middleware/auth');

function distance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

router.post('/check-in', auth, async (req, res) => {
  const { lat, lng } = req.body;
  const branch = await Branch.findById(req.user.branch || req.body.branch);
  if (!branch) return res.status(400).json({ msg: 'الفرع غير موجود' });
  const d = distance(lat, lng, branch.location.lat, branch.location.lng);
  if (d > branch.radius) return res.status(400).json({ msg: `أنت بعيد بـ ${Math.round(d)} متر عن الفرع` });

  const today = new Date(); today.setHours(0,0,0,0);
  const exists = await Attendance.findOne({ user: req.user.id, date: { $gte: today }, checkIn: { $exists: true } });
  if (exists) return res.status(400).json({ msg: 'تم تسجيل الحضور مسبقاً' });

  const now = new Date();
  const workStart = new Date(); workStart.setHours(8, 30, 0, 0);
  const lateMinutes = now > workStart ? Math.floor((now - workStart) / 60000) : 0;

  const att = await Attendance.create({
    user: req.user.id, branch: branch._id,
    checkIn: now, checkInLocation: { lat, lng },
    lateMinutes, status: lateMinutes > 0 ? 'late' : 'present'
  });
  res.json(att);
});

router.post('/check-out', auth, async (req, res) => {
  const { lat, lng } = req.body;
  const today = new Date(); today.setHours(0,0,0,0);
  const att = await Attendance.findOne({ user: req.user.id, date: { $gte: today }, checkOut: { $exists: false } });
  if (!att) return res.status(400).json({ msg: 'لا يوجد تسجيل حضور' });
  att.checkOut = new Date();
  att.checkOutLocation = { lat, lng };
  await att.save();
  res.json(att);
});

router.get('/my', auth, async (req, res) => {
  const list = await Attendance.find({ user: req.user.id }).sort({ date: -1 });
  const totalDays = list.filter(a => a.status !== 'absent').length;
  const totalLate = list.reduce((s, a) => s + (a.lateMinutes || 0), 0);
  res.json({ list, totalDays, totalLate });
});

module.exports = router;