// ============================================
// ✅ Migration Script: Single-tenant → Multi-tenant
// ============================================
// يحول البيانات الحالية لبنية Multi-tenant
// - ✅ يعمل Backup تلقائي أولاً
// - ينشئ شركة SMART
// - يربط كل المستخدمين بـ SMART
// - يربط كل البيانات بـ SMART
// ============================================

process.env.TZ = 'Africa/Cairo';

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Models
const Company = require('../models/Company');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Payroll = require('../models/Payroll');
const Announcement = require('../models/Announcement');
const Document = require('../models/Document');
const Emergency = require('../models/Emergency');
const Settings = require('../models/Settings');
const AuditLog = require('../models/AuditLog');

// ============================================
// ✅ إعدادات الشركة الداخلية (SMART)
// ============================================
const SMART_COMPANY = {
  name: 'SMART For Computer & Electronics',
  slug: 'smart',
  type: 'internal',
  description: 'الشركة الأم — Nabd Platform',
  contactEmail: 'saadzaghloulmahrous@gmail.com',
  settings: {
    workStartTime: '08:00',
    workEndTime: '14:00',
    lateGraceMinutes: 15,
    weekendDays: [5, 6],
    timezone: 'Africa/Cairo',
    currency: 'EGP',
    language: 'ar',
  },
  subscription: {
    plan: 'internal',
    status: 'active',
    isTrial: false,
    startDate: new Date(),
    endDate: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000),
    maxEmployees: 999999,
    maxBranches: 999999,
    maxStorage: 999999,
    features: [
      'attendance',
      'leaves',
      'announcements',
      'qr',
      'payroll',
      'face',
      'documents',
      'reports',
      'ai',
      'emergency',
    ],
    billing: {
      amount: 0,
      currency: 'EGP',
      cycle: 'monthly',
    },
  },
  active: true,
  notes: 'الشركة الأصلية — تم الترقية لـ Multi-tenant',
};

// ============================================
// ✅ Helper: طباعة
// ============================================
function log(emoji, msg) {
  console.log(`${emoji} ${msg}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(50));
  console.log(`   ${title}`);
  console.log('='.repeat(50));
}

// ============================================
// ✅ 0. Backup تلقائي
// ============================================
async function backupAllData() {
  logSection('0. Backup تلقائي');

  const backupDir = path.join(
    __dirname,
    '..',
    `backup-${new Date().toISOString().replace(/:/g, '-').split('.')[0]}`
  );

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const collections = [
    'users',
    'attendances',
    'leaves',
    'payrolls',
    'announcements',
    'branches',
    'documents',
    'emergencies',
    'settings',
    'auditlogs',
  ];

  let totalDocs = 0;

  for (const coll of collections) {
    try {
      const data = await mongoose.connection.db
        .collection(coll)
        .find({})
        .toArray();

      const filePath = path.join(backupDir, `${coll}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

      totalDocs += data.length;
      log('✅', `${coll}: ${data.length} documents`);
    } catch (err) {
      log('⚠️', `${coll}: ${err.message}`);
    }
  }

  log('📦', `Backup saved to: ${backupDir}`);
  log('📊', `Total documents: ${totalDocs}`);

  return backupDir;
}

// ============================================
// ✅ Main Migration Function
// ============================================
async function migrate() {
  try {
    log('🚀', 'بدء عملية الترقية إلى Multi-tenant...\n');

    // ============================================
    // 1. الاتصال بـ MongoDB
    // ============================================
    logSection('1. الاتصال بـ MongoDB');

    if (!process.env.MONGO_URI) {
      log('❌', 'MONGO_URI غير موجود في .env');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    log('✅', 'MongoDB Connected');

    // ============================================
    // 2. Backup تلقائي
    // ============================================
    await backupAllData();

    // ============================================
    // 3. فحص إذا فيه شركات موجودة
    // ============================================
    logSection('2. فحص البيانات الحالية');
    const existingCompanies = await Company.countDocuments();

    if (existingCompanies > 0) {
      log('⚠️', `لقيت ${existingCompanies} شركة موجودة بالفعل`);
    } else {
      log('✅', 'مفيش شركات موجودة — يلا نبدأ');
    }

    // ============================================
    // 4. إنشاء شركة SMART
    // ============================================
    logSection('3. إنشاء شركة SMART');

    let smartCompany = await Company.findOne({ slug: 'smart' });

    if (smartCompany) {
      log('ℹ️', `شركة SMART موجودة بالفعل: ${smartCompany._id}`);
    } else {
      smartCompany = await Company.create(SMART_COMPANY);
      log('✅', `تم إنشاء شركة SMART: ${smartCompany._id}`);
    }

    const smartId = smartCompany._id;

    // ============================================
    // 5. تحديث المستخدمين
    // ============================================
    logSection('4. تحديث المستخدمين');

    const usersResult = await User.updateMany(
      { companyId: { $exists: false } },
      {
        $set: {
          companyId: smartId,
          companyRole: 'employee',
        },
      }
    );
    log('✅', `تم تحديث ${usersResult.modifiedCount} مستخدم`);

    // ترقية سعد
    const ownerResult = await User.updateOne(
      { email: 'saadzaghloulmahrous@gmail.com' },
      {
        $set: {
          companyId: smartId,
          role: 'superadmin',
          companyRole: 'company_owner',
        },
      }
    );
    if (ownerResult.modifiedCount > 0) {
      log('✅', 'تم ترقية سعد لـ SuperAdmin + Company Owner');
    }

    // أحمد HR
    await User.updateOne(
      { email: 'gem_gem743@yahoo.com' },
      { $set: { companyId: smartId, companyRole: 'hr' } }
    );
    log('✅', 'تم تحديد دور HR لأحمد');

    // ============================================
    // 6. ربط الـ Owner بالشركة
    // ============================================
    logSection('5. ربط الـ Owner');

    const owner = await User.findOne({
      email: 'saadzaghloulmahrous@gmail.com',
    });
    if (owner && !smartCompany.ownerId) {
      smartCompany.ownerId = owner._id;
      await smartCompany.save();
      log('✅', `تم ربط ${owner.name} كـ Owner للشركة`);
    }

    // ============================================
    // 7. تحديث باقي الـ Collections
    // ============================================
    logSection('6. تحديث باقي الـ Collections');

    const collections = [
      { Model: Branch, name: 'Branch' },
      { Model: Attendance, name: 'Attendance' },
      { Model: Leave, name: 'Leave' },
      { Model: Payroll, name: 'Payroll' },
      { Model: Announcement, name: 'Announcement' },
      { Model: Document, name: 'Document' },
      { Model: Emergency, name: 'Emergency' },
      { Model: AuditLog, name: 'AuditLog' },
    ];

    for (const { Model, name } of collections) {
      try {
        const result = await Model.updateMany(
          { companyId: { $exists: false } },
          { $set: { companyId: smartId } }
        );
        log('✅', `${name}: ${result.modifiedCount} عنصر`);
      } catch (err) {
        log('⚠️', `${name}: ${err.message}`);
      }
    }

    // ============================================
    // 8. إنشاء Settings
    // ============================================
    logSection('7. إنشاء Settings');

    let settings = await Settings.findOne({ companyId: smartId });
    if (!settings) {
      settings = await Settings.create({
        companyId: smartId,
        schoolName: SMART_COMPANY.name,
        workStartTime: '08:00',
        workEndTime: '14:00',
        lateGraceMinutes: 15,
        weekendDays: [5, 6],
        enableQRCode: true,
        enableFaceRecognition: true,
        enableGeoFence: true,
      });
      log('✅', `تم إنشاء Settings: ${settings._id}`);
    } else {
      log('ℹ️', 'Settings موجودة بالفعل');
    }

    // ============================================
    // 9. تحديث الإحصائيات
    // ============================================
    logSection('8. تحديث الإحصائيات');

    const usersCount = await User.countDocuments({ companyId: smartId });
    const branchesCount = await Branch.countDocuments({ companyId: smartId });

    smartCompany.stats = {
      totalUsers: usersCount,
      totalBranches: branchesCount,
      lastActivityAt: new Date(),
    };
    await smartCompany.save();

    log('✅', `المستخدمين: ${usersCount}`);
    log('✅', `الفروع: ${branchesCount}`);

    // ============================================
    // 10. ملخص
    // ============================================
    logSection('✅ تمت الترقية بنجاح');

    console.log(`\n📊 الملخص:`);
    console.log(`   🏢 الشركة: ${smartCompany.name}`);
    console.log(`   🆔 ID: ${smartCompany._id}`);
    console.log(`   🔗 Slug: ${smartCompany.slug}`);
    console.log(`   📦 النوع: ${smartCompany.type}`);
    console.log(`   💎 الخطة: ${smartCompany.subscription.plan}`);
    console.log(`   👥 المستخدمين: ${usersCount}`);
    console.log(`   🏢 الفروع: ${branchesCount}`);

    console.log('\n🎯 الخطوة الجاية:');
    console.log('   1. جرّب تسجيل دخول كـ SuperAdmin');
    console.log('   2. جرّب إضافة شركة جديدة من /api/companies');

    console.log('\n✨ تم بنجاح!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ خطأ في الترقية:');
    console.error(err);
    process.exit(1);
  }
}

// ============================================
// ✅ التشغيل
// ============================================
migrate();