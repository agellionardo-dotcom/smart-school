import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../api';

export default function OrganizationTab() {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [expanded, setExpanded] = useState({});

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  const loadTree = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/organization/tree`, { headers });
      setTree(data);
      // افتح كل الفروع في البداية
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
    const colors = {
      superadmin: '#0a1f44',
      manager:    '#2e4373',
      hr:         '#5a6478',
      employee:   '#2e7d5b',
      viewer:     '#8b95a7',
    };
    const labels = {
      superadmin: 'مدير النظام',
      manager:    'مدير فرع',
      hr:         'موارد بشرية',
      employee:   'موظف',
      viewer:     'مشاهد',
    };
    return (
      <span style={{
        background: colors[role] || '#8b95a7',
        color: '#fff',
        padding: '2px 10px',
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 'bold',
        marginRight: 6,
      }}>{labels[role] || role}</span>
    );
  };

  const renderNode = (node, level = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isOpen = expanded[node._id];

    return (
      <div key={node._id} style={{ marginRight: level * 24 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 14px',
            margin: '6px 0',
            background: level === 0 ? '#f0f4fa' : '#fff',
            border: '1px solid #e0e6ef',
            borderRadius: 10,
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            cursor: hasChildren ? 'pointer' : 'default',
            transition: 'all 0.2s',
          }}
          onClick={() => hasChildren && toggle(node._id)}
        >
          {hasChildren && (
            <span style={{
              marginLeft: 8,
              fontSize: 12,
              color: '#2e4373',
              transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
              display: 'inline-block',
            }}>▶</span>
          )}
          {!hasChildren && <span style={{ width: 20 }} />}

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
              <b style={{ color: 'var(--navy)', fontSize: 14 }}>{node.name}</b>
              <span style={{ marginRight: 8 }} />
              {roleBadge(node.role)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>
              {node.position && <span>💼 {node.position}</span>}
              {node.department && <span> · 🏷️ {node.department}</span>}
              {node.branch?.name && <span> · 🏢 {node.branch.name}</span>}
            </div>
          </div>

          <div style={{ fontSize: 11, color: '#8b95a7' }}>
            {hasChildren && `(${node.children.length})`}
          </div>
        </div>

        {hasChildren && isOpen && (
          <div style={{ borderRight: '2px dashed #d0d8e4', marginRight: 14, paddingRight: 10 }}>
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ color: 'var(--navy)' }}>📄 الهيكل التنظيمي</h3>
        <button className="btn gray" style={{ padding: '6px 12px', fontSize: 12 }} onClick={loadTree}>
          🔄 تحديث
        </button>
      </div>

      {msg && (
        <p style={{
          padding: 12,
          background: msg.startsWith('✅') ? '#d4edda' : '#f8d7da',
          borderRadius: 8,
          marginBottom: 16,
          color: '#000',
        }}>{msg}</p>
      )}

      <div className="glass" style={{ padding: 20 }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--gray)' }}>جاري التحميل...</p>
        ) : tree.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--gray)' }}>
            لا يوجد موظفون. تأكد من إضافة موظفين وتعيين مديرين لهم.
          </p>
        ) : (
          <div>{tree.map(node => renderNode(node))}</div>
        )}
      </div>

      <div style={{
        marginTop: 20,
        padding: 14,
        background: '#f8f9fb',
        borderRadius: 10,
        fontSize: 12,
        color: 'var(--gray)',
        lineHeight: 1.8,
      }}>
        <b style={{ color: 'var(--navy)' }}>💡 ملاحظة:</b> الشجرة بتبني نفسها من حقل <code>managerId</code> في بيانات كل موظف.
        عشان تضيف موظف تحت مدير معين، افتح <b>EmployeeProfile</b> بتاعه وعدّل حقل "المدير المباشر".
      </div>
    </div>
  );
}