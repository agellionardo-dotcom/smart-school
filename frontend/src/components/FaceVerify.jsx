// frontend/src/components/FaceVerify.jsx
// كاميرا + تحقق من الوجه

import React, { useState, useRef, useEffect, useCallback } from 'react';
import useFaceApi from '../hooks/useFaceApi';
import api from '../api';

export default function FaceVerify({ onSuccess, onCancel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [statusMsg, setStatusMsg] = useState('جاري تشغيل الكاميرا...');
  const [faceDetected, setFaceDetected] = useState(false);

  const { loaded, loading, error, getDescriptor } = useFaceApi();

  // ✅ تشغيل الكاميرا
  const startCamera = useCallback(async () => {
    setStatus('starting');
    setStatusMsg('جاري تشغيل الكاميرا...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStatus('ready');
      setStatusMsg('حط وجهك في الدائرة');
    } catch (err) {
      console.error('Camera error:', err);
      setStatus('error');
      setStatusMsg('❌ فشل تشغيل الكاميرا: ' + err.message);
    }
  }, []);

  // ✅ إيقاف الكاميرا
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // ✅ بدء الكاميرا
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // ✅ كشف الوجه (Preview)
  useEffect(() => {
    if (status !== 'ready' || !loaded) return;
    if (!videoRef.current) return;

    let interval = setInterval(async () => {
      if (!videoRef.current || status !== 'ready') return;

      const result = await getDescriptor(videoRef.current);
      setFaceDetected(!!result);
      if (result) {
        setStatusMsg('✅ تم كشف الوجه — جاهز للتحقق');
      } else {
        setStatusMsg('حط وجهك في الدائرة');
      }
    }, 800);

    return () => clearInterval(interval);
  }, [status, loaded, getDescriptor]);

  // ✅ التحقق
  const handleVerify = useCallback(async () => {
    if (!videoRef.current) return;

    setStatus('detecting');
    setStatusMsg('جاري التحقق...');

    try {
      const result = await getDescriptor(videoRef.current);

      if (!result) {
        setStatus('ready');
        setStatusMsg('❌ مفيش وجه واضح — حاول تاني');
        return;
      }

      setStatus('saving');
      setStatusMsg('جاري المقارنة...');

      const { data } = await api.post('/face/verify', {
        faceDescriptor: result.descriptor,
      });

      console.log('[FaceVerify] Result:', data);

      if (data.match) {
        setStatus('success');
        setStatusMsg('✅ تم التحقق بنجاح!');
        stopCamera();
        if (onSuccess) {
          setTimeout(() => onSuccess(data), 1000);
        }
      } else {
        setStatus('error');
        setStatusMsg('❌ الوجه مش مطابق — حاول تاني');
        setTimeout(() => {
          setStatus('ready');
          setStatusMsg('حط وجهك في الدائرة');
        }, 2500);
      }
    } catch (err) {
      console.error('Verify error:', err);
      setStatus('ready');
      setStatusMsg(
        '❌ ' + (err.response?.data?.msg || err.message || 'فشل التحقق')
      );
    }
  }, [getDescriptor, stopCamera, onSuccess]);

  const handleCancel = () => {
    stopCamera();
    if (onCancel) onCancel();
  };

  return (
    <div className="ss-glass" style={{ padding: 20, direction: 'rtl' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h3
          style={{
            margin: 0,
            color: '#f8fafc',
            fontSize: 18,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          👤 التحقق من الوجه
        </h3>
        <button
          onClick={handleCancel}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#f8fafc',
            width: 36,
            height: 36,
            borderRadius: 10,
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          ✕
        </button>
      </div>

      {/* Video */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4/3',
          borderRadius: 16,
          overflow: 'hidden',
          background: '#0a1420',
          border: faceDetected
            ? '2px solid #10b981'
            : '2px solid rgba(0,229,255,0.3)',
          transition: 'border-color 0.3s',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '60%',
            aspectRatio: '1',
            borderRadius: '50%',
            border: faceDetected
              ? '3px dashed #10b981'
              : '3px dashed rgba(0,229,255,0.6)',
            pointerEvents: 'none',
            transition: 'border-color 0.3s',
          }}
        />

        {status === 'starting' || status === 'detecting' || status === 'saving' ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f8fafc',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            ⏳ {statusMsg}
          </div>
        ) : null}
      </div>

      {/* Status */}
      <div
        style={{
          marginTop: 16,
          padding: 12,
          borderRadius: 10,
          background:
            status === 'success'
              ? 'rgba(16, 185, 129, 0.15)'
              : status === 'error'
              ? 'rgba(239, 68, 68, 0.15)'
              : 'rgba(0, 229, 255, 0.08)',
          color:
            status === 'success'
              ? '#34d399'
              : status === 'error'
              ? '#fca5a5'
              : '#67e8f9',
          fontSize: 13,
          fontWeight: 700,
          textAlign: 'center',
          border: `1px solid ${
            status === 'success'
              ? 'rgba(16, 185, 129, 0.3)'
              : status === 'error'
              ? 'rgba(239, 68, 68, 0.3)'
              : 'rgba(0, 229, 255, 0.2)'
          }`,
        }}
      >
        {statusMsg}
      </div>

      {/* Buttons */}
      <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
        <button
          onClick={handleVerify}
          disabled={
            !loaded ||
            loading ||
            status === 'starting' ||
            status === 'detecting' ||
            status === 'saving' ||
            !faceDetected
          }
          style={{
            flex: 1,
            padding: '14px 20px',
            borderRadius: 12,
            border: 'none',
            background: faceDetected
              ? 'linear-gradient(135deg, #00e5ff, #a855f7)'
              : 'rgba(255,255,255,0.08)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: faceDetected ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            opacity: faceDetected ? 1 : 0.5,
            transition: 'all 0.3s',
          }}
        >
          {status === 'detecting'
            ? '⏳ جاري التحقق...'
            : status === 'saving'
            ? '⏳ جاري المقارنة...'
            : '✅ تحقق'}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#fca5a5',
            borderRadius: 8,
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {!loaded && !error && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            background: 'rgba(0, 229, 255, 0.08)',
            color: '#67e8f9',
            borderRadius: 8,
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          ⏳ جاري تحميل نماذج التعرف على الوجه...
        </div>
      )}
    </div>
  );
}