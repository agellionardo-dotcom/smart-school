import React, { useState, useEffect } from 'react';
import api from '../../api';

const ROLE_GRADIENTS = {
  superadmin: 'linear-gradient(135deg, #00e5ff, #a855f7)',
  manager:    'linear-gradient(135deg, #3b82f6, #1e40af)',
  hr:         'linear-gradient(135deg, #a855f7, #7e22ce)',
  employee:   'linear-gradient(135deg, #10b981, #059669)',
  viewer:     'linear-gradient(135deg, #94a3b8, #64748b)',
};

const ROLE_LABELS = {
  superadmin: 'مدير النظام',
  manager:    'مدير فرع',
  hr:         'موارد بشرية',
  employee:   'موظف',
  viewer:     'مشاهد',
};

export default function OrganizationTab() {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [expanded, setExpanded] = useState({});

  // ✅ جلب الشجرة
  const loadTree = async () => {
    try {
      const { data } = await api.get('/admin/organization/tree');
      setTree(data);
      const initExpanded = {};
      const markExpanded = (nodes) => {
        nodes.forEach(n => {
          initExpanded[n._id] = true;
          if (n.children?.length) markExpanded(n.children);
        });
      };
      markExpanded(data);
      setExpanded(initExpanded);
    } catch (err) {
      console.error('loadTree error:', err);
      setMsg('❌ ' + (err.response?.data?.msg || 'فشل تحميل الهيكل التنظيمي'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTree(); }, []);

  const toggle = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const roleBadge = (role) => {
    return (
      <span
        className="payroll-status"
        style={{ background: ROLE_GRADIENTS[role] || ROLE_GRADIENTS.viewer }}
      >
        {ROLE_LABELS[role] || role}
      </span>
    );
  };

  const renderNode = (node, level = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isOpen = expanded[node._id];

    return (
      <div key={node._id} style={{ marginRight: level * 24 }}>
        <div
          className="org-node"
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 14px',
            margin: '6px 0',
            background:
              level === 0
                ? 'rgba(0, 229, 255, 0.08)'
                : 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border:
              level === 0
                ? '1px solid rgba(0, 229, 255, 0.25)'
                : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 12,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
            cursor: hasChildren ? 'pointer' : 'default',
            transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          onClick={() => hasChildren && toggle(node._id)}
        >
          {hasChildren && (
            <span
              style={{
                marginLeft: 8,
                fontSize: 12,
                color: '#67e8f9',
                transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
                display: 'inline-block',
              }}
            >
              ▶
            </span>
          )}
          {!hasChildren && <span style={{ width: 20 }} />}

          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 6,
              }}
            >
              <b style={{ color: '#f8fafc', fontSize: 14 }}>{node.name}</b>
              {roleBadge(node.role)}
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'rgba(255, 255, 255, 0.6)',
                marginTop: 4,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              {node.position && <span>💼 {node.position}</span>}
              {node.department && <span>🏷️ {node.department}</span>}
              {node.branch?.name && <span>🏢 {node.branch.name}</span>}
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>
            {hasChildren && `(${node.children.length})`}
          </div>
        </div>

        {hasChildren && isOpen && (
          <div
            style={{
              borderRight: '2px dashed rgba(255, 255, 255, 0.15)',
              marginRight: 14,
              paddingRight: 10,
            }}
          >
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* ✅ Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
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
          📄 الهيكل التنظيمي
        </h3>
        <button
          className="btn gray"
          style={{ padding: '8px 16px', fontSize: 13 }}
          onClick={loadTree}
        >
          🔄 تحديث
        </button>
      </div>

      {/* ✅ Message */}
      {msg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 600,
            direction: 'rtl',
            textAlign: 'right',
            background: msg.startsWith('✅')
              ? 'rgba(16, 185, 129, 0.15)'
              : 'rgba(239, 68, 68, 0.15)',
            color: msg.startsWith('✅') ? '#34d399' : '#fca5a5',
            border: `1px solid ${
              msg.startsWith('✅')
                ? 'rgba(16, 185, 129, 0.3)'
                : 'rgba(239, 68, 68, 0.3)'
            }`,
            animation: 'ssFadeIn 0.3s ease',
          }}
        >
          {msg}
        </div>
      )}

      {/* ✅ Tree */}
      <div className="ss-glass" style={{ padding: 20 }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
            ⏳ جاري التحميل...
          </p>
        ) : tree.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
            لا يوجد موظفون. تأكد من إضافة موظفين وتعيين مديرين لهم.
          </p>
        ) : (
          <div>{tree.map(node => renderNode(node))}</div>
        )}
      </div>

      {/* ✅ Note */}
      <div
        className="ss-glass-subtle"
        style={{
          marginTop: 20,
          padding: 14,
          borderRadius: 12,
          fontSize: 12,
          color: 'rgba(255, 255, 255, 0.7)',
          lineHeight: 1.8,
          direction: 'rtl',
          textAlign: 'right',
        }}
      >
        <b style={{ color: '#67e8f9' }}>💡 ملاحظة:</b> الشجرة بتبني نفسها من حقل{' '}
        <code
          style={{
            background: 'rgba(0, 229, 255, 0.15)',
            color: '#67e8f9',
            padding: '2px 6px',
            borderRadius: 4,
            fontFamily: 'monospace',
          }}
        >
          managerId
        </code>{' '}
        في بيانات كل موظف. عشان تضيف موظف تحت مدير معين، افتح{' '}
        <b style={{ color: '#a78bfa' }}>EmployeeProfile</b> بتاعه وعدّل حقل{' '}
        <b style={{ color: '#f8fafc' }}>"المدير المباشر"</b>.
      </div>
    </div>
  );
}