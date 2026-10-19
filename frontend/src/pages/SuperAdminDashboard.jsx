// 📁 frontend/src/pages/SuperAdminDashboard.jsx
// ⬅️ استبدل الملف بالكامل

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './SuperAdminDashboard.css';

import OverviewTab from '../components/superadmin/OverviewTab';
import CompaniesTab from '../components/superadmin/CompaniesTab';
import AuditLogTab from '../components/superadmin/AuditLogTab';
import SettingsTab from '../components/superadmin/SettingsTab'; // ← ✅ جديد

export default function SuperAdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'overview');
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // ✅ حماية: superadmin فقط
  useEffect(() => {
    if (user.role !== 'superadmin') {
      navigate('/dashboard');
    }
  }, [user.role, navigate]);

  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && urlTab !== tab) {
      setTab(urlTab);
    }
  }, [searchParams, tab]);

  const handleTabChange = (newTab) => {
    setTab(newTab);
    setSearchParams({ tab: newTab });
  };

  const tabs = [
    { id: 'overview',  label: '📊 نظرة عامة' },
    { id: 'companies', label: '🏢 الشركات' },
    { id: 'audit',     label: '📋 سجل النظام' },
    { id: 'settings',  label: '⚙️ الإعدادات' }, // ← ✅ جديد
  ];

  return (
    <div className="dashboard superadmin-dashboard">
      {/* ✅ Header */}
      <div className="superadmin-header">
        <div>
          <h1 className="superadmin-title">
            👑 لوحة مدير المنصة
          </h1>
          <p className="superadmin-subtitle">
            مرحباً، {user.name} · إدارة كل الشركات والمستخدمين
          </p>
        </div>
        <div className="superadmin-badge">
          <span className="superadmin-badge-dot" />
          SuperAdmin
        </div>
      </div>

      {/* ✅ Tabs */}
      <div className="superadmin-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`admin-tab ${tab === t.id ? 'active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ✅ Content */}
      <div className="superadmin-content">
        {tab === 'overview'  && <OverviewTab />}
        {tab === 'companies' && <CompaniesTab />}
        {tab === 'audit'     && <AuditLogTab />}
        {tab === 'settings'  && <SettingsTab />} {/* ← ✅ جديد */}
      </div>
    </div>
  );
}