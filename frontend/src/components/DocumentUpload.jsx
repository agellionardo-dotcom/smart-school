import React, { useState, useEffect } from 'react';
import api from '../api';

const TYPES = [
  { value: 'national_id', label: '🪪 بطاقة الرقم القومي' },
  { value: 'birth_certificate', label: '📜 شهادة الميلاد' },
  { value: 'degree', label: '🎓 المؤهل الدراسي' },
  { value: 'contract', label: '📝 العقد' },
  { value: 'health_insurance', label: '🏥 التأمين الصحي' },
  { value: 'social_insurance', label: '🛡️ التأمينات الاجتماعية' },
  { value: 'bank_account', label: '🏦 بيانات البنك' },
  { value: 'experience', label: '💼 شهادة خبرة' },
  { value: 'personal_photo', label: '📸 صورة شخصية' },
  { value: 'training', label: '🎖️ شهادة تدريب' },
  { value: 'medical_report', label: '📋 تقرير طبي' },
  { value: 'driving_license', label: '🚗 رخصة قيادة' },
  { value: 'signature', label: '✍️ التوقيع' },
  { value: 'pledge', label: '📄 تعهد' },
  { value: 'other', label: '📎 أخرى' },
];

export default function DocumentUpload({ userId, userName, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [type, setType] = useState('national_id');
  const [title, setTitle] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (f) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      setError('⚠️ حجم الملف أكبر من 10 MB');
      return;
    }
    setFile(f);
    setError('');
    if (!title) {
      setTitle(f.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!file) {
      setError('⚠️ الملف مطلوب');
      return;
    }
    if (!title.trim()) {
      setError('⚠️ اسم المستند مطلوب');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      formData.append('type', type);
      formData.append('title', title.trim());
      if (issueDate) formData.append('issueDate', issueDate);
      if (expiryDate) formData.append('expiryDate', expiryDate);
      if (notes) formData.append('notes', notes.trim());

      const { data } = await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (onSuccess) onSuccess(data);
    } catch (err) {
      console.error('Upload error:', err);
      setError('❌ ' + (err.response?.data?.msg || err.message || 'فشل الرفع'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ color: 'var(--navy)', margin: 0 }}>📤 رفع مستند</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        <p style={{ color: 'var(--gray)', fontSize: 13, marginBottom: 16 }}>
          الموظف: <b>{userName}</b>
        </p>

        <form onSubmit={submit}>
          {/* نوع المستند */}
          <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>نوع المستند *</label>
          <select
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ marginTop: 4, marginBottom: 12 }}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {/* اسم المستند */}
          <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>اسم المستند *</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: بطاقة الرقم القومي 2024"
            style={{ marginTop: 4, marginBottom: 12 }}
          />

          {/* رفع الملف */}
          <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>الملف *</label>
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input').click()}
            style={{
              marginTop: 4,
              marginBottom: 12,
              padding: 24,
              border: `2px dashed ${dragActive ? '#0a1f44' : '#8b95a7'}`,
              borderRadius: 12,
              textAlign: 'center',
              cursor: 'pointer',
              background: dragActive ? '#f0f4fa' : '#f8fafc',
              transition: 'all 0.2s',
            }}
          >
            <input
              id="file-input"
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={(e) => handleFileChange(e.target.files[0])}
              style={{ display: 'none' }}
            />
            {file ? (
              <>
                <div style={{ fontSize: 32 }}>📎</div>
                <div style={{ fontWeight: 700, color: 'var(--navy)', marginTop: 8 }}>
                  {file.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 4 }}>
                  {(file.size / 1024).toFixed(0)} KB
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 32 }}>📤</div>
                <div style={{ fontWeight: 700, color: 'var(--navy)', marginTop: 8 }}>
                  اسحب الملف هنا أو اضغط للاختيار
                </div>
                <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 4 }}>
                  PDF, JPG, PNG, DOC — حد أقصى 10 MB
                </div>
              </>
            )}
          </div>

          {/* تواريخ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>تاريخ الإصدار</label>
              <input
                type="date"
                className="input"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                style={{ marginTop: 4 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>تاريخ الانتهاء</label>
              <input
                type="date"
                className="input"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                style={{ marginTop: 4 }}
              />
            </div>
          </div>

          {/* ملاحظات */}
          <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>ملاحظات</label>
          <textarea
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="ملاحظات إضافية (اختياري)"
            style={{ marginTop: 4, marginBottom: 12, resize: 'vertical', fontFamily: 'inherit' }}
          />

          {error && (
            <p style={{ padding: 10, background: '#f8d7da', borderRadius: 8, fontSize: 13, color: '#8e2b2b', marginBottom: 12 }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="submit"
              className="btn"
              disabled={loading}
              style={{ flex: 1, padding: 12 }}
            >
              {loading ? '⏳ جاري الرفع...' : '📤 رفع المستند'}
            </button>
            <button
              type="button"
              className="btn gray"
              onClick={onClose}
              disabled={loading}
              style={{ padding: 12 }}
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .modal-content {
          background: #fff;
          padding: 24px;
          border-radius: 16px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          direction: rtl;
        }
      `}</style>
    </div>
  );
}