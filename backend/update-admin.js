// 📁 backend/update-admin.js
// ⬅️ ملف مؤقت (امسحه بعد الاستخدام)

const m = require('mongoose');
const b = require('bcryptjs');
require('dotenv').config();

m.connect(process.env.MONGO_URI).then(async () => {
  const U = require('./models/User');
  const newEmail = 'saadzaghloulmahrous@gmail.com';
  const newPassword = 'Asd1234Asd@@'; // ← غيّر الباسورد ده

  const hashed = await b.hash(newPassword, 10);

  const r = await U.updateOne(
    { email: 'admin@nabd.com' },
    {
      $set: {
        email: newEmail.toLowerCase(),
        password: hashed,
        role: 'superadmin',
        companyId: null,
        companyRole: null,
      },
    }
  );

  console.log('✅ Updated:', r.modifiedCount);
  console.log('   Email:', newEmail);
  console.log('   Password:', newPassword);
  process.exit(0);
});