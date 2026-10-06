import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../api';

const ROLES = [
  { value: 'superadmin', label: 'مدير النظام' },
  { value: 'manager',    label: 'مدير فرع' },
  { value: 'hr',         label: 'موارد بشرية' },
  { value: 'employee',   label: 'موظف' },
  { value: 'viewer',     label: 'مشاهد' },
];

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

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  const loadUsers = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/users`, { headers });
      setUsers(data);
    } catch (err) {
      setMsg('❌ فشل تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/branches`);
      setBranches(data);
    } catch {}
  };

  useEffect(() => {
    loadUsers();
    loadBranches();
  }, []);

  const resetForm = () => {
    setForm({ name: '', email: '', password: '', role: 'employee',
      branch: '', phone: '', department: '', position: '' });
    setEditUser(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editUser) {
        await axios.put(`${API_URL}/api/admin/users/${editUser._id}`, form, { headers });
        setMsg('✅ تم تحديث المستخدم');
      } else {
        await axios.post(`${API_URL}/api/admin/users`, form, { headers });
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
      await axios.delete(`${API_URL}/api/admin/users/${id}`, { headers });
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
    const colors = {
      superadmin: '#0a1f44',
      manager:    '#2e4373',
      hr:         '#5a6478',
      employee:   '#2e7d5b',
      viewer:     '#8b95a7'
    };
    const label = ROLES.find(r => r.value === role)?.label || role;
    return (
      <span style={{
        background: colors[role] || '#8b95a7',
        color: '#fff',
        padding: '4px 12px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 'bold'
      }}>{label}</span>
    );
  };

  const downloadFile = async (endpoint, filename) => {
    try {
      const response = await axios.get(`${API_URL}${endpoint}`, {
        headers,
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
      const { data } = await axios.post(`${API_URL}/api/reports/users/import`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
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
      {/* قسم التقارير والاستيراد */}
      <div style={{
        background: '#fff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 20,
        boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <b style={{ color: 'var(--navy)', fontSize: 15 }}>📊 التقارير والاستيراد</b>
          <button
            className="btn gray"
            style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={() => setShowReports(!showReports)}
          >
            {showReports ? 'إخفاء' : 'عرض'}
          </button>
        </div>

        {showReports && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
            <button
              className="btn"
              style={{ background: 'linear-gradient(145deg, #2e7d5b, #1e5a40)', padding: '10px', fontSize: 13 }}
              onClick={() => downloadFile('/api/reports/users/excel', `users_${Date.now()}.xlsx`)}
            >
              📥 Excel المستخدمين
            </button>
            <button
              className="btn"
              style={{ background: 'linear-gradient(145deg, #8e2b2b, #5c1c1c)', padding: '10px', fontSize: 13 }}
              onClick={() => downloadFile('/api/reports/users/pdf', `users_${Date.now()}.pdf`)}
            >
              📄 PDF المستخدمين
            </button>
            <button
              className="btn"
              style={{ background: 'linear-gradient(145deg, #2e4373, #1a2a52)', padding: '10px', fontSize: 13 }}
              onClick={() => downloadFile('/api/reports/users/template', 'users_template.xlsx')}
            >
              📋 قالب المستخدمين
            </button>
            <label
              className="btn"
              style={{
                background: 'linear-gradient(145deg, #b8860b, #8b6508)',
                padding: '10px',
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'center',
                display: 'block'
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

      {/* عنوان المستخدمين */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ color: 'var(--navy)' }}>👥 قائمة المستخدمين ({users.length})</h3>
        <button
          className="btn"
          onClick={() => { setShowForm(!showForm); resetForm(); }}
        >
          {showForm ? '❌ إلغاء' : '➕ إضافة مستخدم'}
        </button>
      </div>

      {msg && (
        <p style={{
          padding: 12,
          background: msg.startsWith('✅') ? '#d4edda' : '#f8d7da',
          borderRadius: 8,
          marginBottom: 16,
          color: '#000'
        }}>{msg}</p>
      )}

      {showForm && (
        <div className="glass" style={{ padding: 24, marginBottom: 20 }}>
          <h4 style={{ color: 'var(--navy)', marginBottom: 16 }}>
            {editUser ? '✏️ تعديل مستخدم' : '➕ إضافة مستخدم جديد'}
          </h4>
          <form onSubmit={submit}>
            <input className="input" placeholder="الاسم الكامل *" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} required />
            <br /><br />
            <input className="input" type="email" placeholder="البريد الإلكتروني *" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} required />
            <br /><br />
            <input className="input" type="password"
              placeholder={editUser ? 'كلمة المرور الجديدة (اتركها فارغة إذا لم ترد تغييرها)' : 'كلمة المرور *'}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required={!editUser} />
            <br /><br />
            <select className="input" value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })} required>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <br /><br />
            <select className="input" value={form.branch}
              onChange={e => setForm({ ...form, branch: e.target.value })} required>
              <option value="">اختر الفرع *</option>
              {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
            <br /><br />
            <input className="input" placeholder="رقم الهاتف" value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })} />
            <br /><br />
            <input className="input" placeholder="القسم" value={form.department}
              onChange={e => setForm({ ...form, department: e.target.value })} />
            <br /><br />
            <input className="input" placeholder="المسمى الوظيفي" value={form.position}
              onChange={e => setForm({ ...form, position: e.target.value })} />
            <br /><br />
            <button className="btn" style={{ width: '100%' }}>
              {editUser ? '💾 حفظ التعديلات' : '➕ إنشاء المستخدم'}
            </button>
          </form>
        </div>
      )}

      {/* جدول المستخدمين */}
      <div className="glass" style={{ padding: 20 }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--gray)' }}>جاري التحميل...</p>
        ) : users.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--gray)' }}>لا يوجد مستخدمون</p>
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
                    <td style={{ fontSize: 13 }}>{u.email}</td>
                    <td>{roleBadge(u.role)}</td>
                    <td>{u.branch?.name || '-'}</td>
                    <td>{u.phone || '-'}</td>
                    <td>
                      <button className="btn"
                        style={{ padding: '6px 10px', fontSize: 12, background: '#2e4373', marginLeft: 4 }}
                        onClick={() => window.location.href = `/employee/${u._id}`}>
                        👁️ عرض الملف
                      </button>
                      <button className="btn gray"
                        style={{ padding: '6px 10px', fontSize: 12, marginLeft: 4 }}
                        onClick={() => startEdit(u)}>✏️ تعديل</button>
                      <button className="btn"
                        style={{ padding: '6px 10px', fontSize: 12, background: '#8e2b2b', marginLeft: 4 }}
                        onClick={() => deleteUser(u._id)}>🗑️ حذف</button>
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