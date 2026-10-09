import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../api';
import {
  addToQueue,
  cacheData,
  getCachedData,
  getQueueCount,
} from '../services/offlineStorage';
import { isOnline } from '../services/networkStatus';
import { toCairoTime } from '../utils/dateHelpers';
export default function Attendance() {
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info'); // info | success | error | warning
  const [queueCount, setQueueCount] = useState(0);
  const [online, setOnline] = useState(true);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  // ✅ الحصول على الموقع
  const getLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('المتصفح لا يدعم تحديد الموقع'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  // ✅ عرض رسالة
  const showMsg = (text, type = 'info') => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(''), 5000);
  };

  // ✅ تحميل حضور اليوم
  const loadToday = async () => {
    try {
      setLoading(true);
      const isConn = await isOnline();
      setOnline(isConn);

      if (isConn) {
        // أونلاين: نجيب من API
        const { data } = await axios.get(`${API_URL}/api/attendance/today`, { headers });
        setTodayAttendance(data);
        await cacheData('today_attendance', data);
      } else {
        // أوفلاين: نجيب من الكاش
        const cached = await getCachedData('today_attendance', 1440); // 24 ساعة
        if (cached) {
          setTodayAttendance(cached);
          showMsg('📴 وضع أوفلاين — البيانات المخزنة', 'warning');
        } else {
          showMsg('📴 وضع أوفلاين — لا توجد بيانات مخزنة', 'warning');
        }
      }
    } catch (err) {
      console.error(err);
      const cached = await getCachedData('today_attendance', 1440);
      if (cached) setTodayAttendance(cached);
    } finally {
      setLoading(false);
    }
  };

  // ✅ تحميل عدد الطلبات المعلقة
  const loadQueueCount = async () => {
    const count = await getQueueCount();
    setQueueCount(count);
  };

  useEffect(() => {
    loadToday();
    loadQueueCount();

    const interval = setInterval(() => {
      loadQueueCount();
    }, 5000); // كل 5 ثواني

    return () => clearInterval(interval);
  }, []);

  // ✅ تسجيل الحضور
  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      let location = null;
      try {
        location = await getLocation();
      } catch (err) {
        showMsg('⚠️ فشل الحصول على الموقع: ' + err.message, 'warning');
      }

      const isConn = await isOnline();
      setOnline(isConn);

      if (isConn) {
        // أونلاين: نبعت للـ API
        const { data } = await axios.post(
          `${API_URL}/api/attendance/checkin`,
          { lat: location?.lat, lng: location?.lng },
          { headers }
        );
        setTodayAttendance(data);
        showMsg('✅ تم تسجيل الحضور', 'success');
      } else {
        // أوفلاين: نحفظ في Queue
        await addToQueue({
          type: 'checkin',
          lat: location?.lat,
          lng: location?.lng,
          user: user._id,
        });
        await loadQueueCount();
        showMsg('📴 تم الحفظ محلياً — سيتم المزامنة عند عودة الإنترنت', 'warning');
      }
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.msg || err.message), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ✅ تسجيل الانصراف
  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      let location = null;
      try {
        location = await getLocation();
      } catch (err) {
        showMsg('⚠️ فشل الحصول على الموقع', 'warning');
      }

      const isConn = await isOnline();
      setOnline(isConn);

      if (isConn) {
        const { data } = await axios.post(
          `${API_URL}/api/attendance/checkout`,
          { lat: location?.lat, lng: location?.lng },
          { headers }
        );
        setTodayAttendance(data);
        showMsg('✅ تم تسجيل الانصراف', 'success');
      } else {
        await addToQueue({
          type: 'checkout',
          lat: location?.lat,
          lng: location?.lng,
          user: user._id,
        });
        await loadQueueCount();
        showMsg('📴 تم الحفظ محلياً — سيتم المزامنة عند عودة الإنترنت', 'warning');
      }
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.msg || err.message), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <p style={{ textAlign: 'center', padding: 40 }}>⏳ جاري التحميل...</p>
      </div>
    );
  }

  const checkedIn = todayAttendance?.checkIn;
  const checkedOut = todayAttendance?.checkOut;

  return (
    <div className="dashboard">
      <h1 style={{ color: 'var(--navy)', marginBottom: 8 }}>📍 الحضور والانصراف</h1>
      <p style={{ color: 'var(--gray)', marginBottom: 20 }}>الفرع: {user.branch?.name}</p>

      {/* ✅ حالة الشبكة */}
      <div style={{
        padding: 12,
        borderRadius: 10,
        marginBottom: 16,
        background: online ? '#d4edda' : '#fff3cd',
        color: '#000',
        fontSize: 13,
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>{online ? '🌐 متصل بالإنترنت' : '📴 غير متصل — وضع أوفلاين'}</span>
        {queueCount > 0 && (
          <span style={{
            background: '#b8860b',
            color: '#fff',
            padding: '3px 10px',
            borderRadius: 10,
            fontSize: 11,
          }}>
            ⏳ {queueCount} طلب معلق
          </span>
        )}
      </div>

      {msg && (
        <p style={{
          padding: 12,
          background:
            msgType === 'success' ? '#d4edda' :
            msgType === 'error' ? '#f8d7da' :
            msgType === 'warning' ? '#fff3cd' :
            '#d1ecf1',
          borderRadius: 8,
          marginBottom: 16,
          color: '#000',
          fontSize: 13,
        }}>{msg}</p>
      )}

      {/* ✅ بطاقات الحضور */}
      <div className="grid">
        <div className="stat-card" style={{ background: checkedIn ? 'linear-gradient(145deg, #2e7d5b, #1e5a40)' : 'linear-gradient(145deg, #d4b876, #c9a961)' }}>
          <h3 style={{ color: '#fff' }}>{checkedIn ? '✅' : '📥'}</h3>
          <p style={{ color: '#fff' }}>الحضور</p>
          <p style={{ color: '#fff', fontSize: 12, marginTop: 8 }}>
            {checkedIn ? `تم التسجيل: ${toCairoTime(checkedIn)}` : 'لم يتم التسجيل بعد'}
          </p>
        </div>

        <div className="stat-card" style={{ background: checkedOut ? 'linear-gradient(145deg, #3a4a6b, #2a3550)' : 'linear-gradient(145deg, #d4b876, #c9a961)' }}>
          <h3 style={{ color: '#fff' }}>{checkedOut ? '✅' : '📤'}</h3>
          <p style={{ color: '#fff' }}>الانصراف</p>
          <p style={{ color: '#fff', fontSize: 12, marginTop: 8 }}>
            {checkedOut ? `تم التسجيل: ${toCairoTime(checkedOut)}` : 'لم يتم التسجيل بعد'}
          </p>
        </div>
      </div>

      {/* ✅ أزرار الحضور والانصراف */}
      <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
        <button
          className="btn"
          onClick={handleCheckIn}
          disabled={actionLoading || checkedIn}
          style={{
            flex: 1,
            minWidth: 150,
            background: checkedIn ? '#8b95a7' : 'linear-gradient(145deg, #2e7d5b, #1e5a40)',
            opacity: checkedIn ? 0.6 : 1,
          }}
        >
          {actionLoading ? '⏳' : checkedIn ? '✅ تم الحضور' : '📥 تسجيل الحضور'}
        </button>

        <button
          className="btn"
          onClick={handleCheckOut}
          disabled={actionLoading || !checkedIn || checkedOut}
          style={{
            flex: 1,
            minWidth: 150,
            background: checkedOut || !checkedIn ? '#8b95a7' : 'linear-gradient(145deg, #3a4a6b, #2a3550)',
            opacity: checkedOut || !checkedIn ? 0.6 : 1,
          }}
        >
          {actionLoading ? '⏳' : checkedOut ? '✅ تم الانصراف' : '📤 تسجيل الانصراف'}
        </button>
      </div>
    </div>
  );
}