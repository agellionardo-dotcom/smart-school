const m = require('mongoose');
require('dotenv').config();

m.connect(process.env.MONGO_URI).then(async () => {
  const U = require('./models/User');
  const u = await U.findOne({ email: 'saadzaghloulmahrous@gmail.com' }).select('name email role companyRole companyId');
  console.log('حساب المنصة:', u);
  process.exit(0);
});