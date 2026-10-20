import React, { useState, useEffect, useRef } from 'react';
import api from '../../api';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLES = { /* ... نفس القديم ... */ };

export default function BranchesTab() {
  const [branches, setBranches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editBranch, setEditBranch] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapType, setMapType] = useState('satellite');
  const [form, setForm] = useState({
    name: '', type: 'sub', parent: '', radius: 100,
    lat: '', lng: '', address: '', phone: ''
  });
  const [msg, setMsg] = useState('');
  const mapRef = useRef(null);

  // ✅ قراءة صلاحيات المستخدم
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.companyRole || user.role;

  const canEditBranch = (branchId) => {
    // ✅ SuperAdmin / Company Owner: يعدل أي فرع
    if (['superadmin', 'company_owner'].includes(userRole)) return true;
    // ✅ HR: يعدل فرعه بس
    if (userRole === 'hr') {
      return String(branchId) === String(user.branch);
    }
    return false;
  };

  const loadBranches = async () => {
    try {
      const { data } = await api.get('/branches');
      setBranches(data);
    } catch (err) {
      console.error('loadBranches error:', err);
    }
  };

  useEffect(() => { loadBranches(); }, []);

  // ... (نفس باقي الكود زي ما هو) ...

  return (
    <div>
      {/* ... (Header والـ Message والـ Form زي ما هما) ... */}

      {/* ✅ Branches Grid */}
      <div className="grid">
        {branches.map(b => {
          const canEdit = canEditBranch(b._id);

          return (
            <div key={b._id} className="ss-glass" style={{ padding: 20 }}>
              <h4 style={{ color: 'var(--ss-text-primary)', marginBottom: 10, fontSize: 16, fontWeight: 700 }}>
                {b.type === 'main' ? '🏛️' : '🏬'} {b.name}
              </h4>

              <p style={{ fontSize: 13, color: 'var(--ss-text-secondary)', margin: '0 0 8px 0' }}>
                النوع: {b.type === 'main' ? 'رئيسي' : 'فرعي'} | نطاق: {b.radius}م
              </p>

              {b.manager && (
                <p style={{ fontSize: 13, color: 'var(--ss-text-secondary)', margin: '4px 0' }}>
                  👤 المدير: {b.manager.name}
                </p>
              )}

              <p style={{ fontSize: 12, color: 'var(--ss-text-muted)', marginTop: 8, fontFamily: 'monospace', direction: 'ltr', textAlign: 'right' }}>
                📍 {b.location?.lat?.toFixed(4)}, {b.location?.lng?.toFixed(4)}
              </p>

              {b.phone && <p style={{ fontSize: 12, color: 'var(--ss-text-secondary)', margin: '4px 0' }}>📞 {b.phone}</p>}
              {b.address && <p style={{ fontSize: 12, color: 'var(--ss-text-secondary)', margin: '4px 0' }}>🏠 {b.address}</p>}

              {/* ✅ أزرار التعديل/الحذف (تظهر بس لو مسموح) */}
              {canEdit && (
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button
                    className="btn gray"
                    style={{ padding: '6px 14px', fontSize: 12, flex: 1 }}
                    onClick={() => startEdit(b)}
                  >
                    ✏️ تعديل
                  </button>
                  <button
                    className="btn danger"
                    style={{ padding: '6px 14px', fontSize: 12, flex: 1 }}
                    onClick={() => deleteBranch(b._id)}
                  >
                    🗑️ حذف
                  </button>
                </div>
              )}

              {/* ✅ لو مفيش صلاحية، يظهر "مشاهدة فقط" */}
              {!canEdit && (
                <div style={{ marginTop: 14, padding: '6px 12px', background: 'var(--ss-bg-surface)', borderRadius: 8, fontSize: 11, color: 'var(--ss-text-muted)', textAlign: 'center' }}>
                  👁️ مشاهدة فقط
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}