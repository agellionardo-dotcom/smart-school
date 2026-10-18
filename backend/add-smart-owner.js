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

  // ← 2. شوف لو فيه حساب Company Owner موجود
  const existingOwner = await U.findOne({
    companyId: smart._id,
    companyRole: 'company_owner',
  });

  if (existingOwner) {
    console.log('✅ فيه Company Owner بالفعل:', existingOwner.email);
    process.exit(0);
  }

  // ← 3. اعمل حساب Company Owner جديد
  const hashed = await b.hash('Smart@2026', 10);
  const newOwner = await U.create({
    companyId: smart._id,
    name: 'SMART Admin',
    email: 'smart.admin@nabd.com',
    password: hashed,
    role: 'employee',
    companyRole: 'company_owner',
    active: true,
  });

  console.log('✅ تم إنشاء Company Owner جديد لشركة SMART:');
  console.log('   الاسم: SMART Admin');
  console.log('   الإيميل: smart.admin@nabd.com');
  console.log('   الباسورد: Smart@2026');

  process.exit(0);
});