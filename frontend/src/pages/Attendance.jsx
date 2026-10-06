import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../api';
import { saveData, getData, addToQueue, getQueue, removeFromQueue } from '../services/offlineStorage';
import { startNetworkMonitoring, isOnline } from '../services/networkStatus';

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [msg, setMsg] = useState('');
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  // مراقبة حالة الاتصال
  useEffect(() => {
    const listener = startNetworkMonitoring((isConnected) => {
      setOnline(isConnected);
      if (isConnected) {
        syncPendingRequests();
      }
    });

    // فحص أولي
    isOnline().then(setOnline);

    return () => {
      if (listener && listener.remove) listener.remove();
    };
  }, []);

  // تحميل السجلات
  const load = async () => {
    try {
      const r = await axios.get(`${API_URL}/api/attendance/my`, { headers });
      setRecords(r.data.list);
      // حفظ السجلات محلياً للاستخدام بدون إنترنت
      await saveData('attendance_records', r.data.list);
    } catch (e) {
      // إذا فشل الاتصال، استخدم البيانات المحفوظة
      const cached = await getData('attendance_records');
      if (cached) {
        setRecords(cached);
        setMsg('📴 لا يوجد اتصال - يتم عرض البيانات المحفوظة');
      }
    }
  };

  useEffect(() => {
    load();
    updatePendingCount();
  }, []);

  // تحديث عدد الطلبات المعلقة
  const updatePendingCount = async () => {
    const queue = await getQueue();
    setPendingCount(queue.length);
  };

  // مزامنة الطلبات المعلقة
  const syncPendingRequests = async () => {
    const queue = await getQueue();
    if (queue.length === 0) return;

    setMsg(`🔄 جاري مزامنة ${queue.length} طلب...`);

    for (const item of queue) {
      try {
        await axios.post(
          `${API_URL}/api/attendance/${item.type}`,
          { lat: item.lat, lng: item.lng },
          { headers }
        );
        await removeFromQueue(item.id);
      } catch (e) {
        console.error('Sync failed:', e);
      }
    }

    setMsg('✅ تمت المزامنة بنجاح');
    await updatePendingCount();
    load();
  };

  // الحصول على الموقع
  const getLocation = () => new Promise((res, rej) => {
    navigator.geolocation.getCurrentPosition(
      p => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      rej, { enableHighAccuracy: true }
    );
  });

  // تنفيذ العملية (حضور أو انصراف)
  const action = async (type) => {
    try {
      setMsg('📍 جاري تحديد الموقع...');
      const loc = await getLocation();

      // محاولة الإرسال للخادم
      try {
        await axios.post(`${API_URL}/api/attendance/${type}`, loc, { headers });
        setMsg(`✅ تم تسجيل ${type === 'check-in' ? 'الحضور' : 'الانصراف'} بنجاح`);
        load();
      } catch (error) {
        // إذا فشل الاتصال، احفظ الطلب في قائمة الانتظار
        if (!error.response) {
          await addToQueue({ type, lat: loc.lat, lng: loc.lng });
          await updatePendingCount();
          setMsg('📴 لا يوجد اتصال - تم حفظ الطلب وسيتم إرساله تلقائياً عند عودة الاتصال');
        } else {
          setMsg('❌ ' + (error.response?.data?.msg || 'حدث خطأ'));
        }
      }
    } catch (e) {
      setMsg('❌ ' + (e.message || 'فشل تحديد الموقع'));
    }
  };

  return (
    <div className="dashboard">
      {/* شريط حالة الاتصال */}
      <div style={{
        padding: '8px 16px',
        marginBottom: 16,
        borderRadius: 8,
        backgroundColor: online ? '#d4edda' : '#f8d7da',
        color: online ? '#155724' : '#721c24',
        fontWeight: 'bold',
        textAlign: 'center'
      }}>
        {online ? '🌐 متصل بالإنترنت' : '📴 غير متصل - يعمل بدون إنترنت'}
        {pendingCount > 0 && (
          <span style={{ marginRight: 10 }}>
            ({pendingCount} طلب في الانتظار)
          </span>
        )}
      </div>

      <h1 style={{ color: 'var(--navy)', marginBottom: 20 }}>الحضور والانصراف</h1>

      <div className="grid">
        <button className="btn" onClick={() => action('check-in')}>
          تسجيل الحضور
        </button>
        <button className="btn gray" onClick={() => action('check-out')}>
          تسجيل الانصراف
        </button>
      </div>

      {msg && (
        <p style={{ marginTop: 20, fontWeight: 'bold', color: 'var(--navy)' }}>
          {msg}
        </p>
      )}

      <div className="glass" style={{ padding: 24, marginTop: 30 }}>
        <h3 style={{ color: 'var(--navy)' }}>سجل الحضور</h3>
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>الحضور</th>
              <th>الانصراف</th>
              <th>التأخير</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r._id}>
                <td>{new Date(r.date).toLocaleDateString('ar-EG')}</td>
                <td>{r.checkIn ? new Date(r.checkIn).toLocaleTimeString('ar-EG') : '-'}</td>
                <td>{r.checkOut ? new Date(r.checkOut).toLocaleTimeString('ar-EG') : '-'}</td>
                <td>{r.lateMinutes} د</td>
                <td>{r.status === 'late' ? 'متأخر' : 'في الوقت'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}