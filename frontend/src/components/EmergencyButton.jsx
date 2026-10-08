{/* زر الطوارئ - تحت اللوجو، أفقي، صغير */}
{!activeEmergency && (
  <button
    onClick={() => setShowModal(true)}
    title="زر الطوارئ"
    style={{
      position: 'fixed',
      top: 80,
      right: 20,
      zIndex: 9998,
      padding: '10px 20px',
      background: 'linear-gradient(145deg, #d9534f, #a94442)',
      color: '#fff',
      border: 'none',
      borderRadius: 12,
      fontSize: 14,
      fontWeight: 'bold',
      cursor: 'pointer',
      boxShadow: '0 4px 16px rgba(217,83,79,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      fontFamily: 'inherit',
      transition: 'all 0.3s ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'scale(1.05)';
      e.currentTarget.style.boxShadow = '0 6px 24px rgba(217,83,79,0.6)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'scale(1)';
      e.currentTarget.style.boxShadow = '0 4px 16px rgba(217,83,79,0.4)';
    }}
  >
    <span style={{ fontSize: 16 }}>🚨</span>
    <span>طوارئ</span>
  </button>
)}