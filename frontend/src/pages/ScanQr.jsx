import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../api';

export default function ScanQr() {
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const scannerRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopScanner();
    };
  }, []);

  const showMsg = (text, type = 'info') => {
    setMsg(text);
    setMsgType(type);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
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

    const el = document.getElementById('qr-reader');
    if (!el) {
      showMsg('❌ خطأ في الصفحة، حاول تحديثها', 'error');
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
          if (!isMountedRef.current) return;
          await stopScanner();
          await handleQrResult(decodedText);
        },
        () => {}
      );
    } catch (err) {
      console.error('Scan start error:', err);
      if (isMountedRef.current) {
        setScanning(false);
        showMsg('❌ فشل تشغيل الكاميرا: ' + (err.message || 'خطأ'), 'error');
      }
      await stopScanner();
    }
  };

  const handleQrResult = async (decodedText) => {
    try {
      showMsg('⏳ جاري التحقق...', 'info');

      let qrData;
      try {
        qrData = JSON.parse(decodedText);
      } catch {
        showMsg('❌ رمز QR غير صالح', 'error');
        return;
      }

      if (!qrData.branchId || !qrData.token) {
        showMsg('❌ رمز QR غير مكتمل — تأكد من مسح الرمز الصحيح', 'error');
        return;
      }

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
        showMsg('❌ يجب السماح بالوصول للموقع لتسجيل الحضور', 'error');
        return;
      }

      const { data } = await api.post('/qr/check-in', {
        branchId: qrData.branchId,
        token: qrData.token,
        lat: coords.lat,
        lng: coords.lng,
      });

      if (!isMountedRef.current) return;
      setResult(data);
      showMsg('✅ ' + (data.msg || 'تم تسجيل الحضور بنجاح'), 'success');
    } catch (err) {
      console.error('QR check-in error:', err);
      if (!isMountedRef.current) return;
      const errorMsg =
        err.response?.data?.msg ||
        err.response?.data?.message ||
        err.message ||
        'فشل التسجيل';
      showMsg('❌ ' + errorMsg, 'error');
    }
  };

  const resetScan = () => {
    setMsg('');
    setResult(null);
    startScan();
  };

  return (
    <div className="dashboard">
      {/* ✅ Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            marginBottom: 8,
            fontSize: 28,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #00e5ff, #a855f7)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block',
          }}
        >
          📱 مسح QR Code
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: 14 }}>
          امسح رمز QR الموجود في الفرع لتسجيل حضورك
        </p>
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
                : msgType === 'error'
                ? 'rgba(239, 68, 68, 0.15)'
                : 'rgba(251, 191, 36, 0.15)',
            color:
              msgType === 'success'
                ? '#34d399'
                : msgType === 'error'
                ? '#fca5a5'
                : '#fcd34d',
            border: `1px solid ${
              msgType === 'success'
                ? 'rgba(16, 185, 129, 0.3)'
                : msgType === 'error'
                ? 'rgba(239, 68, 68, 0.3)'
                : 'rgba(251, 191, 36, 0.3)'
            }`,
            animation: 'ssFadeIn 0.3s ease',
          }}
        >
          {msg}
        </div>
      )}

      {/* ✅ Scanner */}
      <div className="ss-glass" style={{ padding: 24, textAlign: 'center' }}>
        <div
          id="qr-reader"
          style={{
            width: '100%',
            maxWidth: 500,
            margin: '0 auto',
            minHeight: scanning ? 300 : 0,
            borderRadius: 16,
            overflow: 'hidden',
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
            <p style={{ marginTop: 16, color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
              📸 جاري المسح...
            </p>
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

      {/* ✅ Result */}
      {result && (
        <div
          className="ss-glass"
          style={{
            padding: 24,
            marginTop: 20,
            textAlign: 'center',
            borderRight: '3px solid #10b981',
            background:
              'linear-gradient(90deg, rgba(16, 185, 129, 0.08), transparent)',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <h3
            style={{
              color: '#34d399',
              marginBottom: 12,
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            تم تسجيل الحضور
          </h3>

          {result.branch && (
            <p style={{ marginTop: 8, color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
              🏢 الفرع: {result.branch}
            </p>
          )}
          {result.attendance?.checkIn && (
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
              🕐 الوقت: {new Date(result.attendance.checkIn).toLocaleTimeString('ar-EG')}
            </p>
          )}
          {result.lateMinutes > 0 && (
            <p style={{ color: '#fcd34d', fontWeight: 600, fontSize: 14 }}>
              ⏰ تأخير: {result.lateMinutes} دقيقة
            </p>
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