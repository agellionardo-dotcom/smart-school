import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../api';

export default function ScanQr() {
  const [msg, setMsg] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const qrRef = useRef(null);
  const scannerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScan = async () => {
    setMsg('');
    setResult(null);
    setScanning(true);

    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await scanner.stop();
          setScanning(false);
          await handleQrResult(decodedText);
        },
        () => {}
      );
    } catch (err) {
      setScanning(false);
      setMsg('❌ فشل تشغيل الكاميرا: ' + err.message);
    }
  };

  const handleQrResult = async (decodedText) => {
    try {
      setMsg('⏳ جاري التحقق...');

      let qrData;
      try {
        qrData = JSON.parse(decodedText);
      } catch {
        qrData = { token: decodedText };
      }

      // الحصول على الموقع
      const position = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('لا يدعم GPS'));
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 10000,
        });
      });

      const { data } = await api.post('/qr/check-in', {
        token: qrData.token || qrData.qrToken || decodedText,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });

      setResult(data);
      setMsg('✅ تم تسجيل الحضور بنجاح');
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || err.message || 'فشل التسجيل'));
    }
  };

  return (
    <div className="dashboard">
      <h1 style={{ color: 'var(--navy)', marginBottom: 8 }}>📱 مسح QR Code</h1>
      <p style={{ color: 'var(--gray)', marginBottom: 20 }}>
        امسح رمز QR الموجود في الفرع لتسجيل حضورك
      </p>

      {msg && (
        <p style={{
          padding: 12,
          background: msg.startsWith('✅') ? '#d4edda' : msg.startsWith('⏳') ? '#fff3cd' : '#f8d7da',
          borderRadius: 8, marginBottom: 16, color: '#000'
        }}>{msg}</p>
      )}

      <div className="glass" style={{ padding: 24, textAlign: 'center' }}>
        <div id="qr-reader" style={{ width: '100%', maxWidth: 500, margin: '0 auto' }}></div>

        {!scanning && (
          <button className="btn" onClick={startScan} style={{ padding: '14px 32px', fontSize: 15, marginTop: 16 }}>
            📷 بدء المسح
          </button>
        )}

        {scanning && (
          <p style={{ marginTop: 16, color: 'var(--gray)' }}>📸 جاري المسح...</p>
        )}
      </div>

      {result && (
        <div className="glass" style={{ padding: 24, marginTop: 20, textAlign: 'center' }}>
          <h3 style={{ color: '#2e7d5b' }}>✅ تم تسجيل الحضور</h3>
          <p style={{ marginTop: 8 }}>الفرع: {result.branch?.name}</p>
          <p>الوقت: {new Date(result.checkIn).toLocaleTimeString('ar-EG')}</p>
          {result.lateMinutes > 0 && (
            <p style={{ color: '#b8860b' }}>⏰ تأخير: {result.lateMinutes} دقيقة</p>
          )}
        </div>
      )}
    </div>
  );
}