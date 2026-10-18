const m = require('mongoose');
const b = require('bcryptjs');
require('dotenv').config();

m.connect(process.env.MONGO_URI).then(async () => {
  const U = require('./models/User');
  const C = require('./models/Company');

  // ← 1. جيب شركة SMART
  const smart = await C.findOne({ slug: 'smart' });
  if (!smart) {
    console.log('❌ شركة SMART مش موجودة');
    process.exit(0);
  }

  // ← 2. جيب حساب الـ Company Owner بتاع SMART
  const smartAdmin = await U.findOne({
    companyId: smart._id,
    companyRole: 'company_owner',
  });

  if (!smartAdmin) {
    console.log('❌ مفيش Company Owner في SMART');
    process.exit(0);
  }

  console.log('الحساب الحالي في SMART:', smartAdmin.email, '|', smartAdmin.name);

  // ← 3. لو إيميله هو نفسه بتاع المنصة، غيره
  if (smartAdmin.email === 'saadzaghloulmahrous@gmail.com') {
    smartAdmin.email = 'smart.admin@nabd.com';
    smartAdmin.password = await b.hash('Smart@2026', 10);
    await smartAdmin.save();
    console.log('✅ تم تغيير إيميل SMART Admin:');
    console.log('   الإيميل الجديد: smart.admin@nabd.com');
    console.log('   الباسورد الجديد: Smart@2026');
  } else {
    console.log('ℹ️ إيميل SMART Admin مختلف بالفعل:', smartAdmin.email);
  }

  process.exit(0);
});