const router = require('express').Router();
const multer = require('multer');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Settings = require('../models/Settings');
const auth = require('../middleware/auth');
const checkPermission = require('../middleware/permissions');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const roleLabels = {
  superadmin: 'المدير العام',
  manager: 'مدير فرع',
  hr: 'موارد بشرية',
  employee: 'موظف',
  viewer: 'مشاهد'
};

// دالة تطبيع النص العربي
function normalizeArabic(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/[\u064B-\u0652]/g, '')
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/[ةه]/g, 'ه')
    .replace(/[-_.,،()\/\\]/g, '');
}

// دالة البحث عن الفرع بمرونة
function findBranchMatch(branchName, branches) {
  if (!branchName) return null;
  const input = String(branchName).trim();
  const normInput = normalizeArabic(input);

  // 1. مطابقة حرفية
  let found = branches.find(b => b.name === input);
  if (found) return found;

  // 2. مطابقة مُطبّعة
  found = branches.find(b => normalizeArabic(b.name) === normInput);
  if (found) return found;

  // 3. مطابقة جزئية (يحتوي)
  found = branches.find(b => {
    const normB = normalizeArabic(b.name);
    return normB.includes(normInput) || normInput.includes(normB);
  });
  if (found) return found;

  // 4. مطابقة الكلمات المهمة
  const words = input.split(/[\s\-]+/).filter(w => w.length > 2 && !['فرع', 'الرئيسي', 'رئيسي'].includes(w));
  for (const word of words) {
    const normWord = normalizeArabic(word);
    found = branches.find(b => normalizeArabic(b.name).includes(normWord));
    if (found) return found;
  }

  return null;
}

// ==================== تصدير المستخدمين Excel ====================
router.get('/users/excel', auth, checkPermission('users.view.all'), async (req, res) => {
  try {
    const users = await User.find()
      .populate('branch', 'name')
      .select('-password -faceDescriptor');

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Smart School';
    const ws = workbook.addWorksheet('المستخدمون');
    ws.views = [{ rightToLeft: true, state: 'frozen', ySplit: 1 }];

    ws.columns = [
      { header: '#', key: 'index', width: 6 },
      { header: 'الاسم', key: 'name', width: 25 },
      { header: 'البريد', key: 'email', width: 30 },
      { header: 'الدور', key: 'role', width: 18 },
      { header: 'الفرع', key: 'branch', width: 22 },
      { header: 'الهاتف', key: 'phone', width: 16 },
      { header: 'القسم', key: 'department', width: 18 },
      { header: 'الوظيفة', key: 'position', width: 18 },
      { header: 'نشط', key: 'active', width: 10 }
    ];

    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A1F44' } };
    ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(1).height = 25;

    users.forEach((u, i) => {
      const row = ws.addRow({
        index: i + 1,
        name: u.name,
        email: u.email,
        role: roleLabels[u.role] || u.role,
        branch: u.branch?.name || '-',
        phone: u.phone || '-',
        department: u.department || '-',
        position: u.position || '-',
        active: u.active ? 'نعم' : 'لا'
      });
      if (i % 2 === 1) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FA' } };
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=users_${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== قالب استيراد Excel ====================
router.get('/users/template', auth, async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Smart School';

    const ws = workbook.addWorksheet('قالب الاستيراد');
    ws.views = [{ rightToLeft: true }];

    ws.columns = [
      { header: 'الاسم', key: 'name', width: 25 },
      { header: 'البريد', key: 'email', width: 30 },
      { header: 'كلمة المرور', key: 'password', width: 18 },
      { header: 'الدور', key: 'role', width: 18 },
      { header: 'اسم الفرع', key: 'branch', width: 25 },
      { header: 'الهاتف', key: 'phone', width: 16 },
      { header: 'القسم', key: 'department', width: 18 },
      { header: 'الوظيفة', key: 'position', width: 18 }
    ];

    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A1F44' } };
    ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(1).height = 25;

    ws.addRow({
      name: 'أحمد محمد',
      email: 'ahmed@smart.com',
      password: 'ahmed123',
      role: 'employee',
      branch: 'الفرع الرئيسي - المنيا',
      phone: '01000000000',
      department: 'IT',
      position: 'مطور'
    });

    // ورقة التعليمات
    const noteSheet = workbook.addWorksheet('تعليمات');
    noteSheet.views = [{ rightToLeft: true }];
    noteSheet.columns = [{ width: 90 }];
    noteSheet.addRow(['📋 تعليمات الاستيراد:']).font = { bold: true, size: 14 };
    noteSheet.addRow(['']);
    noteSheet.addRow(['1. الدور يجب أن يكون واحداً من: superadmin, manager, hr, employee, viewer']);
    noteSheet.addRow(['2. اسم الفرع يمكن كتابته بأي من الطرق التالية:']);
    noteSheet.addRow(['']);
    noteSheet.addRow(['   ✅ الطريقة 1 (الأفضل): الاسم الكامل']);
    noteSheet.addRow(['      مثال: الفرع الرئيسي - المنيا']);
    noteSheet.addRow(['']);
    noteSheet.addRow(['   ✅ الطريقة 2: الاسم المختصر']);
    noteSheet.addRow(['      مثال: ملوي أو بني مزار أو المعادي أو المنيا']);
    noteSheet.addRow(['']);
    noteSheet.addRow(['   ✅ الطريقة 3: بدون كلمة "فرع"']);
    noteSheet.addRow(['      مثال: ملوي، بني مزار']);
    noteSheet.addRow(['']);
    noteSheet.addRow(['3. البريد الإلكتروني يجب أن يكون فريداً (غير مستخدم)']);
    noteSheet.addRow(['4. كلمة المرور 6 أحرف على الأقل']);
    noteSheet.addRow(['5. احذف صف المثال قبل الاستيراد']);
    noteSheet.addRow(['']);

    noteSheet.addRow(['الفروع المتاحة في النظام:']).font = { bold: true, size: 12 };
    try {
      const branches = await Branch.find();
      branches.forEach(b => {
        const shortName = b.name.replace(/فرع\s*/g, '').replace(/\s*-\s*/g, ' ').trim();
        noteSheet.addRow([`   • ${b.name}   (أو: ${shortName})`]);
      });
    } catch (e) {
      noteSheet.addRow(['   (لا توجد فروع)']);
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=users_template.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== استيراد المستخدمين من Excel ====================
router.post('/users/import', auth, checkPermission('users.create'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'لم يتم رفع ملف' });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const ws = workbook.worksheets[0];

    const results = {
      success: 0,
      failed: 0,
      errors: [],
      created: [],
      branchesUsed: {}
    };

    // جلب كل الفروع
    const branches = await Branch.find();

    // قراءة الصفوف
    const rows = [];
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const vals = row.values;
      if (!vals || vals.length < 3 || !vals[1]) return;
      rows.push({
        rowNumber,
        name: row.getCell(1).value,
        email: row.getCell(2).value,
        password: row.getCell(3).value,
        role: row.getCell(4).value,
        branch: row.getCell(5).value,
        phone: row.getCell(6).value,
        department: row.getCell(7).value,
        position: row.getCell(8).value
      });
    });

    // معالجة كل صف
    for (const r of rows) {
      try {
        if (!r.name || !r.email || !r.password) {
          results.failed++;
          results.errors.push(`صف ${r.rowNumber}: بيانات ناقصة`);
          continue;
        }

        const email = String(r.email).toLowerCase().trim();

        // تحقق من عدم وجود البريد
        const exists = await User.findOne({ email });
        if (exists) {
          results.failed++;
          results.errors.push(`صف ${r.rowNumber}: البريد مستخدم - ${email}`);
          continue;
        }

        // الدور
        const validRoles = ['superadmin', 'manager', 'hr', 'employee', 'viewer'];
        const role = validRoles.includes(r.role) ? r.role : 'employee';

        // البحث عن الفرع (بمرونة)
        const branch = findBranchMatch(r.branch, branches);
        if (!branch) {
          results.failed++;
          const availableBranches = branches.map(b => b.name).join(' | ');
          results.errors.push(
            `صف ${r.rowNumber}: الفرع "${r.branch}" غير موجود. ` +
            `الفروع المتاحة: ${availableBranches}`
          );
          continue;
        }

        // كلمة المرور
        const password = String(r.password);
        if (password.length < 6) {
          results.failed++;
          results.errors.push(`صف ${r.rowNumber}: كلمة المرور قصيرة (الحد الأدنى 6 أحرف)`);
          continue;
        }

        const hashed = await bcrypt.hash(password, 10);

        // إنشاء المستخدم
        await User.create({
          name: String(r.name).trim(),
          email,
          password: hashed,
          role,
          branch: branch._id,
          phone: r.phone ? String(r.phone).trim() : '',
          department: r.department ? String(r.department).trim() : '',
          position: r.position ? String(r.position).trim() : '',
          createdBy: req.user.id
        });

        results.success++;
        results.created.push({
          name: String(r.name).trim(),
          email,
          branch: branch.name
        });

        // تتبع الفروع المستخدمة
        results.branchesUsed[branch.name] = (results.branchesUsed[branch.name] || 0) + 1;

      } catch (err) {
        results.failed++;
        results.errors.push(`صف ${r.rowNumber}: ${err.message}`);
      }
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== تصدير المستخدمين PDF ====================
router.get('/users/pdf', auth, checkPermission('users.view.all'), async (req, res) => {
  try {
    const users = await User.find()
      .populate('branch', 'name')
      .select('-password -faceDescriptor');

    let settings = await Settings.findOne();
    const schoolName = settings?.schoolName || 'Smart School';

    const doc = new PDFDocument({ size: 'A4', margin: 40, layout: 'portrait' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=users_${Date.now()}.pdf`);
    doc.pipe(res);

    doc.rect(0, 0, 595, 80).fill('#0a1f44');
    doc.fontSize(22).fillColor('#ffffff').text(schoolName + ' - تقرير المستخدمين', 40, 25, { align: 'center', width: 515 });
    doc.fontSize(10).fillColor('#8b95a7').text(`التاريخ: ${new Date().toLocaleString('ar-EG')}`, 40, 55, { align: 'center', width: 515 });
    doc.moveDown(3);

    const cols = [30, 110, 140, 90, 130];
    const headers = ['#', 'الاسم', 'البريد', 'الدور', 'الفرع'];
    const startX = 40;
    let y = 110;

    doc.rect(startX, y, cols.reduce((a, b) => a + b), 22).fill('#0a1f44');
    doc.fillColor('#ffffff').fontSize(10);
    let x = startX;
    headers.forEach((h, i) => {
      doc.text(h, x + 5, y + 6, { width: cols[i] - 10, align: 'center' });
      x += cols[i];
    });
    y += 22;

    users.forEach((u, i) => {
      if (y > 760) { doc.addPage(); y = 40; }
      if (i % 2 === 1) {
        doc.rect(startX, y, cols.reduce((a, b) => a + b), 20).fill('#f5f7fa');
      }
      x = startX;
      doc.fillColor('#000000').fontSize(9);
      const row = [
        String(i + 1),
        u.name || '-',
        u.email || '-',
        roleLabels[u.role] || u.role,
        u.branch?.name || '-'
      ];
      row.forEach((d, j) => {
        doc.text(String(d), x + 5, y + 5, { width: cols[j] - 10, align: 'center' });
        x += cols[j];
      });
      y += 20;
    });

    doc.fontSize(8).fillColor('#8b95a7').text(
      `© ${new Date().getFullYear()} SMART For Computer & Electronics - إجمالي: ${users.length} مستخدم`,
      40, 800, { align: 'center', width: 515 }
    );

    doc.end();
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== تصدير الحضور Excel ====================
router.get('/attendance/excel', auth, checkPermission('reports.export'), async (req, res) => {
  try {
    const { from, to, branch } = req.query;
    const filter = {};
    if (branch) filter.branch = branch;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const records = await Attendance.find(filter)
      .populate('user', 'name email')
      .populate('branch', 'name')
      .sort({ date: -1 })
      .limit(5000);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Smart School';
    const ws = workbook.addWorksheet('تقرير الحضور');
    ws.views = [{ rightToLeft: true, state: 'frozen', ySplit: 1 }];

    ws.columns = [
      { header: '#', key: 'index', width: 6 },
      { header: 'الموظف', key: 'name', width: 25 },
      { header: 'البريد', key: 'email', width: 28 },
      { header: 'الفرع', key: 'branch', width: 22 },
      { header: 'التاريخ', key: 'date', width: 14 },
      { header: 'الحضور', key: 'in', width: 12 },
      { header: 'الانصراف', key: 'out', width: 12 },
      { header: 'التأخير (د)', key: 'late', width: 12 },
      { header: 'الحالة', key: 'status', width: 12 }
    ];

    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A1F44' } };
    ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(1).height = 25;

    records.forEach((r, i) => {
      const row = ws.addRow({
        index: i + 1,
        name: r.user?.name || '-',
        email: r.user?.email || '-',
        branch: r.branch?.name || '-',
        date: new Date(r.date).toLocaleDateString('ar-EG'),
        in: r.checkIn ? new Date(r.checkIn).toLocaleTimeString('ar-EG') : '-',
        out: r.checkOut ? new Date(r.checkOut).toLocaleTimeString('ar-EG') : '-',
        late: r.lateMinutes || 0,
        status: r.status === 'late' ? 'متأخر' : 'حاضر'
      });
      if (r.lateMinutes > 0) {
        row.getCell('late').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
        row.getCell('late').font = { color: { argb: 'FF8B6508' }, bold: true };
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== تصدير الحضور PDF ====================
router.get('/attendance/pdf', auth, checkPermission('reports.export'), async (req, res) => {
  try {
    const { from, to, branch } = req.query;
    const filter = {};
    if (branch) filter.branch = branch;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const records = await Attendance.find(filter)
      .populate('user', 'name')
      .populate('branch', 'name')
      .sort({ date: -1 })
      .limit(300);

    const doc = new PDFDocument({ size: 'A4', margin: 40, layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${Date.now()}.pdf`);
    doc.pipe(res);

    doc.rect(0, 0, 842, 70).fill('#0a1f44');
    doc.fontSize(20).fillColor('#ffffff').text('Smart School - تقرير الحضور', 40, 20, { align: 'center', width: 762 });
    doc.fontSize(10).fillColor('#8b95a7').text(`التاريخ: ${new Date().toLocaleString('ar-EG')}`, 40, 48, { align: 'center', width: 762 });
    doc.moveDown(2);

    const cols = [40, 150, 180, 130, 110, 100, 90];
    const headers = ['#', 'الموظف', 'الفرع', 'التاريخ', 'الحضور', 'الانصراف', 'التأخير'];
    const startX = 40;
    let y = 100;

    doc.rect(startX, y, cols.reduce((a, b) => a + b), 22).fill('#0a1f44');
    doc.fillColor('#ffffff').fontSize(10);
    let x = startX;
    headers.forEach((h, i) => {
      doc.text(h, x + 5, y + 6, { width: cols[i] - 10, align: 'center' });
      x += cols[i];
    });
    y += 22;

    records.forEach((r, i) => {
      if (y > 540) { doc.addPage(); y = 40; }
      if (i % 2 === 1) {
        doc.rect(startX, y, cols.reduce((a, b) => a + b), 20).fill('#f5f7fa');
      }
      x = startX;
      doc.fillColor('#000000').fontSize(9);
      const row = [
        String(i + 1),
        r.user?.name || '-',
        r.branch?.name || '-',
        new Date(r.date).toLocaleDateString('ar-EG'),
        r.checkIn ? new Date(r.checkIn).toLocaleTimeString('ar-EG') : '-',
        r.checkOut ? new Date(r.checkOut).toLocaleTimeString('ar-EG') : '-',
        `${r.lateMinutes || 0} د`
      ];
      row.forEach((d, j) => {
        doc.text(String(d), x + 5, y + 5, { width: cols[j] - 10, align: 'center' });
        x += cols[j];
      });
      y += 20;
    });

    doc.fontSize(8).fillColor('#8b95a7').text(
      `© ${new Date().getFullYear()} SMART For Computer & Electronics - إجمالي: ${records.length} سجل`,
      40, 560, { align: 'center', width: 762 }
    );

    doc.end();
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== تقرير شهري Excel ====================
router.get('/monthly/excel', auth, checkPermission('reports.export'), async (req, res) => {
  try {
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const year = Number(req.query.year) || new Date().getFullYear();

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const records = await Attendance.find({ date: { $gte: start, $lte: end } })
      .populate('user', 'name email')
      .populate('branch', 'name');

    const userStats = {};
    records.forEach(r => {
      const id = String(r.user?._id);
      if (!userStats[id]) {
        userStats[id] = {
          name: r.user?.name || '-',
          email: r.user?.email || '-',
          branch: r.branch?.name || '-',
          days: 0, late: 0, totalLate: 0
        };
      }
      if (r.checkIn) userStats[id].days++;
      if (r.status === 'late') {
        userStats[id].late++;
        userStats[id].totalLate += r.lateMinutes || 0;
      }
    });

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet(`تقرير ${month}-${year}`);
    ws.views = [{ rightToLeft: true, state: 'frozen', ySplit: 1 }];

    ws.columns = [
      { header: '#', key: 'index', width: 6 },
      { header: 'الموظف', key: 'name', width: 25 },
      { header: 'الفرع', key: 'branch', width: 22 },
      { header: 'أيام الحضور', key: 'days', width: 15 },
      { header: 'مرات التأخير', key: 'late', width: 15 },
      { header: 'إجمالي التأخير (د)', key: 'totalLate', width: 20 }
    ];

    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A1F44' } };
    ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(1).height = 25;

    Object.values(userStats).forEach((s, i) => {
      ws.addRow({
        index: i + 1,
        name: s.name,
        branch: s.branch,
        days: s.days,
        late: s.late,
        totalLate: s.totalLate
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=monthly_${year}_${month}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});
// ==================== تقرير الحضور الشهري (مفصل لكل موظف) ====================
router.get('/monthly-attendance', auth, async (req, res) => {
  try {
    const { month, year, branch } = req.query;

    if (!month || !year) {
      return res.status(400).json({ msg: 'الشهر والسنة مطلوبين' });
    }

    // ✅ الفلترة حسب الدور
    let userFilter = { active: true, role: { $ne: 'superadmin' } };

    if (req.user.role === 'superadmin' || req.user.role === 'viewer') {
      // كل الفروع
    } else if (req.user.role === 'hr') {
      const hq = await Branch.findOne({ type: 'main' });
      if (hq && String(req.user.branch) === String(hq._id)) {
        // HR في المنيا → كل الفروع
      } else {
        userFilter.branch = req.user.branch;
      }
    } else if (req.user.role === 'manager') {
      userFilter.branch = req.user.branch;
    } else {
      userFilter._id = req.user.id;
    }

    if (branch) userFilter.branch = branch;

    // ✅ جلب الموظفين
    const users = await User.find(userFilter)
      .populate('branch', 'name')
      .select('name email position department employeeId branch');

    // ✅ تواريخ الشهر
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    // ✅ جلب الحضور
    const attendances = await Attendance.find({
      date: { $gte: startDate, $lte: endDate },
    });

    // ✅ حساب الإحصائيات لكل موظف
    const report = users.map(user => {
      const userAttendances = attendances.filter(a => String(a.user) === String(user._id));

      const presentDays = userAttendances.filter(a => a.checkIn).length;
      const lateDays = userAttendances.filter(a => a.status === 'late').length;
      const absentDays = userAttendances.filter(a => !a.checkIn).length;

      const totalLateMinutes = userAttendances
        .filter(a => a.status === 'late' && a.lateMinutes)
        .reduce((sum, a) => sum + (a.lateMinutes || 0), 0);

      const totalWorkHours = userAttendances
        .filter(a => a.checkIn && a.checkOut)
        .reduce((sum, a) => {
          const diff = new Date(a.checkOut) - new Date(a.checkIn);
          return sum + (diff / (1000 * 60 * 60));
        }, 0);

      return {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          position: user.position,
          department: user.department,
          employeeId: user.employeeId,
        },
        branch: user.branch,
        presentDays,
        lateDays,
        absentDays,
        totalLateMinutes: Math.round(totalLateMinutes),
        totalWorkHours: Math.round(totalWorkHours * 10) / 10,
        attendanceRate: Math.round((presentDays / (presentDays + absentDays || 1)) * 100),
      };
    });

    res.json(report);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== تصدير تقرير الحضور الشهري - Excel ====================
router.get('/monthly-attendance/excel', auth, async (req, res) => {
  try {
    const { month, year, branch } = req.query;

    if (!month || !year) {
      return res.status(400).json({ msg: 'الشهر والسنة مطلوبين' });
    }

    let userFilter = { active: true, role: { $ne: 'superadmin' } };

    if (req.user.role === 'superadmin' || req.user.role === 'viewer') {
      // كل الفروع
    } else if (req.user.role === 'hr') {
      const hq = await Branch.findOne({ type: 'main' });
      if (hq && String(req.user.branch) === String(hq._id)) {
        // كل الفروع
      } else {
        userFilter.branch = req.user.branch;
      }
    } else if (req.user.role === 'manager') {
      userFilter.branch = req.user.branch;
    } else {
      userFilter._id = req.user.id;
    }

    if (branch) userFilter.branch = branch;

    const users = await User.find(userFilter).populate('branch', 'name');

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    const attendances = await Attendance.find({
      date: { $gte: startDate, $lte: endDate },
    });

    const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('تقرير الحضور');

    sheet.views = [{ rightToLeft: true }];

    sheet.mergeCells('A1:K1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `تقرير الحضور الشهري - ${MONTHS[month - 1]} ${year}`;
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A1F44' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    const headers = ['الاسم', 'البريد', 'الوظيفة', 'القسم', 'الفرع', 'أيام الحضور', 'أيام التأخير', 'أيام الغياب', 'دقائق التأخير', 'ساعات العمل', 'نسبة الحضور %'];
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF142B5C' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    users.forEach(user => {
      const userAttendances = attendances.filter(a => String(a.user) === String(user._id));

      const presentDays = userAttendances.filter(a => a.checkIn).length;
      const lateDays = userAttendances.filter(a => a.status === 'late').length;
      const absentDays = userAttendances.filter(a => !a.checkIn).length;
      const totalLateMinutes = userAttendances.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);
      const totalWorkHours = userAttendances
        .filter(a => a.checkIn && a.checkOut)
        .reduce((sum, a) => sum + ((new Date(a.checkOut) - new Date(a.checkIn)) / (1000 * 60 * 60)), 0);

      sheet.addRow([
        user.name,
        user.email,
        user.position || '-',
        user.department || '-',
        user.branch?.name || '-',
        presentDays,
        lateDays,
        absentDays,
        Math.round(totalLateMinutes),
        Math.round(totalWorkHours * 10) / 10,
        Math.round((presentDays / (presentDays + absentDays || 1)) * 100),
      ]);
    });

    sheet.columns.forEach((col, i) => {
      col.width = [20, 25, 18, 18, 18, 12, 12, 12, 14, 12, 14][i] || 15;
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=monthly_attendance_${year}_${month}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ==================== تصدير تقرير الحضور الشهري - PDF ====================
router.get('/monthly-attendance/pdf', auth, async (req, res) => {
  try {
    const { month, year, branch } = req.query;

    if (!month || !year) {
      return res.status(400).json({ msg: 'الشهر والسنة مطلوبين' });
    }

    let userFilter = { active: true, role: { $ne: 'superadmin' } };

    if (req.user.role === 'superadmin' || req.user.role === 'viewer') {
      // كل الفروع
    } else if (req.user.role === 'hr') {
      const hq = await Branch.findOne({ type: 'main' });
      if (hq && String(req.user.branch) === String(hq._id)) {
        // كل الفروع
      } else {
        userFilter.branch = req.user.branch;
      }
    } else if (req.user.role === 'manager') {
      userFilter.branch = req.user.branch;
    } else {
      userFilter._id = req.user.id;
    }

    if (branch) userFilter.branch = branch;

    const users = await User.find(userFilter).populate('branch', 'name');

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    const attendances = await Attendance.find({
      date: { $gte: startDate, $lte: endDate },
    });

    const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=monthly_attendance_${year}_${month}.pdf`);

    doc.pipe(res);

    doc.fontSize(18).fillColor('#0a1f44').text(`تقرير الحضور الشهري - ${MONTHS[month - 1]} ${year}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).fillColor('#5a6478').text(`عدد الموظفين: ${users.length}`, { align: 'right' });
    doc.moveDown();

    const startY = doc.y;
    const rowHeight = 22;

    const columns = [
      { label: 'الاسم', width: 110 },
      { label: 'الوظيفة', width: 90 },
      { label: 'الفرع', width: 90 },
      { label: 'حضور', width: 50 },
      { label: 'تأخير', width: 50 },
      { label: 'غياب', width: 50 },
      { label: 'دقائق تأخير', width: 70 },
      { label: 'ساعات العمل', width: 70 },
      { label: 'النسبة %', width: 60 },
    ];

    let x = 30;
    doc.rect(30, startY, 750, rowHeight).fill('#0a1f44');

    columns.forEach(col => {
      doc.fillColor('#ffffff').fontSize(9).text(col.label, x + 5, startY + 6, { width: col.width - 10, align: 'center' });
      x += col.width;
    });

    let y = startY + rowHeight;

    users.forEach((user, i) => {
      x = 30;
      if (i % 2 === 0) doc.rect(30, y, 750, rowHeight).fill('#f5f7fa');

      const userAttendances = attendances.filter(a => String(a.user) === String(user._id));
      const presentDays = userAttendances.filter(a => a.checkIn).length;
      const lateDays = userAttendances.filter(a => a.status === 'late').length;
      const absentDays = userAttendances.filter(a => !a.checkIn).length;
      const totalLateMinutes = userAttendances.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);
      const totalWorkHours = userAttendances
        .filter(a => a.checkIn && a.checkOut)
        .reduce((sum, a) => sum + ((new Date(a.checkOut) - new Date(a.checkIn)) / (1000 * 60 * 60)), 0);

      const row = [
        user.name, user.position || '-', user.branch?.name || '-',
        presentDays, lateDays, absentDays,
        Math.round(totalLateMinutes), Math.round(totalWorkHours * 10) / 10,
        Math.round((presentDays / (presentDays + absentDays || 1)) * 100),
      ];

      columns.forEach((col, j) => {
        doc.fillColor('#0a1f44').fontSize(8).text(String(row[j]), x + 5, y + 6, { width: col.width - 10, align: 'center' });
        x += col.width;
      });

      y += rowHeight;
      if (y > doc.page.height - 50) { doc.addPage(); y = 30; }
    });

    doc.end();
  } catch (err) {
    console.error('PDF error:', err);
    res.status(500).json({ msg: err.message });
  }
});
module.exports = router;