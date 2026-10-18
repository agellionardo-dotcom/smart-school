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

  // ← تحديد الإيميلات الجديدة لكل فرع
  const emailMap = {
    'الفرع الرئيسي - المنيا': 'hr.minia@smart.com',
    'فرع ملوي': 'hr.mallawi@smart.com',
    'فرع بني مزار': 'hr.benimazar@smart.com',
    'فرع المعادي': 'hr.maadi@smart.com',
    'ابو فليو المنيا ': 'hr.abufelio@smart.com',
    'فرع تمريض': 'hr.tamreed@smart.com',
  };

  // ← نجيب كل مستخدمين HR في SMART
  const hrs = await U.find({ companyId: smart._id, companyRole: 'hr' });

  for (const hr of hrs) {
    // ← نجيب اسم الفرع بتاعه
    const branch = await B.findById(hr.branch);
    if (!branch) continue;

    const branchName = branch.name.trim(); // ← شيل المسافات الزيادة
    const newEmail = emailMap[branchName];

    if (newEmail) {
      hr.email = newEmail;
      hr.password = await b.hash('123456', 10);
      await hr.save();
      console.log(`✅ تم تعديل: ${branchName} → ${newEmail}`);
    } else {
      console.log(`⚠️ مفيش إيميل محدد لـ: "${branchName}"`);
    }
  }

  // ← عرض كل مستخدمين HR بعد التعديل
  console.log('\n📋 قائمة HR بعد التعديل:');
  const updatedHrs = await U.find({ companyId: smart._id, companyRole: 'hr' })
    .populate('branch', 'name');
  updatedHrs.forEach(h => {
    console.log(`- ${h.name} | ${h.email} | الفرع: ${h.branch?.name || '—'}`);
  });

  process.exit(0);
});