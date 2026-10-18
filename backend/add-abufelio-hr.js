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

  // ← جيب فرع "ابو فليو" بالبحث الجزئي
  const branch = await B.findOne({
    companyId: smart._id,
    name: { $regex: 'ابو فليو', $options: 'i' },
  });

  if (!branch) {
    console.log('❌ فرع "ابو فليو" مش موجود');
    process.exit(0);
  }

  console.log('الفرع:', branch.name);

  const email = 'hr.abufelio@smart.com';
  const existing = await U.findOne({ email });
  if (existing) {
    console.log('ℹ️ HR موجود بالفعل:', email);
    process.exit(0);
  }

  const hashed = await b.hash('123456', 10);
  await U.create({
    companyId: smart._id,
    name: 'HR ابو فليو المنيا',
    email: email,
    password: hashed,
    role: 'hr',
    companyRole: 'hr',
    branch: branch._id,
    active: true,
  });

  console.log('✅ تم إضافة HR:', email);
  process.exit(0);
});