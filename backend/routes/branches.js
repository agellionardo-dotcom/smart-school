const router = require('express').Router();
const Branch = require('../models/Branch');

// ============================================
// ✅ جلب كل الفروع (بدون حماية - للاستخدام العام)
// ============================================
router.get('/', async (req, res) => {
  try {
    const branches = await Branch.find()
      .populate('manager', 'name email')
      .select('name type radius location manager parent');
    res.json(branches);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ جلب فرع واحد
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id)
      .populate('manager', 'name email');
    if (!branch) return res.status(404).json({ msg: 'الفرع غير موجود' });
    res.json(branch);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ إضافة فرع جديد
// ============================================
router.post('/', async (req, res) => {
  try {
    const branch = await Branch.create(req.body);
    res.json(branch);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ تعديل فرع (PUT) — ده اللي كان ناقص!
// ============================================
router.put('/:id', async (req, res) => {
  try {
    const branch = await Branch.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!branch) {
      return res.status(404).json({ msg: 'الفرع غير موجود' });
    }

    res.json(branch);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ============================================
// ✅ حذف فرع (DELETE) — ده كمان كان ناقص!
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const branch = await Branch.findByIdAndDelete(req.params.id);

    if (!branch) {
      return res.status(404).json({ msg: 'الفرع غير موجود' });
    }

    res.json({ msg: '✅ تم حذف الفرع', branch });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;