import axios from 'axios';

// ============================================
// ✅ Base URL
// لاحظ: /api في الآخر عشان نستخدمه في كل الـ requests
// ============================================
const API_URL = 'https://smart-school-production-fb82.up.railway.app/api';

// ============================================
// ✅ Axios Instance
// ============================================
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 ثانية
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

    // 401 — الجلسة انتهت
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (currentPath !== '/login') {
        window.location.href = '/login';
      }
    }

    // 403 — مفيش صلاحية
    if (status === 403) {
      console.warn('⛔ ليس لديك صلاحية للوصول لهذا المورد');
    }

    // 500+ — خطأ في السيرفر
    if (status >= 500) {
      console.error('🔥 خطأ في السيرفر:', error.response?.data);
    }

    return Promise.reject(error);
  }
);

export { API_URL };
export default api;