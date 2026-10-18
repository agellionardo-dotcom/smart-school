const m = require('mongoose');
const b = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

m.connect(process.env.MONGO_URI).then(async () => {
  const C = require('./models/Company');
  const U = require('./models/User');
  const B = require('./models/Branch');

  // ← اسم ملف الـ Backup
  const backupFile = 'smart-backup-1792357097491.json';
  const filePath = path.join(__dirname, backupFile);

  if (!fs.existsSync(filePath)) {
    console.log('❌ ملف الـ Backup مش موجود:', backupFile);
    console.log('   تأكد إن الملف موجود في مجلد backend');
    process.exit(0);
  }

  const backup = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const newCompanyName = 'SMART For Computer & Electronics';
  const newSlug = 'smart';

  const existing = await C.findOne({ slug: newSlug });
  if (existing) {
    console.log('❌ الـ slug مستخدم بالفعل:', newSlug);
    process.exit(0);
  }

  // ← إضافة الشركة
  const companyData = {
    ...backup.company,
    _id: undefined,
    name: newCompanyName,
    slug: newSlug,
    createdAt: undefined,
    updatedAt: undefined,
  };

  const newCompany = await C.create(companyData);
  console.log('✅ تم إضافة الشركة:', newCompany.name);
  console.log('   - ID:', newCompany._id);

  // ← إضافة المستخدمين
  for (const u of backup.users) {
    const userData = {
      ...u,
      _id: undefined,
      companyId: newCompany._id,
      createdAt: undefined,
      updatedAt: undefined,
    };
    userData.password = await b.hash('Smart@2026', 10);
    await U.create(userData);
  }
  console.log('✅ تم إضافة المستخدمين:', backup.users.length);

  // ← إضافة الفروع
  for (const br of backup.branches) {
    const branchData = {
      ...br,
      _id: undefined,
      companyId: newCompany._id,
      createdAt: undefined,
      updatedAt: undefined,
    };
    await B.create(branchData);
  }
  console.log('✅ تم إضافة الفروع:', backup.branches.length);

  console.log('\n🎉 تم استرجاع شركة SMART بالكامل!');
  process.exit(0);
});