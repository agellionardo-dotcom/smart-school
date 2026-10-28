// 📁 frontend/src/App.js
// ⬅️ استبدل الملف بالكامل

import { ThemeProvider } from './contexts/ThemeContext';
import './styles/theme.css';
import './styles/theme-light.css';
import './styles/theme-dark.css';
import './index.css';
import AdminFloatingButton from './components/AdminFloatingButton';
import EmployeeProfile from './pages/EmployeeProfile';
import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Notifications from './pages/Notifications';
import Landing from './pages/Landing';
import SignUp from './pages/SignUp';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Leaves from './pages/Leaves';
import ScanQr from './pages/ScanQr';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SyncQueue from './pages/SyncQueue';
import Profile from './pages/Profile'; // ✅ جديد
import MyPayslips from './pages/MyPayslips'; // ✅ جديد
import Navbar from './components/Navbar';
import AIChat from './components/AIChat';
import NotificationPermission from './components/NotificationPermission';
import InstallPWA from './components/InstallPWA';
import { AnimatedBackground } from './components/ui';
import { startNetworkMonitoring } from './services/networkStatus';
import { syncQueue, syncOnAppOpen, syncPendingAttendance } from './services/syncService';

// ============================================
// ✅ PrivateRoute
// ============================================
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/" />;
  }

  return (
    <>
      <Navbar />
      <NotificationPermission />
      {children}
    </>
  );
};

// ============================================
// ✅ SuperAdminRoute
// ============================================
const SuperAdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    return <Navigate to="/" />;
  }

  if (user.role !== 'superadmin') {
    return <Navigate to="/dashboard" />;
  }

  return (
    <>
      <Navbar />
      <NotificationPermission />
      {children}
    </>
  );
};

export default function App() {
  const networkListenerRef = useRef(null);
  const isMountedRef = useRef(true);

  // ============================================
  // ✅ الطبقة 2: مزامنة عند فتح التطبيق
  // ============================================
  useEffect(() => {
    isMountedRef.current = true;

    const timer = setTimeout(async () => {
      try {
        console.log('[App] 🔄 فحص طلبات معلقة عند الفتح...');
        const result = await syncOnAppOpen();

        if (result.syncedItems?.length > 0) {
          console.log(
            `[App] ✅ تمت مزامنة ${result.success}/${result.total}`
          );
        }
      } catch (err) {
        console.warn('[App] فشل المزامنة عند الفتح:', err);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // ============================================
  // ✅ الطبقة 1: مزامنة عند رجوع الاتصال
  // ============================================
  useEffect(() => {
    const setup = async () => {
      try {
        const handle = await startNetworkMonitoring(async (isConnected) => {
          if (!isMountedRef.current) return;

          console.log('[Network] Connected:', isConnected);

          if (isConnected) {
            try {
              const pendingResult = await syncPendingAttendance({ silent: false });
              if (pendingResult.success > 0) {
                console.log(`[App] ✅ تم رفع ${pendingResult.success} سجل حضور`);
              }
            } catch (err) {
              console.warn('[App] فشل مزامنة الحضور المعلق:', err);
            }

            const result = await syncQueue({ silent: false });

            if (result.total > 0) {
              console.log(
                `[App] 🔄 مزامنة تلقائية: ${result.success}/${result.total}`
              );
            }
          }
        });

        networkListenerRef.current = handle;
      } catch (err) {
        console.warn('Network monitoring setup failed:', err);
      }
    };

    setup();

    return () => {
      isMountedRef.current = false;
      if (
        networkListenerRef.current &&
        typeof networkListenerRef.current.remove === 'function'
      ) {
        networkListenerRef.current.remove();
      }
    };
  }, []);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* ============================================ */}
          {/* Public Routes */}
          {/* ============================================ */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* ============================================ */}
          {/* Private Routes */}
          {/* ============================================ */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <PrivateRoute>
                <Attendance />
              </PrivateRoute>
            }
          />
          <Route
            path="/leaves"
            element={
              <PrivateRoute>
                <Leaves />
              </PrivateRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <PrivateRoute>
                <Notifications />
              </PrivateRoute>
            }
          />
          {/* ✅ جديد: صفحة الملف الشخصي */}
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          {/* ✅ جديد: صفحة قسائم الرواتب */}
          <Route
            path="/my-payslips"
            element={
              <PrivateRoute>
                <MyPayslips />
              </PrivateRoute>
            }
          />
          <Route
            path="/scan-qr"
            element={
              <PrivateRoute>
                <ScanQr />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/employee/:id"
            element={
              <PrivateRoute>
                <EmployeeProfile />
              </PrivateRoute>
            }
          />
          <Route
            path="/sync-queue"
            element={
              <PrivateRoute>
                <SyncQueue />
              </PrivateRoute>
            }
          />

          {/* ============================================ */}
          {/* SuperAdmin Route */}
          {/* ============================================ */}
          <Route
            path="/superadmin"
            element={
              <SuperAdminRoute>
                <SuperAdminDashboard />
              </SuperAdminRoute>
            }
          />

          {/* ============================================ */}
          {/* Fallback */}
          {/* ============================================ */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}