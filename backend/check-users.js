const m = require('mongoose');
require('dotenv').config();

m.connect(process.env.MONGO_URI).then(async () => {
  const U = require('./models/User');
  const users = await U.find().select('name email role companyRole companyId');
  console.log('كل المستخدمين في الداتابيز:');
  users.forEach(u => {
    console.log(`- ${u.name} | ${u.email} | Role: ${u.role} | CompanyRole: ${u.companyRole} | CompanyId: ${u.companyId || 'null (المنصة)'}`);
  });
  process.exit(0);
});