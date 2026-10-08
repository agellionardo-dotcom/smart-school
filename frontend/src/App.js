import EmployeeProfile from './pages/EmployeeProfile';
import React, { useEffect } from 'react';
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
import { startNetworkMonitoring } from './services/networkStatus';
import { getQueue, removeFromQueue } from './services/offlineStorage';
import axios from 'axios';
import { API_URL } from './api';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" />;
};

export default function App() {
  // ============================================================
  // Network Monitoring + Auto Sync (Global)
  // ============================================================
  useEffect(() => {
    const listener = startNetworkMonitoring(async (isConnected) => {
      console.log('[Network] Connected:', isConnected);
      if (isConnected) {
        // مزامنة الطلبات المؤجلة
        const queue = await getQueue();
        if (queue.length > 0) {
          console.log(`[Sync] Syncing ${queue.length} items...`);
          const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
          for (const item of queue) {
            try {
              const endpoint = item.type === 'checkin' ? 'checkin' : 'checkout';
              await axios.post(
                `${API_URL}/api/attendance/${endpoint}`,
                { lat: item.lat, lng: item.lng },
                { headers }
              );
              await removeFromQueue(item.id);
              console.log(`[Sync] ✅ ${item.type}`);
            } catch (e) {
              console.warn(`[Sync] ❌ ${item.type}`, e.message);
            }
          }
        }
      }
    });

    return () => {
      if (listener && listener.remove) listener.remove();
    };
  }, []);

  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}