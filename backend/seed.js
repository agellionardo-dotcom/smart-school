const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Branch = require('./models/Branch');
const User = require('./models/User');

(async () => {
  require('dotenv').config();
await mongoose.connect(process.env.MONGO_URI);
  await Branch.deleteMany({});
  await User.deleteMany({});

  const main = await Branch.create({
    name: 'الفرع الرئيسي - المنيا', type: 'main',
    location: { lat: 28.1099, lng: 30.7503 }, radius: 7
  });

  await Branch.create([
    { name: 'فرع بني مزار', type: 'sub', parent: main._id, location: { lat: 28.5033, lng: 30.8012 }, radius: 5 },
    { name: 'فرع ملوي', type: 'sub', parent: main._id, location: { lat: 27.7328, lng: 30.8419 }, radius: 5 },
    { name: 'فرع المعادي', type: 'sub', parent: main._id, location: { lat: 29.9603, lng: 31.2500 }, radius: 5 }
  ]);

  const hashed = await bcrypt.hash('admin123', 10);
  await User.create({
    name: 'مدير النظام', email: 'admin@smart.com',
    password: hashed, role: 'superadmin', branch: main._id
  });

  console.log('✅ تم إنشاء الفروع والمدير');
  process.exit();
})();