import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../api';

export default function ScanQr() {
  const [msg, setMsg] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const scannerRef = useRef(null);
  const isMountedRef = useRef(true);

  // ✅ تنظيف الـ scanner عند unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopScanner();
    };
  }, []);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        // 2 = SCANNING, 3 = PAUSED
        if (state === 2 || state === 3) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Stop scanner error:', err);
      }
      scannerRef.current = null;
    }
    if (isMountedRef.current) {
      setScanning(false);
    }
  };

  const startScan = async () => {
    setMsg('');
    setResult(null);

    // ✅ تأكد إن الـ DOM element موجود
    const el = document.getElementById('qr-reader');
    if (!el) {
      setMsg('❌ خطأ في الصفحة، حاول تحديثها');
      return;
    }

    setScanning(true);

    try {
      const scanner = new Html5Qrcode('qr-reader', { verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          // ✅ لما يلاقي QR
          if (!isMountedRef.current) return;
          await stopScanner();
          await handleQrResult(decodedText);
        },
        () => {} // ignore per-frame errors
      );
    } catch (err) {
      console.error('Scan start error:', err);
      if (isMountedRef.current) {
        setScanning(false);
        setMsg('❌ فشل تشغيل الكاميرا: ' + (err.message || 'خطأ'));
      }
      // ✅ تأكد إن الـ scanner اتنضف
      await stopScanner();
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

      // ✅ الحصول على الموقع
      let coords = { lat: null, lng: null };
      try {
        const position = await new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            return reject(new Error('المتصفح لا يدعم GPS'));
          }
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          });
        });
        coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      } catch (geoErr) {
        console.warn('GPS error:', geoErr);
        // ✅ نكمل بدون موقع — ممكن الـ backend يقبل
      }

      const { data } = await api.post('/qr/check-in', {
        token: qrData.token || qrData.qrToken || decodedText,
        lat: coords.lat,
        lng: coords.lng,
      });

      if (!isMountedRef.current) return;
      setResult(data);
      setMsg('✅ تم تسجيل الحضور بنجاح');
    } catch (err) {
      console.error('QR check-in error:', err);
      if (!isMountedRef.current) return;
      const errorMsg =
        err.response?.data?.msg ||
        err.response?.data?.message ||
        err.message ||
        'فشل التسجيل';
      setMsg('❌ ' + errorMsg);
    }
  };

  const resetScan = () => {
    setMsg('');
    setResult(null);
    startScan();
  };

  return (
    <div className="dashboard">
      <h1 style={{ color: 'var(--navy)', marginBottom: 8 }}>📱 مسح QR Code</h1>
      <p style={{ color: 'var(--gray)', marginBottom: 20 }}>
        امسح رمز QR الموجود في الفرع لتسجيل حضورك
      </p>

      {msg && (
        <p
          style={{
            padding: 12,
            background: msg.startsWith('✅')
              ? '#d4edda'
              : msg.startsWith('⏳')
              ? '#fff3cd'
              : '#f8d7da',
            borderRadius: 8,
            marginBottom: 16,
            color: '#000',
          }}
        >
          {msg}
        </p>
      )}

      <div className="glass" style={{ padding: 24, textAlign: 'center' }}>
        <div
          id="qr-reader"
          style={{
            width: '100%',
            maxWidth: 500,
            margin: '0 auto',
            minHeight: scanning ? 300 : 0,
          }}
        ></div>

        {!scanning && !result && (
          <button
            className="btn"
            onClick={startScan}
            style={{ padding: '14px 32px', fontSize: 15, marginTop: 16 }}
          >
            📷 بدء المسح
          </button>
        )}

        {scanning && (
          <>
            <p style={{ marginTop: 16, color: 'var(--gray)' }}>📸 جاري المسح...</p>
            <button
              className="btn gray"
              onClick={stopScanner}
              style={{ marginTop: 12 }}
            >
              ⏹️ إيقاف
            </button>
          </>
        )}
      </div>

      {result && (
        <div className="glass" style={{ padding: 24, marginTop: 20, textAlign: 'center' }}>
          <h3 style={{ color: '#2e7d5b' }}>✅ تم تسجيل الحضور</h3>
          {result.branch?.name && <p style={{ marginTop: 8 }}>الفرع: {result.branch.name}</p>}
          {result.checkIn && (
            <p>الوقت: {new Date(result.checkIn).toLocaleTimeString('ar-EG')}</p>
          )}
          {result.lateMinutes > 0 && (
            <p style={{ color: '#b8860b' }}>⏰ تأخير: {result.lateMinutes} دقيقة</p>
          )}
          <button
            className="btn"
            onClick={resetScan}
            style={{ marginTop: 16 }}
          >
            📷 مسح كود آخر
          </button>
        </div>
      )}
    </div>
  );
}