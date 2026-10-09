import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ✅ تحميل المحادثة من localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ai_chat_history');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch {}
    } else {
      setMessages([
        {
          role: 'model',
          content: 'أهلاً! 👋 أنا مساعد Smart School الذكي. اسألني عن أي حاجة تخص حضورك، إجازاتك، أو أي بيانات في النظام.',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, []);

  // ✅ حفظ المحادثة
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('ai_chat_history', JSON.stringify(messages.slice(-50)));
    }
  }, [messages]);

  // ✅ التمرير لآخر رسالة
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ✅ تحميل الاقتراحات لما يفتح
  useEffect(() => {
    if (isOpen && suggestions.length === 0) {
      api.get('/ai/suggestions')
        .then(r => setSuggestions(r.data.suggestions || []))
        .catch(() => {});
    }
  }, [isOpen]);

  // ✅ إرسال الرسالة
  const sendMessage = async (text) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    setInput('');
    const userMsg = { role: 'user', content: messageText, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      // ✅ نبني history نظيف
      let history = newMessages
        .slice(-10, -1)
        .filter(m => !m.isError)
        .filter(m => m.content && m.content.trim())
        .map(m => ({
          role: m.role,
          content: m.content,
        }));

      // ✅ شيل رسالة الترحيب (model) من الأول
      while (history.length > 0 && history[0].role === 'model') {
        history.shift();
      }

      // ✅ شيل أي "model" من الآخر
      while (history.length > 0 && history[history.length - 1].role === 'model') {
        history.pop();
      }

      // ✅ شيل "model" المتتاليين
      history = history.filter((h, i, arr) => {
        if (i === 0) return h.role === 'user';
        return !(h.role === 'model' && arr[i - 1]?.role === 'model');
      });

      const { data } = await api.post('/ai/chat', {
        message: messageText,
        history,
      });

      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          content: data.reply,
          timestamp: data.timestamp,
        },
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          content: '❌ ' + (err.response?.data?.msg || 'حدث خطأ، حاول تاني'),
          timestamp: new Date().toISOString(),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Enter للإرسال
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ✅ مسح المحادثة
  const clearChat = () => {
    if (!window.confirm('مسح كل المحادثة؟')) return;
    setMessages([
      {
        role: 'model',
        content: 'أهلاً! 👋 أنا مساعد Smart School الذكي. اسألني عن أي حاجة.',
        timestamp: new Date().toISOString(),
      },
    ]);
    localStorage.removeItem('ai_chat_history');
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 9999,
            width: 60,
            height: 60,
            borderRadius: '50%',
            border: 'none',
            background: 'linear-gradient(145deg, #0a1f44, #142b5c)',
            color: '#fff',
            fontSize: 28,
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(10,31,68,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'aiPulse 2s infinite',
          }}
          title="المساعد الذكي"
        >
          🤖
        </button>
      )}

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 9999,
            width: 'min(400px, calc(100vw - 40px))',
            height: 'min(600px, calc(100vh - 40px))',
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 10px 40px rgba(10,31,68,0.3)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            direction: 'rtl',
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              background: 'linear-gradient(145deg, #0a1f44, #142b5c)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>🤖</span>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: 15 }}>المساعد الذكي</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>Smart School AI</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={clearChat}
                title="مسح المحادثة"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#fff',
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                🗑️
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="إغلاق"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#fff',
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                ✕
              </button>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 16,
              background: '#f5f7fa',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-start' : 'flex-end',
                  maxWidth: '85%',
                }}
              >
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 14,
                    background:
                      msg.role === 'user'
                        ? 'linear-gradient(145deg, #0a1f44, #142b5c)'
                        : msg.isError
                        ? '#f8d7da'
                        : '#fff',
                    color: msg.role === 'user' ? '#fff' : '#0a1f44',
                    fontSize: 14,
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    borderBottomRightRadius: msg.role === 'user' ? 14 : 4,
                    borderBottomLeftRadius: msg.role === 'user' ? 4 : 14,
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ alignSelf: 'flex-end', maxWidth: '85%' }}>
                <div
                  style={{
                    padding: '12px 18px',
                    borderRadius: 14,
                    background: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    display: 'flex',
                    gap: 4,
                    alignItems: 'center',
                  }}
                >
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && suggestions.length > 0 && (
            <div
              style={{
                padding: '8px 12px',
                background: '#fff',
                borderTop: '1px solid #e0e6ef',
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                flexWrap: 'nowrap',
              }}
            >
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  disabled={loading}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    border: '1px solid #0a1f44',
                    background: '#fff',
                    color: '#0a1f44',
                    fontSize: 12,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    fontFamily: 'inherit',
                    flex: '0 0 auto',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div
            style={{
              padding: 12,
              background: '#fff',
              borderTop: '1px solid #e0e6ef',
              display: 'flex',
              gap: 8,
              alignItems: 'flex-end',
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب سؤالك..."
              rows={1}
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid #e0e6ef',
                fontSize: 14,
                fontFamily: 'inherit',
                resize: 'none',
                outline: 'none',
                maxHeight: 100,
                direction: 'rtl',
                color: '#0a1f44',
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                border: 'none',
                background: loading || !input.trim()
                  ? '#8b95a7'
                  : 'linear-gradient(145deg, #0a1f44, #142b5c)',
                color: '#fff',
                fontSize: 18,
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {loading ? '⏳' : '📤'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes aiPulse {
          0%, 100% { box-shadow: 0 6px 20px rgba(10,31,68,0.5); }
          50% { box-shadow: 0 6px 30px rgba(10,31,68,0.9); }
        }
        .typing-dot {
          width: 8px;
          height: 8px;
          background: #0a1f44;
          border-radius: 50%;
          animation: typingBounce 1.4s infinite;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </>
  );
}