import React, { useEffect, useState, useRef, useCallback } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import api from '../../api';

const DEFAULT_VIEW = {
  longitude: 30.7503,
  latitude: 28.1099,
  zoom: 10,
};

const MAP_STYLES = {
  satellite: {
    name: '🛰️ قمر صناعي',
    style: {
      version: 8,
      sources: {
        'google-satellite': {
          type: 'raster',
          tiles: ['https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'],
          tileSize: 256,
          attribution: '&copy; Google',
        },
      },
      layers: [
        { id: 'google-satellite-layer', type: 'raster', source: 'google-satellite', minzoom: 0, maxzoom: 17 },
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
          tiles: ['https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'],
          tileSize: 256,
          attribution: '&copy; Google',
        },
      },
      layers: [
        { id: 'google-hybrid-layer', type: 'raster', source: 'google-hybrid', minzoom: 0, maxzoom: 17 },
      ],
    },
  },
  esri: {
    name: '🌎 Esri',
    style: {
      version: 8,
      sources: {
        'esri-satellite': {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          attribution: '&copy; Esri',
        },
      },
      layers: [
        { id: 'esri-satellite-layer', type: 'raster', source: 'esri-satellite', minzoom: 0, maxzoom: 19 },
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
        { id: 'osm-street-layer', type: 'raster', source: 'osm-street', minzoom: 0, maxzoom: 19 },
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
        { id: 'carto-dark-layer', type: 'raster', source: 'carto-dark', minzoom: 0, maxzoom: 19 },
      ],
    },
  },
};

export default function BranchesMap() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState('satellite');
  const [userLocation, setUserLocation] = useState(null);
  const [popupInfo, setPopupInfo] = useState(null);
  const [viewState, setViewState] = useState(DEFAULT_VIEW);
  const mapRef = useRef(null);
  const hasFitted = useRef(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    api.get('/branches')
      .then(r => setBranches(r.data))
      .catch((err) => console.error('loadBranches error:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (hasFitted.current) return;
    if (!branches || branches.length === 0) return;

    const valid = branches.filter(b => {
      const lat = b.location?.lat;
      const lng = b.location?.lng;
      return lat && lng && lat >= 22 && lat <= 32 && lng >= 24 && lng <= 37;
    });

    if (valid.length === 0) return;

    const mainBranch = valid.find(b => b.type === 'main') || valid[0];

    const timer = setTimeout(() => {
      setViewState({
        longitude: mainBranch.location.lng,
        latitude: mainBranch.location.lat,
        zoom: 10,
      });
      hasFitted.current = true;
    }, 500);

    return () => clearTimeout(timer);
  }, [branches]);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      alert('المتصفح لا يدعم تحديد الموقع');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setViewState({ longitude, latitude, zoom: 16 });
        setUserLocation({ lat: latitude, lng: longitude, accuracy });
      },
      (err) => alert('فشل تحديد الموقع: ' + err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  if (loading) {
    return (
      <div className="ss-glass" style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>
          ⏳ جاري تحميل الخريطة...
        </p>
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <div className="ss-glass" style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>
          لا توجد فروع لعرضها على الخريطة
        </p>
      </div>
    );
  }

  const validBranches = branches.filter(b => {
    const lat = b.location?.lat;
    const lng = b.location?.lng;
    return lat && lng && lat >= 22 && lat <= 32 && lng >= 24 && lng <= 37;
  });

  const filteredBranches = searchQuery.trim()
    ? validBranches.filter(b => {
        const q = searchQuery.trim().toLowerCase();
        return (
          b.name?.toLowerCase().includes(q) ||
          b.address?.toLowerCase().includes(q) ||
          b.phone?.includes(q)
        );
      })
    : [];

  const selectBranch = (branch) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [branch.location.lng, branch.location.lat],
        zoom: 16,
        duration: 1500,
      });
    }
    setPopupInfo(branch);
    setSearchQuery(branch.name);
    setShowDropdown(false);
  };

  return (
    <div>
      {/* ✅ Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          🗺️ خريطة الفروع ({validBranches.length})
        </h3>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
          اسحب للتنقل · عجلة الفأرة للتكبير
        </span>
      </div>

      {/* ✅ Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => searchQuery && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 250)}
          placeholder="🔍 ابحث عن فرع بالاسم أو العنوان أو الهاتف..."
          className="input"
          style={{
            padding: '12px 44px 12px 16px',
            fontSize: 14,
            fontWeight: 600,
          }}
        />
        <span
          style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 18,
            pointerEvents: 'none',
            opacity: 0.6,
          }}
        >
          🔍
        </span>
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              setShowDropdown(false);
            }}
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              fontSize: 18,
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.5)',
            }}
            title="مسح البحث"
          >
            ✖
          </button>
        )}

        {/* ✅ Dropdown */}
        {showDropdown && searchQuery && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              left: 0,
              background: 'rgba(15, 33, 56, 0.98)',
              backdropFilter: 'blur(20px)',
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              marginTop: 6,
              maxHeight: 300,
              overflowY: 'auto',
              zIndex: 1000,
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}
          >
            {filteredBranches.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  textAlign: 'center',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 13,
                }}
              >
                ❌ لا توجد نتائج مطابقة
              </div>
            ) : (
              filteredBranches.map(b => (
                <div
                  key={b._id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectBranch(b);
                  }}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <div
                      style={{
                        color: '#f8fafc',
                        fontWeight: 700,
                        fontSize: 14,
                        marginBottom: 2,
                      }}
                    >
                      {b.type === 'main' ? '🏛️' : '🏬'} {b.name}
                    </div>
                    {b.address && (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                        📍 {b.address}
                      </div>
                    )}
                    {b.phone && (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                        📞 {b.phone}
                      </div>
                    )}
                  </div>
                  <span
                    className="payroll-status"
                    style={{
                      background:
                        b.type === 'main'
                          ? 'linear-gradient(135deg, #00e5ff, #a855f7)'
                          : 'linear-gradient(135deg, #10b981, #059669)',
                      fontSize: 10,
                    }}
                  >
                    {b.type === 'main' ? 'رئيسي' : 'فرعي'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ✅ Map Style Buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {Object.entries(MAP_STYLES).map(([key, layer]) => (
          <button
            key={key}
            onClick={() => setMapStyle(key)}
            className={`admin-tab ${mapStyle === key ? 'active' : ''}`}
            style={{ fontSize: 13 }}
          >
            {layer.name}
          </button>
        ))}
      </div>

      {/* ✅ Map */}
      <div
        style={{
          height: 'clamp(400px, 65vh, 600px)',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 15px 40px rgba(0, 0, 0, 0.4), 0 0 32px rgba(0, 229, 255, 0.1)',
          border: '2px solid rgba(0, 229, 255, 0.3)',
          position: 'relative',
        }}
      >
        <Map
          ref={mapRef}
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          mapStyle={MAP_STYLES[mapStyle].style}
          style={{ width: '100%', height: '100%' }}
          attributionControl={true}
        >
          <NavigationControl position="top-left" />

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
                  background:
                    b.type === 'main'
                      ? 'linear-gradient(135deg, #00e5ff, #a855f7)'
                      : 'linear-gradient(135deg, #10b981, #059669)',
                  borderRadius: '50% 50% 50% 0',
                  transform: 'rotate(-45deg)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                  border: '3px solid #fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    transform: 'rotate(45deg)',
                    fontSize: b.type === 'main' ? 20 : 16,
                  }}
                >
                  {b.type === 'main' ? '🏛️' : '🏬'}
                </span>
              </div>
            </Marker>
          ))}

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
                <h3 style={{ color: '#0a1f44', margin: '0 0 8px', fontSize: 16 }}>
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

          {userLocation && (
            <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
              <div
                style={{
                  width: 30,
                  height: 30,
                  background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                  borderRadius: '50%',
                  border: '3px solid #fff',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.6)',
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
            background: 'linear-gradient(135deg, #00e5ff, #a855f7)',
            color: '#fff',
            fontSize: 20,
            cursor: 'pointer',
            boxShadow: '0 6px 24px rgba(0, 229, 255, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          📍
        </button>
      </div>

      {/* ✅ Stats */}
      <div
        className="ss-glass-subtle"
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 12,
          display: 'flex',
          gap: 20,
          flexWrap: 'wrap',
          fontSize: 13,
        }}
      >
        <div>
          <span style={{ color: '#67e8f9', fontWeight: 700 }}>🏛️ الفروع الرئيسية:</span>{' '}
          <span style={{ color: '#f8fafc' }}>
            {validBranches.filter(b => b.type === 'main').length}
          </span>
        </div>
        <div>
          <span style={{ color: '#34d399', fontWeight: 700 }}>🏬 الفروع الفرعية:</span>{' '}
          <span style={{ color: '#f8fafc' }}>
            {validBranches.filter(b => b.type === 'sub').length}
          </span>
        </div>
        <div>
          <span style={{ color: '#a78bfa', fontWeight: 700 }}>📍 الإجمالي:</span>{' '}
          <span style={{ color: '#f8fafc' }}>{validBranches.length}</span>
        </div>
      </div>
    </div>
  );
}