import React, { useState, useEffect } from 'react';
import api from '../../api';

export default function QrTab() {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [qrImage, setQrImage] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/branches')
      .then(r => setBranches(r.data))
      .catch((err) => console.error('loadBranches error:', err));
  }, []);

  const selectBranch = async (branch) => {
    setSelectedBranch(branch);
    setQrImage('');
    setMsg('');

    try {
      const { data } = await api.get(`/qr/image/${branch._id}`);
      setQrImage(data.qrImage);
      setMsg('');
    } catch (err) {
      setQrImage('');
      setMsg('❌ لم يتم إنشاء QR لهذا الفرع بعد');
    }
  };

  const generateQr = async () => {
    if (!selectedBranch) return;
    try {
      setMsg('⏳ جاري إنشاء QR...');
      await api.post(`/qr/generate/${selectedBranch._id}`, {});
      const { data } = await api.get(`/qr/image/${selectedBranch._id}`);
      setQrImage(data.qrImage);
      setMsg('✅ تم إنشاء QR بنجاح');
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل إنشاء QR'));
    }
  };

  const downloadQr = () => {
    if (!qrImage) return;
    const link = document.createElement('a');
    link.href = qrImage;
    link.download = `QR-${selectedBranch.name}.png`;
    link.click();
  };

  const printQr = () => {
    if (!qrImage) return;
    const w = window.open('', '_blank');
    w.document.write(`
      <html dir="rtl">
        <head>
          <title>QR - ${selectedBranch.name}</title>
          <style>
            body { font-family: Arial; text-align: center; padding: 40px; background: #0a1628; color: #fff; }
            h1 { color: #00e5ff; }
            h2 { color: #f8fafc; }
            img { border: 3px solid #00e5ff; border-radius: 12px; padding: 20px; background: #fff; }
            p { color: rgba(255,255,255,0.7); margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>🎓 Smart School</h1>
          <h2>${selectedBranch.name}</h2>
          <img src="${qrImage}" />
          <p>امسح هذا الرمز لتسجيل الحضور</p>
        </body>
      </html>
    `);
    w.document.close();
    w.print();
  };

  return (
    <div>
      {/* ✅ Header */}
      <div style={{ marginBottom: 16 }}>
        <h3
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
          }}
        >
          📱 QR Code للحضور
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: 0 }}>
          اختر فرعاً لعرض رمز QR الخاص به:
        </p>
      </div>

      {/* ✅ Branch Buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {branches.map(b => (
          <button
            key={b._id}
            onClick={() => selectBranch(b)}
            className={`admin-tab ${selectedBranch?._id === b._id ? 'active' : ''}`}
            style={{ padding: '10px 16px', fontSize: 13 }}
          >
            {b.type === 'main' ? '🏛️' : '🏬'} {b.name}
          </button>
        ))}
      </div>

      {/* ✅ QR Card */}
      {selectedBranch && (
        <div className="ss-glass" style={{ padding: 24, textAlign: 'center' }}>
          <h4
            style={{
              color: '#f8fafc',
              marginBottom: 16,
              fontSize: 17,
              fontWeight: 700,
            }}
          >
            {selectedBranch.type === 'main' ? '🏛️' : '🏬'} {selectedBranch.name}
          </h4>

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

          {qrImage ? (
            <>
              <img
                src={qrImage}
                alt="QR Code"
                style={{
                  border: '3px solid rgba(0, 229, 255, 0.5)',
                  borderRadius: 16,
                  padding: 16,
                  background: '#fff',
                  maxWidth: '100%',
                  maxHeight: 400,
                  boxShadow: '0 8px 32px rgba(0, 229, 255, 0.3)',
                }}
              />

              <div
                style={{
                  marginTop: 20,
                  display: 'flex',
                  gap: 8,
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  className="btn"
                  style={{ padding: '10px 20px', fontSize: 13 }}
                  onClick={downloadQr}
                >
                  📥 تحميل
                </button>
                <button
                  className="btn gray"
                  style={{ padding: '10px 20px', fontSize: 13 }}
                  onClick={printQr}
                >
                  🖨️ طباعة
                </button>
                <button
                  className="btn"
                  style={{
                    padding: '10px 20px',
                    fontSize: 13,
                    background: 'linear-gradient(135deg, #fbbf24, #d97706)',
                  }}
                  onClick={() => {
                    if (window.confirm('تجديد QR سيُبطل الرمز القديم. متابعة؟')) {
                      generateQr();
                    }
                  }}
                >
                  🔄 تجديد
                </button>
              </div>
            </>
          ) : (
            <div>
              <button
                className="btn"
                style={{ padding: '14px 32px', fontSize: 15 }}
                onClick={generateQr}
              >
                ✨ إنشاء QR
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}