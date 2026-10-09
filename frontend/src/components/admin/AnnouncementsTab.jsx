import { toCairo, toCairoDate } from '../../utils/dateHelpers';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../api';
import { io } from 'socket.io-client';

const ANNOUNCEMENT_TYPES = {
  info: { label: 'ℹ️ معلومة', color: '#6b8cae' },
  warning: { label: '⚠️ تحذير', color: '#b8860b' },
  success: { label: '✅ نجاح', color: '#2e7d5b' },
  urgent: { label: '🚨 عاجل', color: '#8e2b2b' },
};

export default function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'info',
    branch: '',
    expiresAt: '',
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  // ✅ هل المستخدم يقدر يبعت لكل الفروع؟
  const canSendToAll = user.role === 'superadmin' || user.role === 'hr';

  // ✅ جلب الإعلانات
  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/api/announcements`, { headers });
      setAnnouncements(data);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل التحميل'));
    } finally {
      setLoading(false);
    }
  };

  // ✅ جلب الفروع
  const loadBranches = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/branches`, { headers });
      setBranches(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAnnouncements();
    loadBranches();
  }, []);

  // ✅ Socket.io للإشعارات
  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL.replace('/api', ''), {
      transports: ['websocket', 'polling'],
    });

    socket.on('announcement:new', () => {
      loadAnnouncements();
    });

    return () => socket.disconnect();
  }, [token]);

  // ✅ إنشاء إعلان
  const submit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/announcements`, form, { headers });
      setMsg('✅ تم إنشاء الإعلان');
      setForm({ title: '', content: '', type: 'info', branch: '', expiresAt: '' });
      setShowForm(false);
      loadAnnouncements();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل الإنشاء'));
    }
  };

  // ✅ حذف إعلان
  const deleteAnnouncement = async (id) => {
    if (!window.confirm('هل تريد حذف هذا الإعلان؟')) return;
    try {
      await axios.delete(`${API_URL}/api/announcements/${id}`, { headers });
      setMsg('✅ تم الحذف');
      loadAnnouncements();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل الحذف'));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ color: 'var(--navy)', margin: 0 }}>📢 الإعلانات ({announcements.length})</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn gray" onClick={loadAnnouncements} style={{ padding: '10px 20px', fontSize: 13 }}>
            🔄 تحديث
          </button>
          <button className="btn" onClick={() => setShowForm(!showForm)} style={{ padding: '10px 20px', fontSize: 13 }}>
            {showForm ? '❌ إلغاء' : '➕ إعلان جديد'}
          </button>
        </div>
      </div>

      {msg && (
        <p style={{
          padding: 12,
          background: msg.startsWith('✅') ? '#d4edda' : '#f8d7da',
          borderRadius: 8, marginBottom: 16, color: '#000', fontSize: 13,
        }}>{msg}</p>
      )}

      {/* الفورم */}
      {showForm && (
        <form onSubmit={submit} className="glass" style={{ padding: 24, marginBottom: 20 }}>
          <h4 style={{ color: 'var(--navy)', marginBottom: 16 }}>➕ إعلان جديد</h4>

          <input
            className="input"
            placeholder="عنوان الإعلان *"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            required
            maxLength={200}
          />
          <br /><br />

          <textarea
            className="input"
            placeholder="محتوى الإعلان *"
            value={form.content}
            onChange={e => setForm({ ...form, content: e.target.value })}
            required
            maxLength={2000}
            rows={5}
            style={{ resize: 'vertical', fontFamily: 'inherit' }}
          />
          <br /><br />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, color: 'var(--navy)', fontWeight: 'bold' }}>النوع:</label>
              <select
                className="input"
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                style={{ marginTop: 4 }}
              >
                {Object.entries(ANNOUNCEMENT_TYPES).map(([key, t]) => (
                  <option key={key} value={key}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 13, color: 'var(--navy)', fontWeight: 'bold' }}>الفرع:</label>
              <select
                className="input"
                value={form.branch}
                onChange={e => setForm({ ...form, branch: e.target.value })}
                style={{ marginTop: 4 }}
                disabled={user.role === 'manager' || (user.role === 'hr' && !canSendToAll)}
              >
                {canSendToAll && <option value="">🌍 كل الفروع</option>}
                {branches.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
              {(user.role === 'manager' || (user.role === 'hr' && !canSendToAll)) && (
                <p style={{ fontSize: 11, color: '#5a6478', marginTop: 4 }}>
                  ℹ️ الإعلان هيتبعت لفرعك بس
                </p>
              )}
            </div>

            <div>
              <label style={{ fontSize: 13, color: 'var(--navy)', fontWeight: 'bold' }}>تاريخ الانتهاء (اختياري):</label>
              <input
                type="date"
                className="input"
                value={form.expiresAt}
                onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                style={{ marginTop: 4 }}
              />
            </div>
          </div>

          <br />

          <button className="btn" type="submit" style={{ width: '100%' }}>
            📢 نشر الإعلان
          </button>
        </form>
      )}

      {/* قائمة الإعلانات */}
      <div className="glass" style={{ padding: 20 }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--gray)' }}>⏳ جاري التحميل...</p>
        ) : announcements.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--gray)' }}>لا توجد إعلانات</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {announcements.map(a => {
              const type = ANNOUNCEMENT_TYPES[a.type] || ANNOUNCEMENT_TYPES.info;
              return (
                <div
                  key={a._id}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    background: '#fff',
                    borderRight: `4px solid ${type.color}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={{
                          background: type.color,
                          color: '#fff',
                          padding: '3px 10px',
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 'bold',
                        }}>
                          {type.label}
                        </span>
                        <span style={{
                          background: '#f5f7fa',
                          color: '#5a6478',
                          padding: '3px 10px',
                          borderRadius: 10,
                          fontSize: 11,
                        }}>
                          {a.branch?.name || '🌍 كل الفروع'}
                        </span>
                      </div>

                      <h4 style={{ color: 'var(--navy)', margin: '0 0 8px', fontSize: 16 }}>{a.title}</h4>
                      <p style={{ color: '#3a4a6b', fontSize: 14, margin: '0 0 8px', whiteSpace: 'pre-wrap' }}>{a.content}</p>

                      <div style={{ fontSize: 11, color: '#8b95a7' }}>
                        👤 {a.createdBy?.name} · 🕐 {toCairo(a.createdAt)}
                          {a.expiresAt && ` · ⏳ ينتهي: ${toCairoDate(a.expiresAt)}`}
                      </div>
                    </div>

                    <button
                      onClick={() => deleteAnnouncement(a._id)}
                      style={{
                        padding: '8px 12px',
                        background: '#8e2b2b',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontFamily: 'inherit',
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}