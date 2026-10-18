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

  // ← امسح أي HR إيميله إنجليزي (عشان نضيفهم من جديد)
  const r = await U.deleteMany({
    companyId: smart._id,
    companyRole: 'hr',
    email: /@smart\.com$/,
  });

  console.log('✅ تم مسح HR الإنجليزي:', r.deletedCount);

  // ← اعرض المستخدمين المتبقيين
  const users = await U.find({ companyId: smart._id }).select('name email role companyRole');
  console.log('\n📋 مستخدمين SMART المتبقيين:');
  users.forEach(u => {
    console.log(`- ${u.name} | ${u.email} | Role: ${u.role} | CompanyRole: ${u.companyRole}`);
  });

  process.exit(0);
});