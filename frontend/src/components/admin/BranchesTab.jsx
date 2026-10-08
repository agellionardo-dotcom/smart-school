import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../api';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// ✅ أيقونة الموقع المختار
const pickerIcon = new L.DivIcon({
  html: `<div style="
    background: linear-gradient(145deg, #e74c3c, #c0392b);
    width: 36px; height: 36px; border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 4px 12px rgba(231,76,60,0.6);
    border: 3px solid #fff;
    display:flex; align-items:center; justify-content:center;
  "><span style="transform:rotate(45deg); font-size:16px;">📍</span></div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 36]
});

// ✅ مكون اختيار الموقع (Click + Drag)
function LocationPicker({ position, onChange }) {
  const map = useMapEvents({
    click(e) {
      onChange({
        lat: parseFloat(e.latlng.lat.toFixed(6)),
        lng: parseFloat(e.latlng.lng.toFixed(6))
      });
    }
  });

  return position.lat && position.lng ? (
    <Marker
      position={[position.lat, position.lng]}
      icon={pickerIcon}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const pos = marker.getLatLng();
          onChange({
            lat: parseFloat(pos.lat.toFixed(6)),
            lng: parseFloat(pos.lng.toFixed(6))
          });
        }
      }}
    />
  ) : null;
}

// ✅ مكون تحديث الخريطة عند تغيير الإحداثيات
function MapUpdater({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center && center[0] && center[1] && !isNaN(center[0]) && !isNaN(center[1])) {
      map.flyTo(center, map.getZoom(), { duration: 1 });
    }
  }, [center, map]);

  return null;
}

export default function BranchesTab() {
  const [branches, setBranches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editBranch, setEditBranch] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapType, setMapType] = useState('satellite'); // ✅ افتراضي قمر صناعي
  const [form, setForm] = useState({
    name: '', type: 'sub', parent: '', radius: 100,
    lat: '', lng: '', address: '', phone: ''
  });
  const [msg, setMsg] = useState('');
  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  const loadBranches = () => {
    axios.get(`${API_URL}/api/admin/branches`, { headers })
      .then(r => setBranches(r.data))
      .catch(() => {});
  };

  useEffect(() => { loadBranches(); }, []);

  const resetForm = () => {
    setForm({
      name: '', type: 'sub', parent: '', radius: 100,
      lat: '', lng: '', address: '', phone: ''
    });
    setEditBranch(null);
    setShowMapPicker(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        type: form.type,
        parent: form.type === 'sub' ? form.parent : null,
        radius: Number(form.radius),
        location: { lat: Number(form.lat), lng: Number(form.lng) },
        address: form.address,
        phone: form.phone
      };

      if (editBranch) {
        await axios.put(`${API_URL}/api/admin/branches/${editBranch._id}`, payload, { headers });
        setMsg('✅ تم تعديل الفرع');
      } else {
        await axios.post(`${API_URL}/api/admin/branches`, payload, { headers });
        setMsg('✅ تم إضافة الفرع');
      }

      resetForm();
      setShowForm(false);
      loadBranches();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل'));
    }
  };

  const startEdit = (branch) => {
    setEditBranch(branch);
    setForm({
      name: branch.name || '',
      type: branch.type || 'sub',
      parent: branch.parent || '',
      radius: branch.radius || 100,
      lat: branch.location?.lat || '',
      lng: branch.location?.lng || '',
      address: branch.address || '',
      phone: branch.phone || ''
    });
    setShowForm(true);
    setShowMapPicker(true); // ✅ نفتح الخريطة على طول
    window.scrollTo(0, 0);
  };

  const deleteBranch = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف الفرع؟')) return;
    try {
      await axios.delete(`${API_URL}/api/admin/branches/${id}`, { headers });
      setMsg('✅ تم الحذف');
      loadBranches();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل'));
    }
  };

  const mainBranches = branches.filter(b => b.type === 'main');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ color: 'var(--navy)' }}>🏢 الفروع ({branches.length})</h3>
        <button
          className="btn"
          onClick={() => { setShowForm(!showForm); resetForm(); }}
        >
          {showForm ? '❌ إلغاء' : '➕ إضافة فرع'}
        </button>
      </div>

      {msg && (
        <p style={{
          padding: 12,
          background: msg.startsWith('✅') ? '#d4edda' : '#f8d7da',
          borderRadius: 8,
          marginBottom: 16,
          color: '#000'
        }}>{msg}</p>
      )}

      {showForm && (
        <div className="glass" style={{ padding: 24, marginBottom: 20 }}>
          <h4 style={{ color: 'var(--navy)', marginBottom: 16 }}>
            {editBranch ? '✏️ تعديل فرع' : '➕ إضافة فرع جديد'}
          </h4>
          <form onSubmit={submit}>
            <input className="input" placeholder="اسم الفرع *" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} required />
            <br /><br />

            <label>نوع الفرع *</label>
            <select className="input" value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="main">فرع رئيسي</option>
              <option value="sub">فرع فرعي</option>
            </select>
            <br /><br />

            {form.type === 'sub' && (
              <>
                <label>الفرع الرئيسي *</label>
                <select className="input" value={form.parent}
                  onChange={e => setForm({ ...form, parent: e.target.value })} required>
                  <option value="">اختر الفرع الرئيسي</option>
                  {mainBranches
                    .filter(b => !editBranch || b._id !== editBranch._id)
                    .map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
                <br /><br />
              </>
            )}

            <label>نطاق التسجيل (متر) *</label>
            <input className="input" type="number" min="1" max="500"
              value={form.radius}
              onChange={e => setForm({ ...form, radius: e.target.value })} required />
            <br /><br />

            <label style={{ fontWeight: 'bold', color: 'var(--navy)' }}>📍 الموقع الجغرافي *</label>
            <br /><br />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn"
                style={{ padding: '10px 16px', fontSize: 13, flex: 1, minWidth: 150 }}
                onClick={() => setShowMapPicker(!showMapPicker)}
              >
                {showMapPicker ? '❌ إخفاء الخريطة' : '🗺️ اختر من الخريطة'}
              </button>
              <button
                type="button"
                className="btn"
                style={{ padding: '10px 16px', fontSize: 13, background: 'linear-gradient(145deg, #2e7d5b, #1e5a40)', flex: 1, minWidth: 150 }}
                onClick={() => {
                  if (!navigator.geolocation) {
                    alert('❌ المتصفح لا يدعم تحديد الموقع');
                    return;
                  }
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      setForm({
                        ...form,
                        lat: pos.coords.latitude.toFixed(6),
                        lng: pos.coords.longitude.toFixed(6)
                      });
                      setShowMapPicker(true);
                    },
                    () => alert('❌ فشل الحصول على موقعك — تأكد من الأذونات'),
                    { enableHighAccuracy: true }
                  );
                }}
              >
                📍 استخدم موقعي الحالي
              </button>
            </div>

            <br />

            <input className="input" type="number" step="any" placeholder="خط العرض (lat)"
              value={form.lat}
              onChange={e => setForm({ ...form, lat: e.target.value })} required />
            <br /><br />

            <input className="input" type="number" step="any" placeholder="خط الطول (lng)"
              value={form.lng}
              onChange={e => setForm({ ...form, lng: e.target.value })} required />

            {showMapPicker && (
              <div style={{ marginTop: 16 }}>
                {/* أزرار نوع الخريطة */}
                <div style={{
                  display: 'flex',
                  gap: 6,
                  flexWrap: 'wrap',
                  marginBottom: 12
                }}>
                  {[
                    { id: 'satellite', label: '🛰️ قمر صناعي' },
                    { id: 'street', label: '🗺️ شارع' },
                    { id: 'terrain', label: '⛰️ تضاريس' },
                    { id: 'hybrid', label: '🌍 هجين' },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setMapType(t.id)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 10,
                        border: 'none',
                        background: mapType === t.id
                          ? 'linear-gradient(145deg, #0a1f44, #142b5c)'
                          : '#fff',
                        color: mapType === t.id ? '#fff' : 'var(--navy)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        fontFamily: 'inherit'
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* الخريطة الكبيرة */}
                <div style={{
                  height: 'clamp(300px, 50vh, 450px)', // ✅ كبيرة
                  borderRadius: 16,
                  overflow: 'hidden',
                  border: '3px solid #0a1f44',
                  boxShadow: '0 8px 24px rgba(10,31,68,0.15)',
                  position: 'relative'
                }}>
                  <MapContainer
                    center={[
                      parseFloat(form.lat) || 28.1099,
                      parseFloat(form.lng) || 30.7503
                    ]}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url={
                        mapType === 'satellite'
                          ? 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
                          : mapType === 'hybrid'
                          ? 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
                          : mapType === 'terrain'
                          ? 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
                          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                      }
                      attribution={
                        mapType === 'satellite' || mapType === 'hybrid'
                          ? '&copy; Google'
                          : mapType === 'terrain'
                          ? '&copy; OpenTopoMap'
                          : '&copy; OpenStreetMap'
                      }
                      key={mapType}
                    />
                    <MapUpdater center={[
                      parseFloat(form.lat) || 28.1099,
                      parseFloat(form.lng) || 30.7503
                    ]} />
                    <LocationPicker
                      position={{
                        lat: parseFloat(form.lat) || 0,
                        lng: parseFloat(form.lng) || 0
                      }}
                      onChange={(loc) => setForm({
                        ...form,
                        lat: String(loc.lat),
                        lng: String(loc.lng)
                      })}
                    />
                  </MapContainer>
                </div>

                {/* صندوق الإحداثيات + زر مسح */}
                <div style={{
                  marginTop: 12,
                  padding: 12,
                  background: '#f5f7fa',
                  borderRadius: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8
                }}>
                  <div style={{ display: 'flex', gap: 16, fontSize: 13, fontFamily: 'monospace', direction: 'ltr' }}>
                    <div><b>Lat:</b> {form.lat || '—'}</div>
                    <div><b>Lng:</b> {form.lng || '—'}</div>
                  </div>
                  <button
                    type="button"
                    className="btn gray"
                    style={{ padding: '8px 14px', fontSize: 12 }}
                    onClick={() => setForm({ ...form, lat: '', lng: '' })}
                  >
                    🗑️ مسح الموقع
                  </button>
                </div>

                {/* نصيحة */}
                <div style={{
                  marginTop: 8,
                  padding: 10,
                  background: '#fff3cd',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#8b6508',
                  fontWeight: 600
                }}>
                  💡 <b>نصيحة:</b> اضغط على الخريطة لاختيار الموقع، أو اسحب العلامة 📍 لتعديله بدقة.
                </div>
              </div>
            )}

            <br />

            <input className="input" placeholder="العنوان (اختياري)" value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })} />
            <br /><br />

            <input className="input" placeholder="رقم الهاتف (اختياري)" value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })} />
            <br /><br />

            <button className="btn" style={{ width: '100%' }}>
              {editBranch ? '💾 حفظ التعديلات' : '✅ إضافة الفرع'}
            </button>
          </form>
        </div>
      )}

      <div className="grid">
        {branches.map(b => (
          <div key={b._id} className="glass" style={{ padding: 20 }}>
            <h4 style={{ color: 'var(--navy)', marginBottom: 8 }}>
              {b.type === 'main' ? '🏛️' : '🏬'} {b.name}
            </h4>
            <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 8 }}>
              النوع: {b.type === 'main' ? 'رئيسي' : 'فرعي'} | نطاق: {b.radius}م
            </p>
            {b.manager && (
              <p style={{ fontSize: 13 }}>👤 المدير: {b.manager.name}</p>
            )}
            <p style={{ fontSize: 12, color: 'var(--gray)', marginTop: 8 }}>
              📍 {b.location?.lat?.toFixed(4)}, {b.location?.lng?.toFixed(4)}
            </p>
            {b.phone && <p style={{ fontSize: 12 }}>📞 {b.phone}</p>}
            {b.address && <p style={{ fontSize: 12 }}>🏠 {b.address}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                className="btn gray"
                style={{ padding: '6px 14px', fontSize: 12, flex: 1 }}
                onClick={() => startEdit(b)}
              >
                ✏️ تعديل
              </button>
              <button
                className="btn"
                style={{ padding: '6px 14px', fontSize: 12, background: '#8e2b2b', flex: 1 }}
                onClick={() => deleteBranch(b._id)}
              >
                🗑️ حذف
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}