import ScanQr from './pages/ScanQr';
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Leaves from './pages/Leaves';
import AdminDashboard from './pages/AdminDashboard';
import Navbar from './components/Navbar';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" />;
};

export default function App() {
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
      </Routes>
    </BrowserRouter>
  );
}