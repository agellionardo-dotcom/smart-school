import React, { useEffect, useState, useRef, useCallback } from 'react';
import Map, { Marker, Popup, Source, Layer, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import axios from 'axios';
import { API_URL } from '../../api';

// ==================== الإحداثيات الافتراضية (المنيا) ====================
const DEFAULT_VIEW = {
  longitude: 30.7503,
  latitude: 28.1099,
  zoom: 10,
};

// ==================== خريطة التايلز (Google Satellite عبر MapLibre) ====================
const MAP_STYLES = {
  satellite: {
    name: '🛰️ قمر صناعي',
    style: {
      version: 8,
      sources: {
        'google-satellite': {
          type: 'raster',
          tiles: [
            'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
          ],
          tileSize: 256,
          attribution: '&copy; Google',
        },
      },
      layers: [
        {
          id: 'google-satellite-layer',
          type: 'raster',
          source: 'google-satellite',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  },
  hybrid: {
    name: '🌍 هجين',
    style: {
      version: 8,
      sources: {
        'google-hybrid': {
          type: 'raster',
          tiles: [
            'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
          ],
          tileSize: 256,
          attribution: '&copy; Google',
        },
      },
      layers: [
        {
          id: 'google-hybrid-layer',
          type: 'raster',
          source: 'google-hybrid',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  },
  street: {
    name: '🗺️ شارع',
    style: {
      version: 8,
      sources: {
        'osm-street': {
          type: 'raster',
          tiles: [
            'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap',
        },
      },
      layers: [
        {
          id: 'osm-street-layer',
          type: 'raster',
          source: 'osm-street',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  },
  dark: {
    name: '🌙 داكن',
    style: {
      version: 8,
      sources: {
        'carto-dark': {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
            'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          attribution: '&copy; CartoDB',
        },
      },
      layers: [
        {
          id: 'carto-dark-layer',
          type: 'raster',
          source: 'carto-dark',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  },
};

// ==================== أيقونة العلامة ====================
const createMarkerElement = (color, emoji, size = 40) => {
  const el = document.createElement('div');
  el.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    background: ${color};
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    border: 3px solid #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  `;
  const span = document.createElement('span');
  span.style.cssText = `transform: rotate(45deg); font-size: ${size * 0.4}px;`;
  span.textContent = emoji;
  el.appendChild(span);
  return el;
};

// ==================== المكوّن الرئيسي ====================
export default function BranchesMap() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState('satellite');
  const [userLocation, setUserLocation] = useState(null);
  const [popupInfo, setPopupInfo] = useState(null);
  const [viewState, setViewState] = useState(DEFAULT_VIEW);
  const mapRef = useRef(null);
  const hasFitted = useRef(false);

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  // ✅ جلب الفروع
  useEffect(() => {
    axios.get(`${API_URL}/api/branches`, { headers })
      .then(r => setBranches(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ✅ ضبط الخريطة على الفروع
  useEffect(() => {
    if (hasFitted.current) return;
    if (!branches || branches.length === 0) return;

    const valid = branches.filter(b => {
      const lat = b.location?.lat;
      const lng = b.location?.lng;
      return lat && lng && lat >= 22 && lat <= 32 && lng >= 24 && lng <= 37;
    });

    if (valid.length === 0) return;

    // ✅ المركز على الفرع الرئيسي
    const mainBranch = valid.find(b => b.type === 'main') || valid[0];

    // ✅ نأجل التنفيذ شوية عشان الخريطة تتحمل
    const timer = setTimeout(() => {
      setViewState({
        longitude: mainBranch.location.lng,
        latitude: mainBranch.location.lat,
        zoom: 10,
      });

      hasFitted.current = true;
      console.log('✅ Map centered on:', mainBranch.name);
      console.log('📍 Center:', mainBranch.location.lat, mainBranch.location.lng);
    }, 500);

    return () => clearTimeout(timer);
  }, [branches]);

  // ✅ تحديد موقع المستخدم
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      alert('المتصفح لا يدعم تحديد الموقع');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setViewState({
          longitude,
          latitude,
          zoom: 16,
        });
        setUserLocation({ lat: latitude, lng: longitude, accuracy });
      },
      (err) => {
        alert('فشل تحديد الموقع: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray)' }}>
        <p>⏳ جاري تحميل الخريطة...</p>
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray)' }}>
        <p>لا توجد فروع لعرضها على الخريطة</p>
      </div>
    );
  }

  const validBranches = branches.filter(b => {
    const lat = b.location?.lat;
    const lng = b.location?.lng;
    return lat && lng && lat >= 22 && lat <= 32 && lng >= 24 && lng <= 37;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ color: 'var(--navy)', margin: 0 }}>
          🗺️ خريطة الفروع ({validBranches.length})
        </h3>
        <span style={{ fontSize: 12, color: 'var(--gray)' }}>
          اسحب للتنقل · عجلة الفأرة للتكبير
        </span>
      </div>

      {/* أزرار الطبقات */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 12,
        flexWrap: 'wrap',
      }}>
        {Object.entries(MAP_STYLES).map(([key, layer]) => (
          <button
            key={key}
            onClick={() => setMapStyle(key)}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: 'none',
              background: mapStyle === key
                ? 'linear-gradient(145deg, #0a1f44, #142b5c)'
                : '#fff',
              color: mapStyle === key ? '#fff' : 'var(--navy)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              fontFamily: 'inherit',
            }}
          >
            {layer.name}
          </button>
        ))}
      </div>

      {/* الخريطة */}
      <div style={{
        height: 'clamp(400px, 65vh, 600px)',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 15px 40px rgba(10,31,68,0.3)',
        border: '3px solid #fff',
        position: 'relative',
      }}>
        <Map
          ref={mapRef}
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          mapStyle={MAP_STYLES[mapStyle].style}
          style={{ width: '100%', height: '100%' }}
          attributionControl={true}
        >
          <NavigationControl position="top-left" />

          {/* علامات الفروع */}
          {validBranches.map(b => (
            <Marker
              key={b._id}
              longitude={b.location.lng}
              latitude={b.location.lat}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopupInfo(b);
              }}
            >
              <div
                style={{
                  width: b.type === 'main' ? 44 : 38,
                  height: b.type === 'main' ? 44 : 38,
                  background: b.type === 'main'
                    ? 'linear-gradient(145deg, #0a1f44, #142b5c)'
                    : 'linear-gradient(145deg, #2e7d5b, #1e5a40)',
                  borderRadius: '50% 50% 50% 0',
                  transform: 'rotate(-45deg)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  border: '3px solid #fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  transform: 'rotate(45deg)',
                  fontSize: b.type === 'main' ? 20 : 16,
                }}>
                  {b.type === 'main' ? '🏛️' : '🏬'}
                </span>
              </div>
            </Marker>
          ))}

          {/* Popup */}
          {popupInfo && (
            <Popup
              longitude={popupInfo.location.lng}
              latitude={popupInfo.location.lat}
              anchor="top"
              onClose={() => setPopupInfo(null)}
              closeOnClick={false}
              maxWidth="300px"
            >
              <div style={{ direction: 'rtl', minWidth: 220, fontFamily: 'inherit' }}>
                <h3 style={{
                  color: '#0a1f44',
                  margin: '0 0 8px',
                  fontSize: 16,
                }}>
                  {popupInfo.type === 'main' ? '🏛️' : '🏬'} {popupInfo.name}
                </h3>
                <p style={{ margin: '4px 0', color: '#5a6478', fontSize: 13 }}>
                  <b>النوع:</b> {popupInfo.type === 'main' ? 'فرع رئيسي' : 'فرع فرعي'}
                </p>
                <p style={{ margin: '4px 0', color: '#5a6478', fontSize: 13 }}>
                  <b>النطاق:</b> {popupInfo.radius} متر
                </p>
                {popupInfo.phone && (
                  <p style={{ margin: '4px 0', color: '#5a6478', fontSize: 13 }}>
                    <b>📞 الهاتف:</b> {popupInfo.phone}
                  </p>
                )}
                {popupInfo.address && (
                  <p style={{ margin: '4px 0', color: '#5a6478', fontSize: 13 }}>
                    <b>🏠 العنوان:</b> {popupInfo.address}
                  </p>
                )}
                <p style={{ margin: '8px 0 0', color: '#8b95a7', fontSize: 11 }}>
                  📍 {popupInfo.location.lat.toFixed(4)}, {popupInfo.location.lng.toFixed(4)}
                </p>
              </div>
            </Popup>
          )}

          {/* موقع المستخدم */}
          {userLocation && (
            <Marker
              longitude={userLocation.lng}
              latitude={userLocation.lat}
              anchor="center"
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  background: 'linear-gradient(145deg, #d9534f, #a94442)',
                  borderRadius: '50%',
                  border: '3px solid #fff',
                  boxShadow: '0 4px 12px rgba(217,83,79,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                }}
              >
                📍
              </div>
            </Marker>
          )}
        </Map>

        {/* زر تحديد الموقع */}
        <button
          onClick={handleLocateMe}
          title="حدد موقعي"
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            zIndex: 1000,
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: 'none',
            background: 'linear-gradient(145deg, #0a1f44, #142b5c)',
            color: '#fff',
            fontSize: 20,
            cursor: 'pointer',
            boxShadow: '0 6px 16px rgba(10,31,68,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          📍
        </button>
      </div>

      {/* الإحصائيات */}
      <div style={{
        marginTop: 16,
        padding: 16,
        background: '#f5f7fa',
        borderRadius: 12,
        display: 'flex',
        gap: 20,
        flexWrap: 'wrap',
        fontSize: 13,
      }}>
        <div>
          <span style={{ color: '#0a1f44', fontWeight: 'bold' }}>
            🏛️ الفروع الرئيسية:
          </span>{' '}
          {validBranches.filter(b => b.type === 'main').length}
        </div>
        <div>
          <span style={{ color: '#2e7d5b', fontWeight: 'bold' }}>
            🏬 الفروع الفرعية:
          </span>{' '}
          {validBranches.filter(b => b.type === 'sub').length}
        </div>
        <div>
          <span style={{ color: 'var(--navy)', fontWeight: 'bold' }}>
            📍 الإجمالي:
          </span>{' '}
          {validBranches.length}
        </div>
      </div>
    </div>
  );
}