import axios from 'axios';

// ============================================
// ✅ Base URL — الرابط الصح (9bdf)
// ============================================
const API_URL = 'https://smart-school-production-9bdf.up.railway.app/api';

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

    // ============================================
    // ✅ 401 — الجلسة انتهت
    // ============================================
    if (status === 401) {
      // ✅ نتحقق هل كان فيه token بالفعل
      const hadToken = !!localStorage.getItem('token');

      // ✅ نمسح الـ token والـ user
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // ✅ نعمل redirect بس لو:
      // 1. كان فيه token (يعني جلسة منتهية — مش أول زيارة)
      // 2. إحنا مش على صفحة Login
      // 3. إحنا مش على الصفحة الرئيسية
      // 4. إحنا مش على صفحة نسيان كلمة المرور
      const publicPaths = ['/', '/login', '/forgot-password'];
      const isPublicPath = publicPaths.some((p) =>
        currentPath.startsWith(p)
      );

      if (hadToken && !isPublicPath) {
        window.location.href = '/login';
      }
    }

    // ============================================
    // ✅ 403 — مفيش صلاحية
    // ============================================
    if (status === 403) {
      console.warn('⛔ ليس لديك صلاحية للوصول لهذا المورد');
    }

    // ============================================
    // ✅ 429 — Rate Limit
    // ============================================
    if (status === 429) {
      console.warn('⏳ عدد الطلبات كبير — حاول بعد قليل');
    }

    // ============================================
    // ✅ 500+ — خطأ في السيرفر
    // ============================================
    if (status >= 500) {
      console.error('🔥 خطأ في السيرفر:', error.response?.data);
    }

    return Promise.reject(error);
  }
);

export { API_URL };
export default api;