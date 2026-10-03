import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../api';

export default function QrTab() {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [qrImage, setQrImage] = useState('');
  const [msg, setMsg] = useState('');
  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  useEffect(() => {
    axios.get(`${API_URL}/api/admin/branches`, { headers })
      .then(r => setBranches(r.data))
      .catch(() => {});
  }, []);

  const selectBranch = async (branch) => {
    setSelectedBranch(branch);
    setQrImage('');
    setMsg('');

    try {
      const { data } = await axios.get(`${API_URL}/api/qr/image/${branch._id}`, { headers });
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
      await axios.post(`${API_URL}/api/qr/generate/${selectedBranch._id}`, {}, { headers });
      const { data } = await axios.get(`${API_URL}/api/qr/image/${selectedBranch._id}`, { headers });
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
            body { font-family: Arial; text-align: center; padding: 40px; }
            h1 { color: #0a1f44; }
            img { border: 3px solid #0a1f44; border-radius: 12px; padding: 20px; }
            p { color: #5a6478; margin-top: 20px; }
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
      <h3 style={{ color: 'var(--navy)', marginBottom: 16 }}>📱 QR Code للحضور</h3>

      <p style={{ color: 'var(--gray)', fontSize: 13, marginBottom: 12 }}>
        اختر فرعاً لعرض رمز QR الخاص به:
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {branches.map(b => (
          <button
            key={b._id}
            onClick={() => selectBranch(b)}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: 'none',
              background: selectedBranch?._id === b._id
                ? 'linear-gradient(145deg, #0a1f44, #142b5c)'
                : '#8b95a7',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              fontFamily: 'inherit'
            }}
          >
            {b.type === 'main' ? '🏛️' : '🏬'} {b.name}
          </button>
        ))}
      </div>

      {selectedBranch && (
        <div className="glass" style={{ padding: 24, textAlign: 'center' }}>
          <h4 style={{ color: 'var(--navy)', marginBottom: 16 }}>
            {selectedBranch.type === 'main' ? '🏛️' : '🏬'} {selectedBranch.name}
          </h4>

          {msg && (
            <p style={{
              padding: 12,
              background: msg.startsWith('✅') ? '#d4edda' : msg.startsWith('⏳') ? '#fff3cd' : '#f8d7da',
              borderRadius: 8,
              marginBottom: 16,
              color: '#000'
            }}>{msg}</p>
          )}

          {qrImage ? (
            <>
              <img
                src={qrImage}
                alt="QR Code"
                style={{
                  border: '3px solid #0a1f44',
                  borderRadius: 12,
                  padding: 16,
                  background: '#fff',
                  maxWidth: '100%',
                  maxHeight: 400
                }}
              />

              <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn" style={{ padding: '10px 20px', fontSize: 13 }} onClick={downloadQr}>
                  📥 تحميل
                </button>
                <button className="btn gray" style={{ padding: '10px 20px', fontSize: 13 }} onClick={printQr}>
                  🖨️ طباعة
                </button>
                <button
                  className="btn"
                  style={{ padding: '10px 20px', fontSize: 13, background: '#b8860b' }}
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