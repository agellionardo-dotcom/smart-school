// ✅ ضبط التوقيت على القاهرة
process.env.TZ = 'Africa/Cairo';

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// ✅ 1. تعريف app/server
const app = express();
const server = http.createServer(app);

// ✅ CORS Whitelist
const ALLOWED_ORIGINS = [
  'https://smart-school-delta-amber.vercel.app',
  'capacitor://localhost',
  'https://localhost',
  'http://localhost',
  'http://localhost:3000',
  'http://localhost:5173',
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error(`❌ CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Company-Id'],
};

const io = new Server(server, { cors: corsOptions });
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

// ✅ trust proxy
app.set('trust proxy', 1);

// ✅ 3. Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());
app.use(hpp());

// ✅ Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '⚠️ عدد الطلبات كبير جدًا' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '⚠️ محاولات تسجيل دخول كثيرة' },
});

const faceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '⚠️ محاولات Face Recognition كثيرة' },
});

app.use('/api', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/face/verify', faceLimiter);
app.use('/api/face/enroll', faceLimiter);

// ✅ 4. MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    console.log('🕐 Timezone:', process.env.TZ || 'default');
    console.log('🕐 Current time:', new Date().toString());
    console.log('🌍 Env:', process.env.NODE_ENV || 'development');
  })
  .catch(err => console.error('❌ MongoDB:', err.message));

// ✅ 5. Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Nabd API',
    version: '2.0.0',
    time: new Date().toISOString(),
  });
});

// ✅ 6. Routes
// ===== SuperAdmin Routes (قبل tenant) =====
app.use('/api/companies', require('./routes/companies'));
app.use('/api/superadmin', require('./routes/superadmin'));

// ===== Regular Routes =====
app.use('/api/reports', require('./routes/reports-v2'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/leaves', require('./routes/leaves'));
app.use('/api/branches', require('./routes/branches'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/qr', require('./routes/qr'));
app.use('/api/emergency', require('./routes/emergency'));
app.use('/api/payroll', require('./routes/payroll'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/face', require('./routes/face'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/audit-logs', require('./routes/auditLogs'));

// ✅ 7. 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: '❌ Route not found',
    path: req.originalUrl,
  });
});

// ✅ 8. Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  const isProd = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    error: isProd ? 'حدث خطأ في السيرفر' : err.message,
    ...(isProd ? {} : { stack: err.stack }),
  });
});

// ✅ 9. تشغيل السيرفر
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server on http://0.0.0.0:${PORT}`);
  console.log(`🕐 Server time: ${new Date().toLocaleString('ar-EG')}`);
});

// ✅ 10. Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
});