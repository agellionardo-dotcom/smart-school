// 📁 frontend/src/api.js
// ⬅️ استبدل الملف بالكامل

import axios from 'axios';

// ============================================
// ✅ Base URL — ذكي: localhost في التطوير، Railway في Production
// ============================================
const isDev =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

const API_URL = isDev
  ? 'http://localhost:5000/api'                                  // ← محلي (تطوير)
  : 'https://smart-school-production-9bdf.up.railway.app/api';   // ← Railway (production)

// ============================================
// ✅ Axios Instance
// ============================================
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// ============================================
// ✅ Request Interceptor — إضافة التوكن تلقائياً
// ============================================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================
// ✅ Response Interceptor — معالجة الأخطاء
// ============================================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const currentPath = window.location.pathname;

    // ✅ 401 — الجلسة انتهت
    if (status === 401) {
      const hadToken = !!localStorage.getItem('token');

      localStorage.removeItem('token');
      localStorage.removeItem('user');

      const publicPaths = ['/', '/login', '/forgot-password'];
      const isPublicPath = publicPaths.some((p) => currentPath.startsWith(p));

      if (hadToken && !isPublicPath) {
        window.location.href = '/login';
      }
    }

    if (status === 403) {
      console.warn('⛔ ليس لديك صلاحية للوصول لهذا المورد');
    }

    if (status === 429) {
      console.warn('⏳ عدد الطلبات كبير — حاول بعد قليل');
    }

    if (status >= 500) {
      console.error('🔥 خطأ في السيرفر:', error.response?.data);
    }

    return Promise.reject(error);
  }
);

export { API_URL };
export default api;