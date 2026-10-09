// ✅ ضبط التوقيت على القاهرة (لازم يكون أول سطر قبل أي require)
process.env.TZ = 'Africa/Cairo';

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// ✅ 1. تعريف app/server أولاً
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const onlineUsers = new Map();

// ✅ 2. WebSocket
io.on('connection', (socket) => {
  socket.on('register', (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;
  });
  socket.on('disconnect', () => {
    if (socket.userId) onlineUsers.delete(socket.userId);
  });
});

app.set('io', io);
app.set('onlineUsers', onlineUsers);

// ✅ 3. Middlewares
app.use(cors());
app.use(express.json());

// ✅ 4. MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    console.log('🕐 Timezone:', process.env.TZ || 'default');
    console.log('🕐 Current time:', new Date().toString());
  })
  .catch(err => console.error('❌ MongoDB:', err.message));

// ✅ 5. Routes
app.use('/api/reports', require('./routes/reports'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/leaves', require('./routes/leaves'));
app.use('/api/branches', require('./routes/branches'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/qr', require('./routes/qr'));
app.use('/api/emergency', require('./routes/emergency'));
app.use('/api/payroll', require('./routes/payroll'));
app.use('/api/announcements', require('./routes/announcements'));
// ✅ ضيف السطر ده مع باقي الـ routes
app.use('/api/ai', require('./routes/ai'));
// ✅ 6. تشغيل السيرفر (في النهاية)
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server on http://0.0.0.0:${PORT}`);
  console.log(`🕐 Server time: ${new Date().toLocaleString('ar-EG')}`);
});