import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { API_URL } from '../../api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const mainIcon = new L.DivIcon({
  html: `<div style="
    background: linear-gradient(145deg, #0a1f44, #142b5c);
    width: 40px; height: 40px; border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 4px 12px rgba(10,31,68,0.5);
    border: 3px solid #fff;
    display:flex; align-items:center; justify-content:center;
  "><span style="transform:rotate(45deg); font-size:18px;">🏛️</span></div>`,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 40]
});

const subIcon = new L.DivIcon({
  html: `<div style="
    background: linear-gradient(145deg, #8b95a7, #5a6478);
    width: 34px; height: 34px; border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 4px 12px rgba(139,149,167,0.5);
    border: 3px solid #fff;
    display:flex; align-items:center; justify-content:center;
  "><span style="transform:rotate(45deg); font-size:14px;">🏬</span></div>`,
  className: '',
  iconSize: [34, 34],
  iconAnchor: [17, 34]
});

const TILE_LAYERS = {
  satellite: {
    name: '🛰️ قمر صناعي',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri'
  },
  hybrid: {
    name: '🌍 هجين (قمر + أسماء)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    labels: 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png'
  },
  street: {
    name: '🗺️ شارع (مع الأسماء)',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap France'
  },
  terrain: {
    name: '⛰️ تضاريس',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap'
  },
  dark: {
    name: '🌙 داكن',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB'
  }
};

// ✅ Controller لإصلاح مشكلة عرض الخريطة
function MapController({ mapType }) {
  const map = useMap();

  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 150);
  }, [map, mapType]);

  return null;
}

function SearchControl({ onLocationFound }) {
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
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=ar`
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
    map.setView([lat, lng], 16);
    if (onLocationFound) onLocationFound({ lat, lng, name: item.display_name });
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
      maxWidth: '90%'
    }}>
      <form onSubmit={search} style={{ display: 'flex', gap: 4 }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="🔍 ابحث عن موقع..."
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 10,
            border: '2px solid #fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: 14,
            outline: 'none',
            fontFamily: 'inherit',
            direction: 'rtl'
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
            boxShadow: '0 4px 12px rgba(10,31,68,0.3)'
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
          direction: 'rtl'
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
                color: '#0a1f44'
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

export default function BranchesMap() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapType, setMapType] = useState('satellite'); // ✅ افتراضي: قمر صناعي
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

  const center = branches.length > 0
    ? [
        branches.reduce((sum, b) => sum + b.location.lat, 0) / branches.length,
        branches.reduce((sum, b) => sum + b.location.lng, 0) / branches.length
      ]
    : [28.1099, 30.7503];

  return (
    <div>
      <h3 style={{ color: 'var(--navy)', marginBottom: 16 }}>
        🗺️ خريطة الفروع ({branches.length})
      </h3>

      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 12,
        flexWrap: 'wrap'
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
              fontFamily: 'inherit'
            }}
          >
            {layer.name}
          </button>
        ))}
      </div>

      <div style={{
        height: 'clamp(350px, 60vh, 550px)',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 15px 40px rgba(10,31,68,0.3)',
        border: '3px solid #fff',
        position: 'relative'
      }}>
        <MapContainer
          center={center}
          zoom={7}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            url={TILE_LAYERS[mapType].url}
            attribution={TILE_LAYERS[mapType].attribution}
            key={`base-${mapType}`}
          />

          {/* ✅ Labels Layer للطبقة الهجينة */}
          {mapType === 'hybrid' && (
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
              attribution="&copy; CartoDB"
              key="labels-layer"
            />
          )}

          <MapController mapType={mapType} />
          <SearchControl />

          {branches.map(b => (
            <React.Fragment key={b._id}>
              <Circle
                center={[b.location.lat, b.location.lng]}
                radius={b.radius || 5}
                pathOptions={{
                  color: b.type === 'main' ? '#0a1f44' : '#8b95a7',
                  fillOpacity: 0.2,
                  weight: 2
                }}
              />

              <Marker
                position={[b.location.lat, b.location.lng]}
                icon={b.type === 'main' ? mainIcon : subIcon}
              >
                <Popup>
                  <div style={{ direction: 'rtl', minWidth: 200 }}>
                    <h3 style={{
                      color: '#0a1f44',
                      margin: '0 0 8px',
                      fontSize: 16
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
        fontSize: 13
      }}>
        <div>
          <span style={{ color: '#0a1f44', fontWeight: 'bold' }}>
            🏛️ الفروع الرئيسية:
          </span>{' '}
          {branches.filter(b => b.type === 'main').length}
        </div>
        <div>
          <span style={{ color: '#8b95a7', fontWeight: 'bold' }}>
            🏬 الفروع الفرعية:
          </span>{' '}
          {branches.filter(b => b.type === 'sub').length}
        </div>
        <div>
          <span style={{ color: 'var(--navy)', fontWeight: 'bold' }}>
            📍 الإجمالي:
          </span>{' '}
          {branches.length}
        </div>
      </div>
    </div>
  );
}