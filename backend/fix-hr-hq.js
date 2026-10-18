const m = require('mongoose');
require('dotenv').config();

m.connect(process.env.MONGO_URI).then(async () => {
  const U = require('./models/User');
  const B = require('./models/Branch');
  const C = require('./models/Company');

  const smart = await C.findOne({ slug: 'smart' });
  const hq = await B.findOne({ companyId: smart._id, type: 'main' });
  if (!hq) {
    console.log('❌ الفرع الرئيسي مش موجود');
    process.exit(0);
  }

  console.log('الفرع الرئيسي:', hq.name, '|', hq._id);

  // ← جيب HR المنيا
  const hr = await U.findOne({ email: 'hr.minia@smart.com' });
  if (!hr) {
    console.log('❌ HR المنيا مش موجود');
    process.exit(0);
  }

  console.log('HR الحالي:', hr.name);
  console.log('HR Branch (قبل):', hr.branch);

  // ← اربطه بالفرع الرئيسي
  hr.branch = hq._id;
  await hr.save();

  console.log('HR Branch (بعد):', hr.branch);
  console.log('✅ تم ربط HR المنيا بالفرع الرئيسي');

  process.exit(0);
});