@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Creating index.js...
(
echo import React from 'react';
echo import ReactDOM from 'react-dom/client';
echo import './index.css';
echo import App from './App';
echo.
echo const root = ReactDOM.createRoot^(document.getElementById^('root'^)^);
echo root.render^(^<App /^>^);
) > index.js

echo Creating index.css...
(
echo :root {
echo   --navy: #0a1f44;
echo   --navy-light: #142b5c;
echo   --gray: #8b95a7;
echo   --gray-light: #d1d7e0;
echo   --bg: #eef1f7;
echo }
echo * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Cairo', 'Segoe UI', sans-serif; }
echo body { background: linear-gradient^(135deg, var(--bg^), #c8d0e0^); min-height: 100vh; direction: rtl; }
echo .glass { background: rgba^(255,255,255,0.75^); backdrop-filter: blur^(20px^); border-radius: 24px; box-shadow: 0 20px 60px rgba^(10,31,68,0.15^); }
echo .btn { padding: 14px 32px; border: none; border-radius: 14px; background: linear-gradient^(145deg, var(--navy^), var(--navy-light^)^); color: #fff; font-weight: 700; font-size: 16px; cursor: pointer; box-shadow: 6px 6px 16px rgba^(10,31,68,0.35^); transition: all 0.25s; }
echo .btn:hover { transform: translateY^(-3px^); }
echo .btn.gray { background: linear-gradient^(145deg, #9aa4b8, #7b869c^); }
echo .input { width: 100%%; padding: 14px 18px; border-radius: 12px; border: 2px solid var^(--gray-light^); background: #fff; font-size: 15px; outline: none; }
echo .input:focus { border-color: var^(--navy^); }
echo .dashboard { padding: 30px; max-width: 1200px; margin: 0 auto; }
echo .grid { display: grid; gap: 24px; grid-template-columns: repeat^(auto-fit, minmax^(240px, 1fr^)^); }
echo .stat-card { padding: 28px; text-align: center; background: linear-gradient^(145deg, var(--navy^), var(--navy-light^)^); color: #fff; border-radius: 20px; box-shadow: 0 15px 35px rgba^(10,31,68,0.4^); }
echo .stat-card h3 { font-size: 42px; margin-bottom: 8px; }
echo .stat-card p { color: var^(--gray-light^); font-size: 15px; }
echo .navbar { display: flex; justify-content: space-between; align-items: center; padding: 18px 40px; background: linear-gradient^(90deg, var(--navy^), var(--navy-light^)^); color: #fff; }
echo .navbar a { color: #fff; margin: 0 12px; text-decoration: none; font-weight: 600; }
echo .navbar a:hover { color: var^(--gray-light^); }
echo table { width: 100%%; border-collapse: collapse; margin-top: 20px; }
echo th, td { padding: 14px; text-align: right; border-bottom: 1px solid var^(--gray-light^); }
echo th { background: var^(--navy^); color: #fff; }
echo tr:hover { background: rgba^(10,31,68,0.05^); }
) > index.css

echo Creating App.js...
(
echo import React from 'react';
echo import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
echo import Login from './pages/Login';
echo import Dashboard from './pages/Dashboard';
echo import Attendance from './pages/Attendance';
echo import Leaves from './pages/Leaves';
echo import Navbar from './components/Navbar';
echo.
echo const PrivateRoute = ^({ children }^) =^> {
echo   const token = localStorage.getItem^('token'^);
echo   return token ? children : ^<Navigate to="/" /^>;
echo };
echo.
echo export default function App^(^) {
echo   return ^(
echo     ^<BrowserRouter^>
echo       ^<Routes^>
echo         ^<Route path="/" element={^<Login /^>} /^>
echo         ^<Route path="/dashboard" element={^<PrivateRoute^>^<Navbar /^>^<Dashboard /^>^</PrivateRoute^>} /^>
echo         ^<Route path="/attendance" element={^<PrivateRoute^>^<Navbar /^>^<Attendance /^>^</PrivateRoute^>} /^>
echo         ^<Route path="/leaves" element={^<PrivateRoute^>^<Navbar /^>^<Leaves /^>^</PrivateRoute^>} /^>
echo       ^</Routes^>
echo     ^</BrowserRouter^>
echo   ^);
echo }
) > App.js

echo Creating Navbar component...
if not exist components mkdir components
(
echo import React from 'react';
echo import { Link, useNavigate } from 'react-router-dom';
echo.
echo export default function Navbar^(^) {
echo   const nav = useNavigate^(^);
echo   const logout = ^(^) =^> { localStorage.clear^(^); nav^('/'^); };
echo   return ^(
echo     ^<nav className="navbar"^>
echo       ^<h2^>🎓 Smart School^</h2^>
echo       ^<div^>
echo         ^<Link to="/dashboard"^>الرئيسية^</Link^>
echo         ^<Link to="/attendance"^>الحضور^</Link^>
echo         ^<Link to="/leaves"^>الإجازات^</Link^>
echo         ^<button className="btn gray" style={{ padding: '8px 20px', fontSize: 14 }} onClick={logout}^>خروج^</button^>
echo       ^</div^>
echo     ^</nav^>
echo   ^);
echo }
) > components\Navbar.jsx

echo Creating Login page...
if not exist pages mkdir pages
(
echo import React, { useState } from 'react';
echo import axios from 'axios';
echo import { useNavigate } from 'react-router-dom';
echo import { API_URL } from '../api';
echo.
echo export default function Login^(^) {
echo   const [email, setEmail] = useState^('admin@smart.com'^);
echo   const [password, setPassword] = useState^('admin123'^);
echo   const [err, setErr] = useState^(''^);
echo   const nav = useNavigate^(^);
echo.
echo   const submit = async ^(e^) =^> {
echo     e.preventDefault^(^);
echo     try {
echo       const { data } = await axios.post^(`$\{API_URL\}/api/auth/login`, { email, password }^);
echo       localStorage.setItem^('token', data.token^);
echo       localStorage.setItem^('user', JSON.stringify^(data.user^)^);
echo       nav^('/dashboard'^);
echo     } catch ^(e^) { setErr^(e.response?.data?.msg ^|^| 'خطأ في الاتصال'^); }
echo   };
echo.
echo   return ^(
echo     ^<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}^>
echo       ^<div className="glass" style={{ padding: 40, maxWidth: 420, width: '90%%' }}^>
echo         ^<h1 style={{ color: 'var(--navy)', marginBottom: 8, fontSize: 30 }}^>🎓 Smart School^</h1^>
echo         ^<p style={{ color: 'var(--gray)', marginBottom: 30 }}^>نظام الحضور والانصراف الذكي^</p^>
echo         ^<form onSubmit={submit}^>
echo           ^<input className="input" placeholder="البريد الإلكتروني" value={email} onChange={e =^> setEmail^(e.target.value^)} required /^>
echo           ^<br /^>^<br /^>
echo           ^<input className="input" type="password" placeholder="كلمة المرور" value={password} onChange={e =^> setPassword^(e.target.value^)} required /^>
echo           {err ^&^& ^<p style={{ color: 'red', marginTop: 10 }}^>{err}^</p^>}
echo           ^<br /^>
echo           ^<button className="btn" style={{ width: '100%%' }}^>تسجيل الدخول^</button^>
echo         ^</form^>
echo       ^</div^>
echo     ^</div^>
echo   ^);
echo }
) > pages\Login.jsx

echo Creating Dashboard page...
(
echo import React, { useEffect, useState } from 'react';
echo import axios from 'axios';
echo import { API_URL } from '../api';
echo.
echo export default function Dashboard^(^) {
echo   const user = JSON.parse^(localStorage.getItem^('user'^) ^|^| '{}'^);
echo   const [stats, setStats] = useState^({ totalDays: 0, totalLate: 0 }^);
echo.
echo   useEffect^(^(^) =^> {
echo     axios.get^(`$\{API_URL\}/api/attendance/my`, {
echo       headers: { Authorization: `Bearer $\{localStorage.getItem^('token'^)\}` }
echo     }^).then^(r =^> setStats^(r.data^)^).catch^(^(^) =^> {}^);
echo   }, []^);
echo.
echo   return ^(
echo     ^<div className="dashboard"^>
echo       ^<h1 style={{ color: 'var(--navy)', marginBottom: 8 }}^>مرحباً، {user.name} 👋^</h1^>
echo       ^<p style={{ color: 'var(--gray)', marginBottom: 30 }}^>الفرع: {user.branch?.name}^</p^>
echo       ^<div className="grid"^>
echo         ^<div className="stat-card"^>^<h3^>{stats.totalDays}^</h3^>^<p^>أيام الحضور^</p^>^</div^>
echo         ^<div className="stat-card" style={{ background: 'linear-gradient(145deg, #5a6478, #3e4657)' }}^>
echo           ^<h3^>{stats.totalLate}^</h3^>^<p^>دقائق التأخير^</p^>
echo         ^</div^>
echo         ^<div className="stat-card" style={{ background: 'linear-gradient(145deg, #2e4373, #1a2a52)' }}^>
echo           ^<h3^>{user.branch?.radius ^|^| 5}م^</h3^>^<p^>نطاق التسجيل^</p^>
echo         ^</div^>
echo       ^</div^>
echo     ^</div^>
echo   ^);
echo }
) > pages\Dashboard.jsx

echo Creating Attendance page...
(
echo import React, { useState, useEffect } from 'react';
echo import axios from 'axios';
echo import { API_URL } from '../api';
echo.
echo export default function Attendance^(^) {
echo   const [records, setRecords] = useState^([]^);
echo   const [msg, setMsg] = useState^(''^);
echo   const headers = { Authorization: `Bearer $\{localStorage.getItem^('token'^)\}` };
echo.
echo   const load = ^(^) =^> axios.get^(`$\{API_URL\}/api/attendance/my`, { headers }^).then^(r =^> setRecords^(r.data.list^)^);
echo   useEffect^(^(^) =^> { load^(^); }, []^);
echo.
echo   const getLocation = ^(^) =^> new Promise^(^(res, rej^) =^> {
echo     navigator.geolocation.getCurrentPosition^(
echo       p =^> res^({ lat: p.coords.latitude, lng: p.coords.longitude }^),
echo       rej, { enableHighAccuracy: true }
echo     ^);
echo   }^);
echo.
echo   const action = async ^(type^) =^> {
echo     try {
echo       setMsg^('⏳ جاري التحقق من الموقع...'^);
echo       const loc = await getLocation^(^);
echo       await axios.post^(`$\{API_URL\}/api/attendance/$\{type\}`, loc, { headers }^);
echo       setMsg^(`✅ تم تسجيل $\{type === 'check-in' ? 'الحضور' : 'الانصراف'\} بنجاح`^);
echo       load^(^);
echo     } catch ^(e^) { setMsg^('❌ ' + ^(e.response?.data?.msg ^|^| e.message ^|^| 'فشل'^)^); }
echo   };
echo.
echo   return ^(
echo     ^<div className="dashboard"^>
echo       ^<h1 style={{ color: 'var(--navy)', marginBottom: 20 }}^>الحضور والانصراف^</h1^>
echo       ^<div className="grid"^>
echo         ^<button className="btn" onClick={^(^) =^> action^('check-in'^)}^>🟢 تسجيل الحضور^</button^>
echo         ^<button className="btn gray" onClick={^(^) =^> action^('check-out'^)}^>🔴 تسجيل الانصراف^</button^>
echo       ^</div^>
echo       {msg ^&^& ^<p style={{ marginTop: 20, fontWeight: 'bold', color: 'var(--navy)' }}^>{msg}^</p^>}
echo       ^<div className="glass" style={{ padding: 24, marginTop: 30 }}^>
echo         ^<h3 style={{ color: 'var(--navy)' }}^>سجل الحضور^</h3^>
echo         ^<table^>
echo           ^<thead^>^<tr^>^<th^>التاريخ^</th^>^<th^>الحضور^</th^>^<th^>الانصراف^</th^>^<th^>التأخير^</th^>^<th^>الحالة^</th^>^</tr^>^</thead^>
echo           ^<tbody^>
echo             {records.map^(r =^> ^(
echo               ^<tr key={r._id}^>
echo                 ^<td^>{new Date^(r.date^).toLocaleDateString^('ar-EG'^)}^</td^>
echo                 ^<td^>{r.checkIn ? new Date^(r.checkIn^).toLocaleTimeString^('ar-EG'^) : '-'}^</td^>
echo                 ^<td^>{r.checkOut ? new Date^(r.checkOut^).toLocaleTimeString^('ar-EG'^) : '-'}^</td^>
echo                 ^<td^>{r.lateMinutes} د^</td^>
echo                 ^<td^>{r.status === 'late' ? '⏰ متأخر' : '✅ حاضر'}^</td^>
echo               ^</tr^>
echo             ^)^)}
echo           ^</tbody^>
echo         ^</table^>
echo       ^</div^>
echo     ^</div^>
echo   ^);
echo }
) > pages\Attendance.jsx

echo Creating Leaves page...
(
echo import React, { useState, useEffect } from 'react';
echo import axios from 'axios';
echo import { API_URL } from '../api';
echo.
echo export default function Leaves^(^) {
echo   const [leaves, setLeaves] = useState^([]^);
echo   const [form, setForm] = useState^({ from: '', to: '', reason: '' }^);
echo   const headers = { Authorization: `Bearer $\{localStorage.getItem^('token'^)\}` };
echo.
echo   const load = ^(^) =^> axios.get^(`$\{API_URL\}/api/leaves/my`, { headers }^).then^(r =^> setLeaves^(r.data^)^);
echo   useEffect^(^(^) =^> { load^(^); }, []^);
echo.
echo   const submit = async ^(e^) =^> {
echo     e.preventDefault^(^);
echo     await axios.post^(`$\{API_URL\}/api/leaves`, form, { headers }^);
echo     setForm^({ from: '', to: '', reason: '' }^);
echo     load^(^);
echo   };
echo.
echo   return ^(
echo     ^<div className="dashboard"^>
echo       ^<h1 style={{ color: 'var(--navy)', marginBottom: 20 }}^>طلب إجازة^</h1^>
echo       ^<div className="glass" style={{ padding: 30, maxWidth: 600 }}^>
echo         ^<form onSubmit={submit}^>
echo           ^<label^>من تاريخ^</label^>
echo           ^<input className="input" type="date" value={form.from} onChange={e =^> setForm^({ ...form, from: e.target.value }^)} required /^>
echo           ^<br /^>^<br /^>
echo           ^<label^>إلى تاريخ^</label^>
echo           ^<input className="input" type="date" value={form.to} onChange={e =^> setForm^({ ...form, to: e.target.value }^)} required /^>
echo           ^<br /^>^<br /^>
echo           ^<label^>السبب^</label^>
echo           ^<textarea className="input" rows="4" value={form.reason} onChange={e =^> setForm^({ ...form, reason: e.target.value }^)} required /^>
echo           ^<br /^>^<br /^>
echo           ^<button className="btn" style={{ width: '100%%' }}^>إرسال الطلب^</button^>
echo         ^</form^>
echo       ^</div^>
echo       ^<div className="glass" style={{ padding: 24, marginTop: 30 }}^>
echo         ^<h3 style={{ color: 'var(--navy)' }}^>طلباتي^</h3^>
echo         ^<table^>
echo           ^<thead^>^<tr^>^<th^>من^</th^>^<th^>إلى^</th^>^<th^>السبب^</th^>^<th^>الحالة^</th^>^</tr^>^</thead^>
echo           ^<tbody^>
echo             {leaves.map^(l =^> ^(
echo               ^<tr key={l._id}^>
echo                 ^<td^>{new Date^(l.from^).toLocaleDateString^('ar-EG'^)}^</td^>
echo                 ^<td^>{new Date^(l.to^).toLocaleDateString^('ar-EG'^)}^</td^>
echo                 ^<td^>{l.reason}^</td^>
echo                 ^<td^>{l.status === 'approved' ? '✅ مقبول' : l.status === 'rejected' ? '❌ مرفوض' : '⏳ معلق'}^</td^>
echo               ^</tr^>
echo             ^)^)}
echo           ^</tbody^>
echo         ^</table^>
echo       ^</div^>
echo     ^</div^>
echo   ^);
echo }
) > pages\Leaves.jsx

echo.
echo ========================================
echo   All files created successfully!
echo ========================================
echo.
dir /b *.js *.css pages\*.jsx components\*.jsx
echo.
pause