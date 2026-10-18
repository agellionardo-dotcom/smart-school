const m = require('mongoose');
require('dotenv').config();

m.connect(process.env.MONGO_URI).then(async () => {
  const U = require('./models/User');
  const C = require('./models/Company');

  const smart = await C.findOne({ slug: 'smart' });
  if (!smart) {
    console.log('❌ شركة SMART مش موجودة');
    process.exit(0);
  }

  // ← امسح أي حساب إيميله سعد في شركة SMART
  const r = await U.deleteMany({
    companyId: smart._id,
    email: 'saadzaghloulmahrous@gmail.com',
  });

  console.log('✅ تم مسح الحساب المكرر من SMART:', r.deletedCount);

  // ← اعرض كل مستخدمين SMART للتأكد
  const users = await U.find({ companyId: smart._id }).select('name email role companyRole');
  console.log('\n📋 مستخدمين SMART بعد التنظيف:');
  users.forEach(u => {
    console.log(`- ${u.name} | ${u.email} | Role: ${u.role} | CompanyRole: ${u.companyRole}`);
  });

  process.exit(0);
});