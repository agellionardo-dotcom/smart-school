// 📁 frontend/src/components/superadmin/CreateCompanyModal.jsx
// ⬅️ ملف جديد — Modal إنشاء/تعديل شركة

import React, { useState } from 'react';
import api from '../../api';

const PLANS = [
  { value: 'free',       label: 'مجاني' },
  { value: 'basic',      label: 'أساسي' },
  { value: 'pro',        label: 'احترافي' },
  { value: 'enterprise', label: 'مؤسسات' },
];

const CYCLES = [
  { value: 'monthly', label: 'شهري' },
  { value: 'yearly',  label: 'سنوي' },
];

export default function CreateCompanyModal({ company, onClose, onSuccess }) {
  const isEdit = !!company;

  const [form, setForm] = useState({
    name: company?.name || '',
    slug: company?.slug || '',
    email: company?.email || '',
    phone: company?.phone || '',
    type: company?.type || 'external',
    'subscription.plan': company?.subscription?.plan || 'free',
    'subscription.status': company?.subscription?.status || 'trial',
    'subscription.maxEmployees': company?.subscription?.maxEmployees || 10,
    'subscription.billing.amount': company?.subscription?.billing?.amount || 0,
    'subscription.billing.cycle': company?.subscription?.billing?.cycle || 'monthly',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const autoSlug = (name) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-');
  };

  const handleNameChange = (value) => {
    set('name', value);
    if (!isEdit && (!form.slug || form.slug === autoSlug(form.name))) {
      set('slug', autoSlug(value));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      // ✅ بناء payload
      const payload = {
        name: form.name,
        slug: form.slug,
        email: form.email,
        phone: form.phone,
        type: form.type,
        subscription: {
          plan: form['subscription.plan'],
          status: form['subscription.status'],
          maxEmployees: Number(form['subscription.maxEmployees']),
          billing: {
            amount: Number(form['subscription.billing.amount']),
            cycle: form['subscription.billing.cycle'],
          },
        },
      };

      // ✅ لو إنشاء جديد — ضيف بيانات الأدمن
      if (!isEdit && form.adminEmail) {
        payload.admin = {
          name: form.adminName,
          email: form.adminEmail,
          password: form.adminPassword,
        };
      }

      if (isEdit) {
        await api.patch(`/superadmin/companies/${company._id}`, payload);
        onSuccess('✅ تم تحديث الشركة');
      } else {
        await api.post('/superadmin/companies', payload);
        onSuccess('✅ تم إنشاء الشركة');
      }
    } catch (err) {
      console.error('save company error:', err);
      setError(err.response?.data?.msg || 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="superadmin-modal-overlay" onClick={onClose}>
      <div className="superadmin-modal" onClick={(e) => e.stopPropagation()}>
        {/* ✅ Header */}
        <div className="superadmin-modal-header">
          <h3>{isEdit ? '✏️ تعديل شركة' : '➕ إضافة شركة جديدة'}</h3>
          <button className="superadmin-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* ✅ Error */}
        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              marginBottom: 16,
              fontSize: 13,
              fontWeight: 600,
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#fca5a5',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              textAlign: 'right',
              direction: 'rtl',
            }}
          >
            ❌ {error}
          </div>
        )}

        {/* ✅ Form */}
        <form onSubmit={submit}>
          <input
            className="input"
            placeholder="اسم الشركة *"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />
          <br /><br />

          <input
            className="input"
            placeholder="Slug (للرابط) *"
            value={form.slug}
            onChange={(e) => set('slug', e.target.value)}
            required
            pattern="[a-z0-9-]+"
            title="حروف صغيرة، أرقام، وشرطات فقط"
          />
          <br /><br />

          <input
            className="input"
            type="email"
            placeholder="البريد الإلكتروني للشركة"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
          />
          <br /><br />

          <input
            className="input"
            placeholder="رقم الهاتف"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
          <br /><br />

          <select
            className="input"
            value={form.type}
            onChange={(e) => set('type', e.target.value)}
          >
            <option value="external">شركة خارجية</option>
            <option value="internal">شركة داخلية</option>
          </select>
          <br /><br />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <select
              className="input"
              value={form['subscription.plan']}
              onChange={(e) => set('subscription.plan', e.target.value)}
            >
              {PLANS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>

            <select
              className="input"
              value={form['subscription.status']}
              onChange={(e) => set('subscription.status', e.target.value)}
            >
              <option value="trial">تجريبي</option>
              <option value="active">نشط</option>
              <option value="suspended">موقوف</option>
              <option value="expired">منتهي</option>
            </select>
          </div>
          <br /><br />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input
              className="input"
              type="number"
              min="1"
              placeholder="أقصى عدد موظفين"
              value={form['subscription.maxEmployees']}
              onChange={(e) => set('subscription.maxEmployees', e.target.value)}
            />
            <input
              className="input"
              type="number"
              min="0"
              placeholder="قيمة الاشتراك"
              value={form['subscription.billing.amount']}
              onChange={(e) => set('subscription.billing.amount', e.target.value)}
            />
          </div>
          <br /><br />

          <select
            className="input"
            value={form['subscription.billing.cycle']}
            onChange={(e) => set('subscription.billing.cycle', e.target.value)}
          >
            {CYCLES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          {/* ✅ Admin Section (فقط للإنشاء) */}
          {!isEdit && (
            <>
              <hr style={{ margin: '20px 0', borderColor: 'var(--ss-glass-border)', opacity: 0.3 }} />
              <p
                style={{
                  margin: '0 0 12px 0',
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--ss-text-primary)',
                }}
              >
                👤 حساب الأدمن (اختياري)
              </p>

              <input
                className="input"
                placeholder="اسم الأدمن"
                value={form.adminName}
                onChange={(e) => set('adminName', e.target.value)}
              />
              <br /><br />

              <input
                className="input"
                type="email"
                placeholder="إيميل الأدمن"
                value={form.adminEmail}
                onChange={(e) => set('adminEmail', e.target.value)}
              />
              <br /><br />

              <input
                className="input"
                type="password"
                placeholder="كلمة المرور"
                value={form.adminPassword}
                onChange={(e) => set('adminPassword', e.target.value)}
                minLength={6}
              />
              <br /><br />
            </>
          )}

          <button
            className="btn"
            style={{ width: '100%', padding: 14, fontSize: 15 }}
            disabled={saving}
          >
            {saving ? '⏳ جاري الحفظ...' : isEdit ? '💾 حفظ التعديلات' : '➕ إنشاء الشركة'}
          </button>
        </form>
      </div>
    </div>
  );
}