import { toCairo, toCairoDate } from '../../utils/dateHelpers';
import React, { useEffect, useState } from 'react';
import api, { API_URL } from '../../api';
import { io } from 'socket.io-client';

const ANNOUNCEMENT_TYPES = {
  info:    { label: 'ℹ️ معلومة',  gradient: 'linear-gradient(135deg, #3b82f6, #1e40af)' },
  warning: { label: '⚠️ تحذير',   gradient: 'linear-gradient(135deg, #fbbf24, #d97706)' },
  success: { label: '✅ نجاح',    gradient: 'linear-gradient(135deg, #10b981, #059669)' },
  urgent:  { label: '🚨 عاجل',    gradient: 'linear-gradient(135deg, #ef4444, #b91c1c)' },
};

export default function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    title: '', content: '', type: 'info', branch: '', expiresAt: '',
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  const canSendToAll = user.role === 'superadmin' || user.role === 'hr';

  const showMsg = (text, type = 'info') => {
    setMsg(text);
    setMsgType(type);
  };

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/announcements');
      setAnnouncements(data);
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.msg || 'فشل التحميل'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      const { data } = await api.get('/branches');
      setBranches(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAnnouncements();
    loadBranches();
  }, []);

  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL.replace('/api', ''), {
      transports: ['websocket', 'polling'],
    });
    socket.on('announcement:new', () => loadAnnouncements());
    return () => socket.disconnect();
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/announcements', form);
      showMsg('✅ تم إنشاء الإعلان', 'success');
      setForm({ title: '', content: '', type: 'info', branch: '', expiresAt: '' });
      setShowForm(false);
      loadAnnouncements();
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.msg || 'فشل الإنشاء'), 'error');
    }
  };

  const deleteAnnouncement = async (id) => {
    if (!window.confirm('هل تريد حذف هذا الإعلان؟')) return;
    try {
      await api.delete(`/announcements/${id}`);
      showMsg('✅ تم الحذف', 'success');
      loadAnnouncements();
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.msg || 'فشل الحذف'), 'error');
    }
  };

  const labelStyle = {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: 600,
    display: 'block',
    marginBottom: 6,
  };

  return (
    <div>
      {/* ✅ Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          📢 الإعلانات ({announcements.length})
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn gray"
            onClick={loadAnnouncements}
            style={{ padding: '10px 20px', fontSize: 13 }}
          >
            🔄 تحديث
          </button>
          <button
            className="btn"
            onClick={() => setShowForm(!showForm)}
            style={{ padding: '10px 20px', fontSize: 13 }}
          >
            {showForm ? '❌ إلغاء' : '➕ إعلان جديد'}
          </button>
        </div>
      </div>

      {/* ✅ Message */}
      {msg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 600,
            direction: 'rtl',
            textAlign: 'right',
            background:
              msgType === 'success'
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(239, 68, 68, 0.15)',
            color: msgType === 'success' ? '#34d399' : '#fca5a5',
            border: `1px solid ${
              msgType === 'success'
                ? 'rgba(16, 185, 129, 0.3)'
                : 'rgba(239, 68, 68, 0.3)'
            }`,
            animation: 'ssFadeIn 0.3s ease',
          }}
        >
          {msg}
        </div>
      )}

      {/* ✅ Form */}
      {showForm && (
        <form
          onSubmit={submit}
          className="ss-glass"
          style={{ padding: 24, marginBottom: 20 }}
        >
          <h4
            style={{
              color: '#f8fafc',
              marginBottom: 16,
              fontSize: 17,
              fontWeight: 700,
            }}
          >
            ➕ إعلان جديد
          </h4>

          <label style={labelStyle}>عنوان الإعلان *</label>
          <input
            className="input"
            placeholder="عنوان الإعلان"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            required
            maxLength={200}
          />
          <br /><br />

          <label style={labelStyle}>محتوى الإعلان *</label>
          <textarea
            className="input"
            placeholder="محتوى الإعلان"
            value={form.content}
            onChange={e => setForm({ ...form, content: e.target.value })}
            required
            maxLength={2000}
            rows={5}
            style={{ resize: 'vertical', fontFamily: 'inherit' }}
          />
          <br /><br />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
            }}
          >
            <div>
              <label style={labelStyle}>النوع</label>
              <select
                className="input"
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
              >
                {Object.entries(ANNOUNCEMENT_TYPES).map(([key, t]) => (
                  <option key={key} value={key}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>الفرع</label>
              <select
                className="input"
                value={form.branch}
                onChange={e => setForm({ ...form, branch: e.target.value })}
                disabled={user.role === 'manager' || (user.role === 'hr' && !canSendToAll)}
              >
                {canSendToAll && <option value="">🌍 كل الفروع</option>}
                {branches.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
              {(user.role === 'manager' || (user.role === 'hr' && !canSendToAll)) && (
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                  ℹ️ الإعلان هيتبعت لفرعك بس
                </p>
              )}
            </div>

            <div>
              <label style={labelStyle}>تاريخ الانتهاء (اختياري)</label>
              <input
                type="date"
                className="input"
                value={form.expiresAt}
                onChange={e => setForm({ ...form, expiresAt: e.target.value })}
              />
            </div>
          </div>

          <br />
          <button className="btn" type="submit" style={{ width: '100%' }}>
            📢 نشر الإعلان
          </button>
        </form>
      )}

      {/* ✅ List */}
      <div className="ss-glass" style={{ padding: 20 }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
            ⏳ جاري التحميل...
          </p>
        ) : announcements.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
            لا توجد إعلانات
          </p>
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
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRight: `4px solid transparent`,
                    borderImage: `${type.gradient} 1`,
                    borderImageSlice: 1,
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          alignItems: 'center',
                          marginBottom: 8,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          className="payroll-status"
                          style={{ background: type.gradient }}
                        >
                          {type.label}
                        </span>
                        <span
                          style={{
                            background: 'rgba(255,255,255,0.08)',
                            color: 'rgba(255,255,255,0.7)',
                            padding: '3px 10px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {a.branch?.name || '🌍 كل الفروع'}
                        </span>
                      </div>
                      <h4
                        style={{
                          color: '#f8fafc',
                          margin: '0 0 8px',
                          fontSize: 16,
                          fontWeight: 700,
                        }}
                      >
                        {a.title}
                      </h4>
                      <p
                        style={{
                          color: 'rgba(255,255,255,0.8)',
                          fontSize: 14,
                          margin: '0 0 8px',
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.6,
                        }}
                      >
                        {a.content}
                      </p>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'rgba(255,255,255,0.5)',
                          display: 'flex',
                          gap: 12,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>👤 {a.createdBy?.name}</span>
                        <span>🕐 {toCairo(a.createdAt)}</span>
                        {a.expiresAt && <span>⏳ ينتهي: {toCairoDate(a.expiresAt)}</span>}
                      </div>
                    </div>
                    <button
                      className="btn danger"
                      onClick={() => deleteAnnouncement(a._id)}
                      style={{ padding: '8px 12px', fontSize: 13 }}
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