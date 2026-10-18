const m = require('mongoose');
const b = require('bcryptjs');
require('dotenv').config();

m.connect(process.env.MONGO_URI).then(async () => {
  const U = require('./models/User');
  const B = require('./models/Branch');
  const C = require('./models/Company');

  const smart = await C.findOne({ slug: 'smart' });
  if (!smart) {
    console.log('❌ شركة SMART مش موجودة (شغّل restore-smart.js الأول)');
    process.exit(0);
  }

  const branches = await B.find({ companyId: smart._id });
  console.log('📋 الفروع:', branches.map(b => b.name));

  for (const branch of branches) {
    const email = `hr.${branch.slug || branch.name.replace(/\s/g, '')}@smart.com`;
    const existing = await U.findOne({ email });
    
    if (!existing) {
      const hashed = await b.hash('123456', 10);
      await U.create({
        companyId: smart._id,
        name: `HR ${branch.name}`,
        email: email,
        password: hashed,
        role: 'hr',
        companyRole: 'hr',
        branch: branch._id,
        active: true,
      });
      console.log('✅ تم إضافة HR:', email, '| الفرع:', branch.name);
    } else {
      console.log('ℹ️ HR موجود بالفعل:', email);
    }
  }

  process.exit(0);
});