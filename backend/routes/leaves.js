const router = require('express').Router();
const Leave = require('../models/Leave');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  const leave = await Leave.create({ ...req.body, user: req.user.id });
  res.json(leave);
});

router.get('/my', auth, async (req, res) => {
  const leaves = await Leave.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json(leaves);
});

router.get('/all', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'ممنوع' });
  const leaves = await Leave.find().populate('user', 'name email');
  res.json(leaves);
});

router.put('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'ممنوع' });
  const leave = await Leave.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  res.json(leave);
});

module.exports = router;