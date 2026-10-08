import QrTab from '../components/admin/QrTab';
import React, { useState } from 'react';
import UsersTab from '../components/admin/UsersTab';
import BranchesTab from '../components/admin/BranchesTab';
import OverviewTab from '../components/admin/OverviewTab';
import BranchesMap from '../components/admin/BranchesMap';
import SettingsTab from '../components/admin/SettingsTab';
import OrganizationTab from '../components/admin/OrganizationTab';
import EmergencyTab from '../components/admin/EmergencyTab';
import PayrollTab from '../components/admin/PayrollTab';

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const tabs = [
    { id: 'overview',     label: '📊 نظرة عامة',      roles: ['superadmin', 'manager', 'hr'] },
    { id: 'emergency',    label: '🚨 الطوارئ',        roles: ['superadmin', 'manager', 'hr'] },
    { id: 'payroll',      label: '💰 المرتبات',       roles: ['superadmin', 'hr'] },
    { id: 'organization', label: '📄 الهيكل التنظيمي',  roles: ['superadmin', 'manager', 'hr'] },
    { id: 'users',        label: '👥 المستخدمون',     roles: ['superadmin', 'hr'] },
    { id: 'branches',     label: '🏢 الفروع',         roles: ['superadmin'] },
    { id: 'map',          label: '🗺️ الخريطة',        roles: ['superadmin', 'manager', 'hr', 'viewer'] },
    { id: 'qr',           label: '📱 QR Code',        roles: ['superadmin', 'manager'] },
    { id: 'settings',     label: '⚙️ الإعدادات',      roles: ['superadmin'] },
  ];

  const allowed = tabs.filter(t => t.roles.includes(user.role));

  return (
    <div className="dashboard">
      <h1 style={{ color: 'var(--navy)', marginBottom: 4, fontSize: 24 }}>
        👑 لوحة الإدارة
      </h1>
      <p style={{ color: 'var(--gray)', marginBottom: 20, fontSize: 14 }}>
        مرحباً، {user.name}
      </p>

      <div style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 8,
        marginBottom: 20,
      }}>
        {allowed.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: '0 0 auto',
              padding: '10px 18px',
              borderRadius: 10,
              border: 'none',
              background: tab === t.id
                ? 'linear-gradient(145deg, #0a1f44, #142b5c)'
                : '#fff',
              color: tab === t.id ? '#fff' : 'var(--navy)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'overview' && <OverviewTab />}
        {tab === 'emergency' && <EmergencyTab />}
        {tab === 'payroll' && <PayrollTab />}
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