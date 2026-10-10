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
    { id: 'overview',      label: '📊 نظرة عامة',      roles: ['superadmin', 'manager', 'hr'] },
    { id: 'analytics',     label: '📈 التحليلات',      roles: ['superadmin', 'manager', 'hr'] },
    { id: 'emergency',     label: '🚨 الطوارئ',        roles: ['superadmin', 'manager', 'hr'] },
    { id: 'announcements', label: '📢 الإعلانات',      roles: ['superadmin', 'manager', 'hr'] },
    { id: 'payroll',       label: '💰 المرتبات',       roles: ['superadmin', 'hr'] },
    { id: 'reports',       label: '📊 التقارير',       roles: ['superadmin', 'manager', 'hr'] },
    { id: 'documents',     label: '📄 المستندات',      roles: ['superadmin', 'manager', 'hr'] }, // ✅ جديد
    { id: 'organization',  label: '📄 الهيكل التنظيمي',  roles: ['superadmin', 'manager', 'hr'] },
    { id: 'users',         label: '👥 المستخدمون',     roles: ['superadmin', 'hr'] },
    { id: 'branches',      label: '🏢 الفروع',         roles: ['superadmin'] },
    { id: 'map',           label: '🗺️ الخريطة',        roles: ['superadmin', 'manager', 'hr', 'viewer'] },
    { id: 'qr',            label: '📱 QR Code',        roles: ['superadmin', 'manager'] },
    { id: 'settings',      label: '⚙️ الإعدادات',      roles: ['superadmin'] },
  ];

  const allowed = tabs.filter(t => t.roles.includes(user.role));

  useEffect(() => {
    if (allowed.length > 0 && !allowed.find(t => t.id === tab)) {
      handleTabChange('overview');
    }
  }, [user.role]);

  return (
    <div className="dashboard">
      {/* ✅ Header */}
      <div style={{ marginBottom: 20 }}>
        <h1
          style={{
            marginBottom: 4,
            fontSize: 26,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #00e5ff, #a855f7)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block',
          }}
        >
          👑 لوحة الإدارة
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: 14 }}>
          مرحباً، {user.name}
        </p>
      </div>

      {/* ✅ Tabs */}
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
        {tab === 'documents' && <DocumentsTab />} {/* ✅ جديد */}
        {tab === 'users' && <UsersTab />}
        {tab === 'branches' && <BranchesTab />}
        {tab === 'map' && <BranchesMap />}
        {tab === 'qr' && <QrTab />}
        {tab === 'settings' && <SettingsTab />}
        {tab === 'organization' && <OrganizationTab />}
      </div>
    </div>
  );
}