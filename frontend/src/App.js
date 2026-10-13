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
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Leaves from './pages/Leaves';
import ScanQr from './pages/ScanQr';
import AdminDashboard from './pages/AdminDashboard';
import SyncQueue from './pages/SyncQueue';
import Navbar from './components/Navbar';
import AIChat from './components/AIChat';
import NotificationPermission from './components/NotificationPermission';
import { AnimatedBackground } from './components/ui';
import { startNetworkMonitoring } from './services/networkStatus';
import { syncQueue, syncOnAppOpen } from './services/syncService';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" />;
};

export default function App() {
  const networkListenerRef = useRef(null);
  const isMountedRef = useRef(true);

  // ============================================
  // ✅ الطبقة 2: مزامنة عند فتح التطبيق
  // ============================================
  useEffect(() => {
    isMountedRef.current = true;

    // ✅ ننتظر شوية عشان التطبيق يجهز
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
    }, 3000); // 3 ثواني بعد الفتح

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
            // ✅ نزامن كل الطلبات المعلقة
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
        <AnimatedBackground variant="fluid" />

        <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/dashboard" element={<PrivateRoute><Navbar /><Dashboard /></PrivateRoute>} />
            <Route path="/attendance" element={<PrivateRoute><Navbar /><Attendance /></PrivateRoute>} />
            <Route path="/leaves" element={<PrivateRoute><Navbar /><Leaves /></PrivateRoute>} />
            <Route path="/scan-qr" element={<PrivateRoute><Navbar /><ScanQr /></PrivateRoute>} />
            <Route path="/admin" element={<PrivateRoute><Navbar /><AdminDashboard /></PrivateRoute>} />
            <Route path="/employee/:id" element={<PrivateRoute><Navbar /><EmployeeProfile /></PrivateRoute>} />
            <Route path="/sync-queue" element={<PrivateRoute><Navbar /><SyncQueue /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>

          <AIChat />
          <AdminFloatingButton />
          <NotificationPermission />
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}