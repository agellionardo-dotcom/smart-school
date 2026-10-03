import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../api';
import { useNavigate } from 'react-router-dom';

export default function ScanQr() {
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const scannerRef = useRef(null);
  const processedRef = useRef(false);
  const nav = useNavigate();
  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  useEffect(() => {
    let scanner = null;

    const initScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');

        scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          async (decodedText) => {
            if (processing || processedRef.current || success) return;
            processedRef.current = true;
            setProcessing(true);

            try {
              const data = JSON.parse(decodedText);

              if (data.type !== 'smart_school_attendance') {
                setMsg('❌ رمز QR غير صالح');
                setMsgType('error');
                setTimeout(() => {
                  processedRef.current = false;
                  setProcessing(false);
                }, 3000);
                return;
              }

              setMsg('📍 جاري التحقق من موقعك...');
              setMsgType('info');

              const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                  resolve, reject,
                  { enableHighAccuracy: true, timeout: 10000 }
                );
              });

              const loc = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };

              setMsg('📤 جاري تسجيل الحضور...');

              const { data: result } = await axios.post(`${API_URL}/api/qr/check-in`, {
                branchId: data.branchId,
                token: data.token,
                lat: loc.lat,
                lng: loc.lng
              }, { headers });

              setMsg(`✅ ${result.msg} - ${result.branch}`);
              setMsgType('success');
              setSuccess(true);

              try { await scanner.stop(); } catch (e) {}
              scannerRef.current = null;

              setTimeout(() => nav('/attendance'), 2500);
            } catch (err) {
              const errorMsg = err.response?.data?.msg || err.message || 'فشل التسجيل';
              setMsg('❌ ' + errorMsg);
              setMsgType('error');
              setTimeout(() => {
                processedRef.current = false;
                setProcessing(false);
              }, 3000);
            }
          },
          (error) => {
            // أخطاء المسح المتكررة — تجاهل
          }
        );
      } catch (err) {
        setMsg('❌ فشل تشغيل الكاميرا — تأكد من الأذونات');
        setMsgType('error');
      }
    };

    initScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="dashboard">
      <h1 style={{ color: 'var(--navy)', marginBottom: 8 }}>📱 مسح QR للحضور</h1>
      <p style={{ color: 'var(--gray)', marginBottom: 20 }}>
        وجّه الكاميرا إلى رمز QR الموجود في الفرع
      </p>

      {msg && (
        <div style={{
          padding: 16,
          background:
            msgType === 'success' ? '#d4edda' :
            msgType === 'error' ? '#f8d7da' :
            '#fff3cd',
          color:
            msgType === 'success' ? '#155724' :
            msgType === 'error' ? '#721c24' :
            '#856404',
          borderRadius: 12,
          marginBottom: 20,
          textAlign: 'center',
          fontSize: 15,
          fontWeight: 'bold'
        }}>
          {msg}
        </div>
      )}

      <div className="glass" style={{ padding: 12 }}>
        <div id="qr-reader" style={{ width: '100%', borderRadius: 12, overflow: 'hidden' }}></div>
      </div>

      <div style={{
        marginTop: 20,
        padding: 16,
        background: '#eef4ff',
        borderRadius: 12,
        fontSize: 13,
        color: '#2e4373',
        lineHeight: 1.8
      }}>
        💡 <b>كيف يعمل:</b>
        <ol style={{ marginTop: 8, paddingRight: 20 }}>
          <li>افتح هذه الصفحة داخل الفرع</li>
          <li>اسمح بالوصول للكاميرا والموقع</li>
          <li>وجّه الكاميرا نحو رمز QR</li>
          <li>سيتم التسجيل تلقائياً</li>
        </ol>
      </div>
    </div>
  );
}