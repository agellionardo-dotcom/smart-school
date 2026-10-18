// 📁 frontend/src/pages/AdminDashboard.jsx
// ⬅️ استبدل الملف بالكامل

import DocumentsTab from '../components/admin/DocumentsTab';
import QrTab from '../components/admin/QrTab';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import UsersTab from '../components/admin/UsersTab';
import BranchesTab from '../components/admin/BranchesTab';
import OverviewTab from '../components/admin/OverviewTab';
import BranchesMap from '../components/admin/BranchesMap';
import SettingsTab from '../components/admin/SettingsTab';
import OrganizationTab from '../components/admin/OrganizationTab';
import EmergencyTab from '../components/admin/EmergencyTab';
import PayrollTab from '../components/admin/PayrollTab';
import AttendanceReportTab from '../components/admin/AttendanceReportTab';
import AnnouncementsTab from '../components/admin/AnnouncementsTab';
import AnalyticsTab from '../components/admin/AnalyticsTab';
import AuditLogs from './AuditLogs';

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'overview');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && urlTab !== tab) {
      setTab(urlTab);
    }
  }, [searchParams]);

  const handleTabChange = (newTab) => {
    setTab(newTab);
    setSearchParams({ tab: newTab });
  };

  const tabs = [
    { id: 'overview',      label: '📊 نظرة عامة',      roles: ['superadmin', 'manager', 'hr', 'company_owner'] },
    { id: 'analytics',     label: '📈 التحليلات',      roles: ['superadmin', 'manager', 'hr', 'company_owner'] },
    { id: 'emergency',     label: '🚨 الطوارئ',        roles: ['superadmin', 'manager', 'hr', 'company_owner'] },
    { id: 'announcements', label: '📢 الإعلانات',      roles: ['superadmin', 'manager', 'hr', 'company_owner'] },
    { id: 'payroll',       label: '💰 المرتبات',       roles: ['superadmin', 'hr', 'company_owner'] },
    { id: 'reports',       label: '📊 التقارير',       roles: ['superadmin', 'manager', 'hr', 'company_owner'] },
    { id: 'documents',     label: '📄 المستندات',      roles: ['superadmin', 'manager', 'hr', 'company_owner'] },
    { id: 'organization',  label: '📄 الهيكل التنظيمي', roles: ['superadmin', 'manager', 'hr', 'company_owner'] },
    { id: 'users',         label: '👥 المستخدمون',     roles: ['superadmin', 'hr', 'company_owner'] },
    { id: 'branches',      label: '🏢 الفروع',         roles: ['superadmin', 'company_owner'] },
    { id: 'map',           label: '🗺️ الخريطة',        roles: ['superadmin', 'manager', 'hr', 'viewer', 'company_owner'] },
    { id: 'qr',            label: '📱 QR Code',        roles: ['superadmin', 'manager', 'company_owner'] },
    { id: 'audit',         label: '📋 سجلات النظام',   roles: ['superadmin', 'manager', 'hr', 'company_owner'] },
    { id: 'settings',      label: '⚙️ الإعدادات',      roles: ['superadmin', 'company_owner'] },
  ];

  // ✅ فلترة التابات: بنشوف إما role أو companyRole
  const allowed = tabs.filter(t => 
    t.roles.includes(user.role) || t.roles.includes(user.companyRole)
  );

  useEffect(() => {
    if (allowed.length > 0 && !allowed.find(t => t.id === tab)) {
      handleTabChange('overview');
    }
  }, [user.role, user.companyRole]);

  return (
    <div className="dashboard">
      <div style={{ marginBottom: 20 }}>
        <h1
          style={{
            marginBottom: 4,
            fontSize: 26,
            fontWeight: 800,
            background: 'var(--ss-grad-primary)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block',
          }}
        >
          👑 لوحة الإدارة
        </h1>
        <p style={{ color: 'var(--ss-text-secondary)', margin: 0, fontSize: 14 }}>
          مرحباً، {user.name}
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 8,
          marginBottom: 20,
        }}
      >
        {allowed.map(t => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`admin-tab ${tab === t.id ? 'active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'overview' && <OverviewTab />}
        {tab === 'analytics' && <AnalyticsTab />}
        {tab === 'emergency' && <EmergencyTab />}
        {tab === 'announcements' && <AnnouncementsTab />}
        {tab === 'payroll' && <PayrollTab />}
        {tab === 'reports' && <AttendanceReportTab />}
        {tab === 'documents' && <DocumentsTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'branches' && <BranchesTab />}
        {tab === 'map' && <BranchesMap />}
        {tab === 'qr' && <QrTab />}
        {tab === 'audit' && <AuditLogs />}
        {tab === 'settings' && <SettingsTab />}
        {tab === 'organization' && <OrganizationTab />}
      </div>
    </div>
  );
}