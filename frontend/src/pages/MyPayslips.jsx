// 📁 frontend/src/pages/MyPayslips.jsx
// ⬅️ ملف جديد

import React, { useEffect, useState } from 'react';
import api from '../api';

const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export default function MyPayslips() {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/payroll/my-payslips');
        setPayslips(data || []);
      } catch (err) {
        console.error('loadPayslips error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <p style={{ textAlign: 'center', padding: 40 }}>⏳ جاري التحميل...</p>;
  }

  return (
    <div className="dashboard">
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20, color: 'var(--ss-text-primary)' }}>
        💰 قسائم الرواتب
      </h1>

      {payslips.length === 0 ? (
        <div className="ss-glass" style={{ padding: 40, textAlign: 'center', color: 'var(--ss-text-muted)' }}>
          <p style={{ fontSize: 48, margin: 0 }}>💰</p>
          <p>لا توجد قسائم رواتب حتى الآن</p>
        </div>
      ) : (
        payslips.map((p) => (
          <div key={p._id} className="ss-glass" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: 'var(--ss-text-primary)' }}>
              📅 {MONTHS[p.month - 1]} {p.year}
            </h3>
            <table style={{ marginTop: 12 }}>
              <tbody>
                <tr>
                  <td>الراتب الأساسي</td>
                  <td style={{ textAlign: 'left' }}>{p.baseSalary?.toLocaleString()} ج.م</td>
                </tr>
                <tr>
                  <td>البدلات</td>
                  <td style={{ textAlign: 'left', color: '#34d399' }}>
                    +{(p.allowances || 0).toLocaleString()} ج.م
                  </td>
                </tr>
                <tr>
                  <td>الخصومات</td>
                  <td style={{ textAlign: 'left', color: '#fca5a5' }}>
                    -{(p.deductions || 0).toLocaleString()} ج.م
                  </td>
                </tr>
                <tr style={{ background: 'rgba(0, 229, 255, 0.08)' }}>
                  <td><b>الصافي</b></td>
                  <td style={{ textAlign: 'left', color: '#00e5ff', fontWeight: 800 }}>
                    {p.netSalary?.toLocaleString()} ج.م
                  </td>
                </tr>
              </tbody>
            </table>
            <p style={{ marginTop: 8, fontSize: 12, color: 'var(--ss-text-muted)' }}>
              الحالة: {p.status === 'paid' ? '✅ مدفوع' : '⏳ معلق'}
            </p>
          </div>
        ))
      )}
    </div>
  );
}