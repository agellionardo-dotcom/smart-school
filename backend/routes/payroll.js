const router = require('express').Router();
const Payroll = require('../models/Payroll');
const User = require('../models/User');
const Branch = require('../models/Branch');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const { checkPermission } = require('../middleware/permissions');
const { logAction } = require('../middleware/auditLog');

// ==================== Helpers ====================
const getHQBranch = async (companyId) => {
  return await Branch.findOne({ companyId, type: 'main' });
};

const isHQHRCheck = async (user, companyId) => {
  const role = user.companyRole || user.role;
  if (role !== 'hr') return false;
  if (!user.branch) return false;
  const hq = await getHQBranch(companyId);
  return hq && String(user.branch) === String(hq._id);
};

// ✅ الفلتر حسب الدور
const getFilter = async (user, companyId, query = {}) => {
  const filter = { companyId };   // ← ✅
  const role = user.companyRole || user.role;

  if (role === 'superadmin' || role === 'viewer' || user.role === 'superadmin') {
    // كل حاجة
  } else if (role === 'hr' && (await isHQHRCheck(user, companyId))) {
    // كل حاجة
  } else if (['hr', 'manager', 'company_owner'].includes(role)) {
    // فرعه بس
    filter.branch = user.branch;
  } else {
    // الموظف يشوف راتبه بس
    filter.user = user.id;
  }

  // فلترة إضافية من الـ query
  if (query.month) filter.month = parseInt(query.month);
  if (query.year) filter.year = parseInt(query.year);
  if (query.status) filter.status = query.status;
  if (query.branch) filter.branch = query.branch;
  if (query.user) filter.user = query.user;

  return filter;
};

// ==================== جلب الرواتب ====================
router.get('/', auth, tenant, checkPermission('users.view.branch'), async (req, res) => {
  try {
    const filter = await getFilter(req.user, req.companyId, req.query);

    const payrolls = await Payroll.find(filter)
      .populate('user', 'name email position department employeeId')
      .populate('branch', 'name')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .sort({ year: -1, month: -1, createdAt: -1 })
      .limit(500);

    res.json(payrolls);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== جلب رواتب موظف ====================
router.get('/user/:userId', auth, tenant, async (req, res) => {
  try {
    const role = req.user.companyRole || req.user.role;

    // الموظف يقدر يشوف راتبه بس
    if (role === 'employee' && String(req.user.id) !== req.params.userId) {
      return res.status(403).json({ msg: 'غير مصرح' });
    }

    const payrolls = await Payroll.find({
      companyId: req.companyId,   // ← ✅
      user: req.params.userId,
    })
      .populate('branch', 'name')
      .sort({ year: -1, month: -1 });

    res.json(payrolls);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== إحصائيات ====================
router.get('/stats/:year/:month', auth, tenant, checkPermission('users.view.branch'), async (req, res) => {
  try {
    const { year, month } = req.params;
    const filter = await getFilter(req.user, req.companyId, { year, month });

    const payrolls = await Payroll.find(filter);

    const stats = {
      totalEmployees: payrolls.length,
      totalBasic: payrolls.reduce((sum, p) => sum + (p.basicSalary || 0), 0),
      totalAllowances: payrolls.reduce((sum, p) => sum + (p.totalAllowances || 0), 0),
      totalBonuses: payrolls.reduce((sum, p) => sum + (p.totalBonuses || 0), 0),
      totalDeductions: payrolls.reduce((sum, p) => sum + (p.totalDeductions || 0), 0),
      totalNet: payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0),
      paid: payrolls.filter(p => p.status === 'paid').length,
      approved: payrolls.filter(p => p.status === 'approved').length,
      draft: payrolls.filter(p => p.status === 'draft').length,
    };

    res.json(stats);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== إنشاء راتب ====================
router.post('/', auth, tenant, checkPermission('users.edit'), async (req, res) => {
  try {
    const {
      user: userId,
      month,
      year,
      basicSalary,
      allowances,
      bonuses,
      deductions,
      notes,
    } = req.body;

    if (!userId || !month || !year) {
      return res.status(400).json({ msg: 'الموظف والشهر والسنة مطلوبين' });
    }

    // ✅ الموظف من نفس الشركة
    const targetUser = await User.findOne({
      _id: userId,
      companyId: req.companyId,   // ← ✅
    });

    if (!targetUser) {
      return res.status(404).json({ msg: 'الموظف غير موجود' });
    }

    const role = req.user.companyRole || req.user.role;

    // ✅ manager/hr في فرع تاني → موظفي فرعهم بس
    if (role === 'manager' || (role === 'hr' && !(await isHQHRCheck(req.user, req.companyId)))) {
      if (String(targetUser.branch) !== String(req.user.branch)) {
        return res.status(403).json({ msg: 'غير مصرح — الموظف في فرع آخر' });
      }
    }

    // ✅ نتأكد إن مفيش راتب لنفس الموظف في نفس الشهر
    const existing = await Payroll.findOne({
      companyId: req.companyId,
      user: userId,
      month,
      year,
    });

    if (existing) {
      return res.status(400).json({ msg: 'يوجد راتب لهذا الموظف في هذا الشهر بالفعل' });
    }

    const payroll = await Payroll.create({
      companyId: req.companyId,   // ← ✅
      user: userId,
      branch: targetUser.branch,
      month,
      year,
      basicSalary: basicSalary || 0,
      allowances: allowances || {},
      bonuses: bonuses || {},
      deductions: deductions || {},
      notes: notes || '',
      status: 'draft',
      createdBy: req.user.id,
    });

    const populated = await Payroll.findById(payroll._id)
      .populate('user', 'name email position')
      .populate('branch', 'name');

    await logAction({
      req,
      action: 'create',
      resource: 'payroll',
      resourceId: payroll._id,
      description: `إنشاء راتب: ${targetUser.name} - ${month}/${year}`,
    });

    res.status(201).json({ msg: '✅ تم إنشاء الراتب', payroll: populated });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== تعديل راتب ====================
router.put('/:id', auth, tenant, checkPermission('users.edit'), async (req, res) => {
  try {
    const payroll = await Payroll.findOne({
      _id: req.params.id,
      companyId: req.companyId,   // ← ✅
    });

    if (!payroll) {
      return res.status(404).json({ msg: 'الراتب غير موجود' });
    }

    const role = req.user.companyRole || req.user.role;

    // ✅ manager/hr في فرع تاني → فرعهم بس
    if (role === 'manager' || (role === 'hr' && !(await isHQHRCheck(req.user, req.companyId)))) {
      if (String(payroll.branch) !== String(req.user.branch)) {
        return res.status(403).json({ msg: 'غير مصرح' });
      }
    }

    // ✅ ممنوع تعديل راتب مدفوع
    if (payroll.status === 'paid') {
      return res.status(400).json({ msg: 'لا يمكن تعديل راتب مدفوع' });
    }

    const allowedFields = ['basicSalary', 'allowances', 'bonuses', 'deductions', 'notes'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        payroll[field] = req.body[field];
      }
    });

    await payroll.save();

    const populated = await Payroll.findById(payroll._id)
      .populate('user', 'name email position')
      .populate('branch', 'name');

    await logAction({
      req,
      action: 'update',
      resource: 'payroll',
      resourceId: payroll._id,
      description: `تعديل راتب`,
    });

    res.json({ msg: '✅ تم تحديث الراتب', payroll: populated });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== اعتماد راتب ====================
router.put('/:id/approve', auth, tenant, checkPermission('users.edit'), async (req, res) => {
  try {
    const payroll = await Payroll.findOne({
      _id: req.params.id,
      companyId: req.companyId,   // ← ✅
    });

    if (!payroll) {
      return res.status(404).json({ msg: 'الراتب غير موجود' });
    }

    if (payroll.status !== 'draft') {
      return res.status(400).json({ msg: 'الراتب تم اعتماده أو دفعه بالفعل' });
    }

    payroll.status = 'approved';
    payroll.approvedBy = req.user.id;
    payroll.approvedAt = new Date();
    await payroll.save();

    await logAction({
      req,
      action: 'approve',
      resource: 'payroll',
      resourceId: payroll._id,
      description: `اعتماد راتب`,
    });

    res.json({ msg: '✅ تم اعتماد الراتب', payroll });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== دفع راتب ====================
router.put('/:id/pay', auth, tenant, checkPermission('users.edit'), async (req, res) => {
  try {
    const payroll = await Payroll.findOne({
      _id: req.params.id,
      companyId: req.companyId,   // ← ✅
    });

    if (!payroll) {
      return res.status(404).json({ msg: 'الراتب غير موجود' });
    }

    if (payroll.status !== 'approved') {
      return res.status(400).json({ msg: 'لازم تعتمد الراتب الأول' });
    }

    payroll.status = 'paid';
    payroll.paidAt = new Date();
    await payroll.save();

    await logAction({
      req,
      action: 'update',
      resource: 'payroll',
      resourceId: payroll._id,
      description: `دفع راتب`,
    });

    res.json({ msg: '✅ تم تسجيل دفع الراتب', payroll });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== حذف راتب ====================
router.delete('/:id', auth, tenant, checkPermission('users.delete'), async (req, res) => {
  try {
    const payroll = await Payroll.findOne({
      _id: req.params.id,
      companyId: req.companyId,   // ← ✅
    });

    if (!payroll) {
      return res.status(404).json({ msg: 'الراتب غير موجود' });
    }

    if (payroll.status === 'paid') {
      return res.status(400).json({ msg: 'لا يمكن حذف راتب مدفوع' });
    }

    await Payroll.findByIdAndDelete(req.params.id);

    await logAction({
      req,
      action: 'delete',
      resource: 'payroll',
      resourceId: payroll._id,
      description: `حذف راتب`,
    });

    res.json({ ok: true, msg: '✅ تم حذف الراتب' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== إنشاء رواتب جماعية ====================
router.post('/bulk', auth, tenant, checkPermission('users.edit'), async (req, res) => {
  try {
    const { month, year, branch, basicSalaryDefault } = req.body;
    const role = req.user.companyRole || req.user.role;

    if (!month || !year) {
      return res.status(400).json({ msg: 'الشهر والسنة مطلوبين' });
    }

    // ✅ الفلتر
    let userFilter = {
      companyId: req.companyId,   // ← ✅
      active: true,
      role: { $ne: 'superadmin' },
    };

    if (role === 'manager' || (role === 'hr' && !(await isHQHRCheck(req.user, req.companyId)))) {
      userFilter.branch = req.user.branch;
    } else if (branch) {
      userFilter.branch = branch;
    }

    const users = await User.find(userFilter);

    const results = { created: 0, skipped: 0, errors: [] };

    for (const user of users) {
      try {
        const existing = await Payroll.findOne({
          companyId: req.companyId,
          user: user._id,
          month,
          year,
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        await Payroll.create({
          companyId: req.companyId,   // ← ✅
          user: user._id,
          branch: user.branch,
          month,
          year,
          basicSalary: user.salary || basicSalaryDefault || 0,
          status: 'draft',
          createdBy: req.user.id,
        });

        results.created++;
      } catch (err) {
        results.errors.push(`${user.name}: ${err.message}`);
      }
    }

    await logAction({
      req,
      action: 'create',
      resource: 'payroll',
      description: `إنشاء رواتب جماعية: ${results.created} موظف - ${month}/${year}`,
      details: { month, year, created: results.created, skipped: results.skipped },
    });

    res.json({
      msg: `✅ تم إنشاء ${results.created} راتب · تم تخطي ${results.skipped}`,
      results,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== تصدير Excel ====================
router.get('/export/excel', auth, tenant, checkPermission('users.view.branch'), async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ msg: 'الشهر والسنة مطلوبين' });
    }

    const filter = await getFilter(req.user, req.companyId, { month, year });
    const payrolls = await Payroll.find(filter)
      .populate('user', 'name email position department employeeId')
      .populate('branch', 'name')
      .sort({ 'user.name': 1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('المرتبات');

    sheet.views = [{ rightToLeft: true }];

    sheet.mergeCells('A1:L1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `تقرير المرتبات - ${month}/${year}`;
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C7CE0' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    const headers = [
      'الاسم', 'البريد', 'الوظيفة', 'القسم', 'الفرع',
      'الأساسي', 'البدلات', 'المكافآت', 'الخصومات', 'الصافي', 'الحالة', 'ملاحظات',
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C7CE0' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    headerRow.height = 25;

    payrolls.forEach((p) => {
      const statusLabels = { draft: 'مسودة', approved: 'معتمد', paid: 'مدفوع' };

      sheet.addRow([
        p.user?.name || '-',
        p.user?.email || '-',
        p.user?.position || '-',
        p.user?.department || '-',
        p.branch?.name || '-',
        p.basicSalary || 0,
        p.totalAllowances || 0,
        p.totalBonuses || 0,
        p.totalDeductions || 0,
        p.netSalary || 0,
        statusLabels[p.status] || p.status,
        p.notes || '',
      ]);
    });

    const totalRow = sheet.addRow([
      'الإجمالي', '', '', '', '',
      payrolls.reduce((s, p) => s + (p.basicSalary || 0), 0),
      payrolls.reduce((s, p) => s + (p.totalAllowances || 0), 0),
      payrolls.reduce((s, p) => s + (p.totalBonuses || 0), 0),
      payrolls.reduce((s, p) => s + (p.totalDeductions || 0), 0),
      payrolls.reduce((s, p) => s + (p.netSalary || 0), 0),
      '', '',
    ]);

    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
    });

    sheet.columns.forEach((col, i) => {
      col.width = [20, 25, 18, 18, 18, 12, 12, 12, 12, 14, 12, 20][i] || 15;
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=payroll_${year}_${month}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ==================== تصدير PDF ====================
router.get('/export/pdf', auth, tenant, checkPermission('users.view.branch'), async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ msg: 'الشهر والسنة مطلوبين' });
    }

    const filter = await getFilter(req.user, req.companyId, { month, year });
    const payrolls = await Payroll.find(filter)
      .populate('user', 'name position')
      .populate('branch', 'name')
      .sort({ 'user.name': 1 });

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=payroll_${year}_${month}.pdf`);

    doc.pipe(res);

    doc.fontSize(18)
      .fillColor('#7C7CE0')
      .text(`تقرير المرتبات - ${month}/${year}`, { align: 'center' });

    doc.moveDown();

    doc.fontSize(10)
      .fillColor('#5a6478')
      .text(`عدد الموظفين: ${payrolls.length}`, { align: 'right' })
      .text(`إجمالي الصافي: ${payrolls.reduce((s, p) => s + (p.netSalary || 0), 0).toLocaleString('ar-EG')} ج.م`, { align: 'right' });

    doc.moveDown();

    const startY = doc.y;
    const rowHeight = 20;

    const columns = [
      { label: 'الاسم', width: 120 },
      { label: 'الوظيفة', width: 90 },
      { label: 'الفرع', width: 90 },
      { label: 'الأساسي', width: 70 },
      { label: 'البدلات', width: 70 },
      { label: 'المكافآت', width: 70 },
      { label: 'الخصومات', width: 70 },
      { label: 'الصافي', width: 80 },
      { label: 'الحالة', width: 60 },
    ];

    let x = 30;
    doc.fontSize(9).fillColor('#ffffff');

    doc.rect(30, startY, 750, rowHeight).fill('#7C7CE0');

    columns.forEach((col) => {
      doc.fillColor('#ffffff')
        .text(col.label, x + 5, startY + 5, { width: col.width - 10, align: 'center' });
      x += col.width;
    });

    let y = startY + rowHeight;

    payrolls.forEach((p, i) => {
      x = 30;

      if (i % 2 === 0) {
        doc.rect(30, y, 750, rowHeight).fill('#f5f7fa');
      }

      const statusLabels = { draft: 'مسودة', approved: 'معتمد', paid: 'مدفوع' };

      const row = [
        p.user?.name || '-',
        p.user?.position || '-',
        p.branch?.name || '-',
        (p.basicSalary || 0).toLocaleString('ar-EG'),
        (p.totalAllowances || 0).toLocaleString('ar-EG'),
        (p.totalBonuses || 0).toLocaleString('ar-EG'),
        (p.totalDeductions || 0).toLocaleString('ar-EG'),
        (p.netSalary || 0).toLocaleString('ar-EG'),
        statusLabels[p.status] || p.status,
      ];

      columns.forEach((col, j) => {
        doc.fillColor('#0a1f44')
          .fontSize(8)
          .text(row[j], x + 5, y + 6, { width: col.width - 10, align: 'center' });
        x += col.width;
      });

      y += rowHeight;

      if (y > doc.page.height - 50) {
        doc.addPage();
        y = 30;
      }
    });

    doc.moveDown(2);
    doc.fontSize(11)
      .fillColor('#7C7CE0')
      .text(`الإجمالي الصافي: ${payrolls.reduce((s, p) => s + (p.netSalary || 0), 0).toLocaleString('ar-EG')} ج.م`, { align: 'right' });

    doc.end();
  } catch (err) {
    console.error('PDF export error:', err);
    res.status(500).json({ msg: err.message });
  }
});

// ==================== استيراد موظفين من Excel ====================
router.post('/import', auth, tenant, checkPermission('users.create'), async (req, res) => {
  try {
    const multer = require('multer');
    const ExcelJS = require('exceljs');
    const bcrypt = require('bcryptjs');

    const upload = multer({ storage: multer.memoryStorage() }).single('file');

    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ msg: 'فشل رفع الملف: ' + err.message });
      }

      if (!req.file) {
        return res.status(400).json({ msg: 'مفيش ملف' });
      }

      try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);

        const sheet = workbook.worksheets[0];
        if (!sheet) {
          return res.status(400).json({ msg: 'الملف مش فيه شيت' });
        }

        const rows = [];
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          rows.push({
            name: row.getCell(1).value,
            email: row.getCell(2).value,
            password: row.getCell(3).value,
            role: row.getCell(4).value,
            branch: row.getCell(5).value,
            phone: row.getCell(6).value,
            position: row.getCell(7).value,
            department: row.getCell(8).value,
            salary: row.getCell(9).value,
          });
        });

        const results = { success: 0, failed: 0, errors: [] };

        for (const row of rows) {
          try {
            if (!row.name || !row.email || !row.password) {
              results.failed++;
              results.errors.push(`صف ${row.name || 'بدون اسم'}: الاسم والبريد والباسورد مطلوبين`);
              continue;
            }

            // ✅ نتأكد إن الإيميل مش مستخدم
            const exists = await User.findOne({ email: row.email });
            if (exists) {
              results.failed++;
              results.errors.push(`${row.email}: البريد مستخدم بالفعل`);
              continue;
            }

            // ✅ نحدد الفرع بالاسم (بنفس الشركة)
            let branchId = null;
            if (row.branch) {
              const branch = await Branch.findOne({
                companyId: req.companyId,   // ← ✅
                name: row.branch,
              });
              if (branch) branchId = branch._id;
            }

            if (!branchId) branchId = req.user.branch;

            const hashed = await bcrypt.hash(String(row.password), 10);

            await User.create({
              companyId: req.companyId,   // ← ✅
              name: row.name,
              email: row.email,
              password: hashed,
              role: row.role || 'employee',
              companyRole: row.role || 'employee',
              branch: branchId,
              phone: row.phone || '',
              position: row.position || '',
              department: row.department || '',
              salary: row.salary || 0,
              active: true,
              createdBy: req.user.id,
            });

            results.success++;
          } catch (rowErr) {
            results.failed++;
            results.errors.push(`${row.email || row.name}: ${rowErr.message}`);
          }
        }

        await logAction({
          req,
          action: 'create',
          resource: 'user',
          description: `استيراد موظفين من Excel: ${results.success} نجح`,
          details: { success: results.success, failed: results.failed },
        });

        res.json({
          msg: `✅ تم استيراد ${results.success} موظف · فشل ${results.failed}`,
          results,
        });
      } catch (parseErr) {
        res.status(500).json({ msg: 'خطأ في قراءة الملف: ' + parseErr.message });
      }
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ==================== تحميل قالب Excel ====================
router.get('/template', auth, tenant, async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('قالب الموظفين');

    sheet.views = [{ rightToLeft: true }];

    const headers = [
      'الاسم', 'البريد الإلكتروني', 'كلمة المرور', 'الدور',
      'الفرع', 'رقم الهاتف', 'المسمى الوظيفي', 'القسم', 'الراتب',
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C7CE0' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    sheet.addRow([
      'أحمد محمد',
      'ahmed@example.com',
      '123456',
      'employee',
      'فرع ملوي',
      '01012345678',
      'محاسب',
      'المالية',
      5000,
    ]);

    sheet.addRow([
      'سارة علي',
      'sara@example.com',
      '123456',
      'hr',
      'الفرع الرئيسي - المنيا',
      '01098765432',
      'أخصائي موارد بشرية',
      'الموارد البشرية',
      7000,
    ]);

    sheet.columns.forEach((col, i) => {
      col.width = [20, 25, 15, 12, 25, 15, 20, 20, 12][i] || 15;
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=users_template.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;