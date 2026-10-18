const m = require('mongoose');
const b = require('bcryptjs');
require('dotenv').config();

m.connect(process.env.MONGO_URI).then(async () => {
  const U = require('./models/User');
  const B = require('./models/Branch');
  const C = require('./models/Company');

  const smart = await C.findOne({ slug: 'smart' });
  if (!smart) {
    console.log('❌ شركة SMART مش موجودة');
    process.exit(0);
  }

  const branches = await B.find({ companyId: smart._id });

  // ← إيميلات إنجليزية لكل فرع
  const emailMap = {
    'الفرع الرئيسي - المنيا': 'hr.minia@smart.com',
    'فرع ملوي': 'hr.mallawi@smart.com',
    'فرع بني مزار': 'hr.benimazar@smart.com',
    'فرع المعادي': 'hr.maadi@smart.com',
    'ابو فليو المنيا ': 'hr.abufelio@smart.com',
    'فرع تمريض': 'hr.tamreed@smart.com',
  };

  for (const branch of branches) {
    const branchName = branch.name.trim();
    const email = emailMap[branchName];

    if (!email) {
      console.log(`⚠️ مفيش إيميل محدد لـ: "${branchName}"`);
      continue;
    }

    // ← نتأكد إن الإيميل مش مستخدم
    const existing = await U.findOne({ email });
    if (existing) {
      console.log(`ℹ️ HR موجود بالفعل: ${email}`);
      continue;
    }

    const hashed = await b.hash('123456', 10);
    await U.create({
      companyId: smart._id,
      name: `HR ${branchName}`,
      email: email,
      password: hashed,
      role: 'hr',
      companyRole: 'hr',
      branch: branch._id,
      active: true,
    });

    console.log(`✅ تم إضافة HR: ${email} | الفرع: ${branchName}`);
  }

  // ← عرض كل المستخدمين بعد الإضافة
  console.log('\n📋 مستخدمين SMART بعد الإضافة:');
  const users = await U.find({ companyId: smart._id }).populate('branch', 'name');
  users.forEach(u => {
    console.log(`- ${u.name} | ${u.email} | Role: ${u.role} | CompanyRole: ${u.companyRole} | الفرع: ${u.branch?.name || '—'}`);
  });

  process.exit(0);
});