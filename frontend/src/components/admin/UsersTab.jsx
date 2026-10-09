import { toCairo } from '../../utils/dateHelpers';
import React, { useState, useEffect } from 'react';
import api from '../../api';

const ROLES = [
  { value: 'superadmin', label: 'مدير النظام' },
  { value: 'manager',    label: 'مدير فرع' },
  { value: 'hr',         label: 'موارد بشرية' },
  { value: 'employee',   label: 'موظف' },
  { value: 'viewer',     label: 'مشاهد' },
];

const ROLE_GRADIENTS = {
  superadmin: 'linear-gradient(135deg, #00e5ff, #a855f7)',
  manager:    'linear-gradient(135deg, #3b82f6, #1e40af)',
  hr:         'linear-gradient(135deg, #a855f7, #7e22ce)',
  employee:   'linear-gradient(135deg, #10b981, #059669)',
  viewer:     'linear-gradient(135deg, #94a3b8, #64748b)',
};

export default function UsersTab() {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'employee',
    branch: '', phone: '', department: '', position: ''
  });

  const loadUsers = async () => {
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data);
    } catch (err) {
      console.error('loadUsers error:', err);
      setMsg('❌ فشل تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      const { data } = await api.get('/branches');
      setBranches(data);
    } catch (err) {
      console.error('loadBranches error:', err);
    }
  };

  useEffect(() => {
    loadUsers();
    loadBranches();
  }, []);

  const resetForm = () => {
    setForm({
      name: '', email: '', password: '', role: 'employee',
      branch: '', phone: '', department: '', position: ''
    });
    setEditUser(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editUser) {
        await api.put(`/admin/users/${editUser._id}`, form);
        setMsg('✅ تم تحديث المستخدم');
      } else {
        await api.post('/admin/users', form);
        setMsg('✅ تم إنشاء المستخدم');
      }
      resetForm();
      setShowForm(false);
      loadUsers();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'خطأ'));
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setMsg('✅ تم الحذف');
      loadUsers();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'خطأ'));
    }
  };

  const startEdit = (user) => {
    setEditUser(user);
    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'employee',
      branch: user.branch?._id || '',
      phone: user.phone || '',
      department: user.department || '',
      position: user.position || ''
    });
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const roleBadge = (role) => {
    const label = ROLES.find(r => r.value === role)?.label || role;
    return (
      <span
        className="payroll-status"
        style={{ background: ROLE_GRADIENTS[role] || ROLE_GRADIENTS.viewer }}
      >
        {label}
      </span>
    );
  };

  const downloadFile = async (endpoint, filename) => {
    try {
      const response = await api.get(endpoint, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMsg('✅ تم تحميل الملف');
    } catch (err) {
      console.error('download error:', err);
      setMsg('❌ فشل التحميل');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setMsg('⏳ جاري استيراد المستخدمين...');
      const { data } = await api.post('/reports/users/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      let msgText = `✅ تم استيراد ${data.success} مستخدم`;
      if (data.failed > 0) msgText += ` - فشل: ${data.failed}`;
      setMsg(msgText);

      if (data.errors && data.errors.length > 0) {
        const errorsToShow = data.errors.slice(0, 10).join('\n');
        alert('تفاصيل الأخطاء:\n' + errorsToShow + (data.errors.length > 10 ? `\n... و${data.errors.length - 10} أخطاء أخرى` : ''));
      }

      loadUsers();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل الاستيراد'));
    }
    e.target.value = '';
  };

  return (
    <div>
      {/* ✅ Reports Section */}
      <div className="ss-glass" style={{ padding: 16, marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: showReports ? 12 : 0,
          }}
        >
          <b style={{ color: '#f8fafc', fontSize: 15 }}>📊 التقارير والاستيراد</b>
          <button
            className="btn gray"
            style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={() => setShowReports(!showReports)}
          >
            {showReports ? 'إخفاء' : 'عرض'}
          </button>
        </div>

        {showReports && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 8,
            }}
          >
            <button
              className="btn green"
              style={{ padding: '10px', fontSize: 13 }}
              onClick={() => downloadFile('/reports/users/excel', `users_${Date.now()}.xlsx`)}
            >
              📥 Excel المستخدمين
            </button>
            <button
              className="btn danger"
              style={{ padding: '10px', fontSize: 13 }}
              onClick={() => downloadFile('/reports/users/pdf', `users_${Date.now()}.pdf`)}
            >
              📄 PDF المستخدمين
            </button>
            <button
              className="btn gray"
              style={{ padding: '10px', fontSize: 13 }}
              onClick={() => downloadFile('/reports/users/template', 'users_template.xlsx')}
            >
              📋 قالب المستخدمين
            </button>
            <label
              className="btn"
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #d97706)',
                padding: '10px',
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'center',
                display: 'block',
              }}
            >
              📤 استيراد Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleImport}
              />
            </label>
          </div>
        )}
      </div>

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
          👥 قائمة المستخدمين ({users.length})
        </h3>
        <button
          className="btn"
          onClick={() => { setShowForm(!showForm); resetForm(); }}
        >
          {showForm ? '❌ إلغاء' : '➕ إضافة مستخدم'}
        </button>
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
            background: msg.startsWith('✅')
              ? 'rgba(16, 185, 129, 0.15)'
              : msg.startsWith('⏳')
              ? 'rgba(251, 191, 36, 0.15)'
              : 'rgba(239, 68, 68, 0.15)',
            color: msg.startsWith('✅')
              ? '#34d399'
              : msg.startsWith('⏳')
              ? '#fcd34d'
              : '#fca5a5',
            border: `1px solid ${
              msg.startsWith('✅')
                ? 'rgba(16, 185, 129, 0.3)'
                : msg.startsWith('⏳')
                ? 'rgba(251, 191, 36, 0.3)'
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
        <div className="ss-glass" style={{ padding: 24, marginBottom: 20 }}>
          <h4
            style={{
              color: '#f8fafc',
              marginBottom: 16,
              fontSize: 17,
              fontWeight: 700,
            }}
          >
            {editUser ? '✏️ تعديل مستخدم' : '➕ إضافة مستخدم جديد'}
          </h4>
          <form onSubmit={submit}>
            <input
              className="input"
              placeholder="الاسم الكامل *"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
            <br /><br />
            <input
              className="input"
              type="email"
              placeholder="البريد الإلكتروني *"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
            <br /><br />
            <input
              className="input"
              type="password"
              placeholder={editUser ? 'كلمة المرور الجديدة (اتركها فارغة إذا لم ترد تغييرها)' : 'كلمة المرور *'}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required={!editUser}
            />
            <br /><br />
            <select
              className="input"
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
              required
            >
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <br /><br />
            <select
              className="input"
              value={form.branch}
              onChange={e => setForm({ ...form, branch: e.target.value })}
              required
            >
              <option value="">اختر الفرع *</option>
              {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
            <br /><br />
            <input
              className="input"
              placeholder="رقم الهاتف"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
            />
            <br /><br />
            <input
              className="input"
              placeholder="القسم"
              value={form.department}
              onChange={e => setForm({ ...form, department: e.target.value })}
            />
            <br /><br />
            <input
              className="input"
              placeholder="المسمى الوظيفي"
              value={form.position}
              onChange={e => setForm({ ...form, position: e.target.value })}
            />
            <br /><br />
            <button className="btn" style={{ width: '100%' }}>
              {editUser ? '💾 حفظ التعديلات' : '➕ إنشاء المستخدم'}
            </button>
          </form>
        </div>
      )}

      {/* ✅ Table */}
      <div className="ss-glass" style={{ padding: 20 }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
            ⏳ جاري التحميل...
          </p>
        ) : users.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
            لا يوجد مستخدمون
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>البريد الإلكتروني</th>
                  <th>الدور</th>
                  <th>الفرع</th>
                  <th>الهاتف</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td><b>{u.name}</b></td>
                    <td style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                      {u.email}
                    </td>
                    <td>{roleBadge(u.role)}</td>
                    <td style={{ color: 'rgba(255,255,255,0.75)' }}>
                      {u.branch?.name || '-'}
                    </td>
                    <td style={{ color: 'rgba(255,255,255,0.75)' }}>
                      {u.phone || '-'}
                    </td>
                    <td>
                      <button
                        className="btn"
                        style={{ padding: '6px 10px', fontSize: 12, marginLeft: 4 }}
                        onClick={() => window.location.href = `/employee/${u._id}`}
                      >
                        👁️ عرض الملف
                      </button>
                      <button
                        className="btn gray"
                        style={{ padding: '6px 10px', fontSize: 12, marginLeft: 4 }}
                        onClick={() => startEdit(u)}
                      >
                        ✏️ تعديل
                      </button>
                      <button
                        className="btn danger"
                        style={{ padding: '6px 10px', fontSize: 12, marginLeft: 4 }}
                        onClick={() => deleteUser(u._id)}
                      >
                        🗑️ حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}