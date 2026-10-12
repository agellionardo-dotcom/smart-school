// POST /api/attendance/check-range
router.post('/check-range', auth, async (req, res) => {
  const { lat, lng } = req.body;
  const branch = await Branch.findById(req.user.branch);
  if (!branch) return res.status(400).json({ inRange: false, msg: 'الفرع غير موجود' });
  const d = distance(lat, lng, branch.location.lat, branch.location.lng);
  res.json({
    inRange: d <= branch.radius,
    distance: Math.round(d),
    branchName: branch.name,
    branchType: branch.type,
    radius: branch.radius,
  });
});