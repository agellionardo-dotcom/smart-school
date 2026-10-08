import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { API_URL } from '../../api';

// ==================== إعدادات الأيقونات ====================
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const mainIcon = new L.DivIcon({
  html: `<div style="
    background: linear-gradient(145deg, #0a1f44, #142b5c);
    width: 44px; height: 44px; border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 6px 16px rgba(10,31,68,0.6);
    border: 3px solid #fff;
    display:flex; align-items:center; justify-content:center;
  "><span style="transform:rotate(45deg); font-size:20px;">🏛️</span></div>`,
  className: '',
  iconSize: [44, 44],
  iconAnchor: [22, 44],
  popupAnchor: [0, -44],
});

const subIcon = new L.DivIcon({
  html: `<div style="
    background: linear-gradient(145deg, #2e7d5b, #1e5a40);
    width: 38px; height: 38px; border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 6px 16px rgba(46,125,91,0.6);
    border: 3px solid #fff;
    display:flex; align-items:center; justify-content:center;
  "><span style="transform:rotate(45deg); font-size:16px;">🏬</span></div>`,
  className: '',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
});

const userIcon = new L.DivIcon({
  html: `<div style="
    background: linear-gradient(145deg, #d9534f, #a94442);
    width: 30px; height: 30px; border-radius: 50%;
    box-shadow: 0 4px 12px rgba(217,83,79,0.6);
    border: 3px solid #fff;
    display:flex; align-items:center; justify-content:center;
  "><span style="font-size:14px;">📍</span></div>`,
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// ==================== طبقات الخريطة (Google Satellite) ====================
const TILE_LAYERS = {
  satellite: {
    name: '🛰️ قمر صناعي',
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; Google',
  },
  hybrid: {
    name: '🌍 هجين',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google',
  },
  street: {
    name: '🗺️ شارع',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap France',
  },
  terrain: {
    name: '⛰️ تضاريس',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap',
  },
  dark: {
    name: '🌙 داكن',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB',
  },
};

// ==================== Helper: FitBounds (يستبعد الفروع البعيدة) ====================
function FitBoundsToBranches({ branches }) {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    if (hasFitted.current) return;
    if (!branches || branches.length === 0) return;

    const timer = setTimeout(() => {
      map.invalidateSize();

      // ✅ الفرع الرئيسي
      const mainBranch = branches.find(b => b.type === 'main') || branches[0];
      const mainLat = mainBranch.location.lat;
      const mainLng = mainBranch.location.lng;

      // ✅ نستبعد الفروع البعيدة (أكتر من 100 كم عن الفرع الرئيسي)
      const nearbyBranches = branches.filter(b => {
        const dist = Math.sqrt(
          Math.pow(b.location.lat - mainLat, 2) +
          Math.pow(b.location.lng - mainLng, 2)
        );
        return dist < 1.0; // تقريباً 100 كم
      });

      // ✅ نعمل fitBounds على الفروع القريبة بس
      const targetBranches = nearbyBranches.length > 0 ? nearbyBranches : [mainBranch];

      const bounds = L.latLngBounds(
        targetBranches.map(b => [b.location.lat, b.location.lng])
      );

      map.fitBounds(bounds, {
        padding: [80, 80],
        maxZoom: 13,
        animate: true,
      });

      hasFitted.current = true;
      console.log('✅ Map fitted to', targetBranches.length, 'nearby branches');
      console.log('📍 Main branch:', mainBranch.name);
      console.log('🔍 Zoom:', map.getZoom());
      console.log('📋 Nearby:', targetBranches.map(b => b.name).join(', '));
    }, 500);

    return () => clearTimeout(timer);
  }, [branches, map]);

  return null;
}

// ==================== Helper: Locate Me ====================
function LocateControl({ onLocation }) {
  const map = useMap();

  const locateMe = () => {
    if (!navigator.geolocation) {
      alert('المتصفح لا يدعم تحديد الموقع');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        map.setView([latitude, longitude], 16);
        onLocation({ lat: latitude, lng: longitude, accuracy });
      },
      (err) => {
        alert('فشل تحديد الموقع: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <button
      onClick={locateMe}
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
  );
}

// ==================== Helper: Search ====================
function SearchControl() {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);

  const search = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=ar&countrycodes=eg`
      );
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const goTo = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    map.setView([lat, lng], 15);
    setResults([]);
    setQuery(item.display_name);
  };

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 1000,
      width: 320,
      maxWidth: '90%',
    }}>
      <form onSubmit={search} style={{ display: 'flex', gap: 4 }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="🔍 ابحث عن موقع في مصر..."
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 10,
            border: '2px solid #fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: 14,
            outline: 'none',
            fontFamily: 'inherit',
            direction: 'rtl',
          }}
        />
        <button
          type="submit"
          disabled={searching}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: 'none',
            background: '#0a1f44',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 16,
            boxShadow: '0 4px 12px rgba(10,31,68,0.3)',
          }}
        >
          {searching ? '⏳' : '🔍'}
        </button>
      </form>

      {results.length > 0 && (
        <div style={{
          marginTop: 6,
          background: '#fff',
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          maxHeight: 250,
          overflowY: 'auto',
          direction: 'rtl',
        }}>
          {results.map((r, i) => (
            <div
              key={i}
              onClick={() => goTo(r)}
              style={{
                padding: '10px 14px',
                borderBottom: i < results.length - 1 ? '1px solid #eef1f7' : 'none',
                cursor: 'pointer',
                fontSize: 13,
                color: '#0a1f44',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f5f7fa'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
            >
              📍 {r.display_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== المكوّن الرئيسي ====================
export default function BranchesMap() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapType, setMapType] = useState('satellite');
  const [userLocation, setUserLocation] = useState(null);
  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  useEffect(() => {
    axios.get(`${API_URL}/api/branches`, { headers })
      .then(r => setBranches(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
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

      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 12,
        flexWrap: 'wrap',
      }}>
        {Object.entries(TILE_LAYERS).map(([key, layer]) => (
          <button
            key={key}
            onClick={() => setMapType(key)}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: 'none',
              background: mapType === key
                ? 'linear-gradient(145deg, #0a1f44, #142b5c)'
                : '#fff',
              color: mapType === key ? '#fff' : 'var(--navy)',
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

      <div style={{
        height: 'clamp(400px, 65vh, 600px)',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 15px 40px rgba(10,31,68,0.3)',
        border: '3px solid #fff',
        position: 'relative',
      }}>
        <MapContainer
          center={[28.1099, 30.7503]}
          zoom={12}
          style={{ height: '100%', width: '100%', minHeight: '400px' }}
          scrollWheelZoom={true}
          zoomControl={true}
        >
          <TileLayer
            url={TILE_LAYERS[mapType].url}
            attribution={TILE_LAYERS[mapType].attribution}
            key={`base-${mapType}`}
          />

          {mapType === 'hybrid' && (
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
              attribution="&copy; CartoDB"
              key="labels-layer"
            />
          )}

          <FitBoundsToBranches branches={validBranches} />

          <SearchControl />
          <LocateControl onLocation={setUserLocation} />

          {userLocation && (
            <>
              <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                <Popup>
                  <div style={{ direction: 'rtl' }}>
                    <b>📍 موقعك الحالي</b>
                    <br />
                    <span style={{ fontSize: 12, color: '#666' }}>
                      الدقة: {Math.round(userLocation.accuracy || 0)} متر
                    </span>
                  </div>
                </Popup>
              </Marker>
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={userLocation.accuracy || 50}
                pathOptions={{
                  color: '#d9534f',
                  fillColor: '#d9534f',
                  fillOpacity: 0.15,
                  weight: 2,
                }}
              />
            </>
          )}

          {validBranches.map(b => (
            <React.Fragment key={b._id}>
              <Circle
                center={[b.location.lat, b.location.lng]}
                radius={b.radius || 100}
                pathOptions={{
                  color: b.type === 'main' ? '#0a1f44' : '#2e7d5b',
                  fillColor: b.type === 'main' ? '#0a1f44' : '#2e7d5b',
                  fillOpacity: 0.15,
                  weight: 2,
                  dashArray: '5, 5',
                }}
              />

              <Marker
                position={[b.location.lat, b.location.lng]}
                icon={b.type === 'main' ? mainIcon : subIcon}
              >
                <Popup>
                  <div style={{ direction: 'rtl', minWidth: 220 }}>
                    <h3 style={{
                      color: '#0a1f44',
                      margin: '0 0 8px',
                      fontSize: 16,
                    }}>
                      {b.type === 'main' ? '🏛️' : '🏬'} {b.name}
                    </h3>
                    <p style={{ margin: '4px 0', color: '#5a6478', fontSize: 13 }}>
                      <b>النوع:</b> {b.type === 'main' ? 'فرع رئيسي' : 'فرع فرعي'}
                    </p>
                    <p style={{ margin: '4px 0', color: '#5a6478', fontSize: 13 }}>
                      <b>النطاق:</b> {b.radius} متر
                    </p>
                    {b.phone && (
                      <p style={{ margin: '4px 0', color: '#5a6478', fontSize: 13 }}>
                        <b>📞 الهاتف:</b> {b.phone}
                      </p>
                    )}
                    {b.address && (
                      <p style={{ margin: '4px 0', color: '#5a6478', fontSize: 13 }}>
                        <b>🏠 العنوان:</b> {b.address}
                      </p>
                    )}
                    <p style={{ margin: '8px 0 0', color: '#8b95a7', fontSize: 11 }}>
                      📍 {b.location.lat.toFixed(4)}, {b.location.lng.toFixed(4)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          ))}
        </MapContainer>
      </div>

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
        {branches.length !== validBranches.length && (
          <div style={{ color: '#d9534f', fontWeight: 'bold' }}>
            ⚠️ {branches.length - validBranches.length} فرع بإحداثيات غير صالحة
          </div>
        )}
      </div>
    </div>
  );
}