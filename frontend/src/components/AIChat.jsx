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
  const suggestionsLoadedRef = useRef(false); // ✅ يمنع infinite loop

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
          content:
            'أهلاً! 👋 أنا مساعد Smart School الذكي. اسألني عن أي حاجة تخص حضورك، إجازاتك، أو أي بيانات في النظام.',
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

  // ✅ تحميل الاقتراحات مرة واحدة لما يفتح
  // ✅ استخدمنا useRef عشان نتجنب infinite loop
  useEffect(() => {
    if (!isOpen) return;
    if (suggestionsLoadedRef.current) return;
    suggestionsLoadedRef.current = true;

    api
      .get('/ai/suggestions')
      .then((r) => setSuggestions(r.data.suggestions || []))
      .catch(() => {
        // لو فشل، نسمح بإعادة المحاولة في المرة الجاية
        suggestionsLoadedRef.current = false;
      });
  }, [isOpen]);

  // ✅ إرسال الرسالة
  const sendMessage = async (text) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    setInput('');
    const userMsg = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      // ✅ نبني history نظيف
      let history = newMessages
        .slice(-10, -1)
        .filter((m) => !m.isError)
        .filter((m) => m.content && m.content.trim())
        .map((m) => ({
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

      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content: data.reply,
          timestamp: data.timestamp,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
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
      {/* ✅ زر عائم — Glassmorphism */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="ai-fab"
          title="المساعد الذكي"
        >
          <span className="ai-fab-emoji">🤖</span>
          <span className="ai-fab-glow" />
        </button>
      )}

      {/* ✅ نافذة الدردشة — Glass */}
      {isOpen && (
        <div className="ai-window">
          {/* Header */}
          <div className="ai-header">
            <div className="ai-header-left">
              <span className="ai-header-emoji">🤖</span>
              <div>
                <div className="ai-header-title">المساعد الذكي</div>
                <div className="ai-header-sub">Smart School AI</div>
              </div>
            </div>
            <div className="ai-header-right">
              <button onClick={clearChat} title="مسح المحادثة" className="ai-icon-btn">
                🗑️
              </button>
              <button onClick={() => setIsOpen(false)} title="إغلاق" className="ai-icon-btn">
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="ai-messages">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`ai-bubble-wrap ${
                  msg.role === 'user' ? 'ai-bubble-user-wrap' : 'ai-bubble-model-wrap'
                }`}
              >
                <div
                  className={`ai-bubble ${
                    msg.role === 'user'
                      ? 'ai-bubble-user'
                      : msg.isError
                      ? 'ai-bubble-error'
                      : 'ai-bubble-model'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="ai-bubble-wrap ai-bubble-model-wrap">
                <div className="ai-bubble ai-bubble-model ai-bubble-typing">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && suggestions.length > 0 && (
            <div className="ai-suggestions">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  disabled={loading}
                  className="ai-suggestion-chip"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="ai-input-bar">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب سؤالك..."
              rows={1}
              disabled={loading}
              className="ai-textarea"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="ai-send-btn"
            >
              {loading ? '⏳' : '📤'}
            </button>
          </div>
        </div>
      )}

      {/* ✅ Styles */}
      <style>{`
        /* ============ FAB ============ */
        .ai-fab {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
          width: 62px;
          height: 62px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.2);
          background: linear-gradient(135deg, #00e5ff 0%, #a855f7 100%);
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 32px rgba(0,229,255,0.4), 0 4px 16px rgba(168,85,247,0.3);
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          animation: aiPulse 2.5s ease-in-out infinite;
        }
        .ai-fab:hover { transform: scale(1.1) rotate(5deg); }
        .ai-fab:active { transform: scale(0.95); }
        .ai-fab-emoji { font-size: 28px; position: relative; z-index: 2; }
        .ai-fab-glow {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,229,255,0.6), transparent 70%);
          z-index: 1;
          animation: aiGlow 3s ease-in-out infinite;
        }

        @keyframes aiPulse {
          0%, 100% { box-shadow: 0 8px 32px rgba(0,229,255,0.4), 0 4px 16px rgba(168,85,247,0.3); }
          50% { box-shadow: 0 8px 44px rgba(0,229,255,0.7), 0 4px 24px rgba(168,85,247,0.5); }
        }
        @keyframes aiGlow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.15); }
        }

        /* ============ Window ============ */
        .ai-window {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
          width: min(420px, calc(100vw - 40px));
          height: min(620px, calc(100vh - 40px));
          background: rgba(15, 33, 56, 0.85);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          direction: rtl;
          animation: aiWindowIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes aiWindowIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ============ Header ============ */
        .ai-header {
          padding: 14px 16px;
          background: linear-gradient(135deg, rgba(0,229,255,0.15), rgba(168,85,247,0.15));
          border-bottom: 1px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #fff;
        }
        .ai-header-left { display: flex; align-items: center; gap: 10px; }
        .ai-header-emoji { font-size: 24px; }
        .ai-header-title { font-weight: 700; font-size: 15px; color: #fff; }
        .ai-header-sub { font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 2px; }
        .ai-header-right { display: flex; gap: 6px; }
        .ai-icon-btn {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.15);
          color: #fff;
          width: 32px;
          height: 32px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ai-icon-btn:hover {
          background: rgba(255,255,255,0.2);
          border-color: rgba(255,255,255,0.3);
        }

        /* ============ Messages ============ */
        .ai-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: transparent;
        }
        .ai-messages::-webkit-scrollbar { width: 6px; }
        .ai-messages::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15);
          border-radius: 3px;
        }

        .ai-bubble-wrap {
          display: flex;
          max-width: 85%;
          animation: aiBubbleIn 0.3s ease;
        }
        .ai-bubble-user-wrap { align-self: flex-start; }
        .ai-bubble-model-wrap { align-self: flex-end; }
        @keyframes aiBubbleIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .ai-bubble {
          padding: 10px 14px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .ai-bubble-user {
          background: linear-gradient(135deg, #00e5ff, #a855f7);
          color: #fff;
          border-bottom-left-radius: 4px;
          box-shadow: 0 4px 12px rgba(0,229,255,0.25);
        }
        .ai-bubble-model {
          background: rgba(255,255,255,0.1);
          color: #f8fafc;
          border: 1px solid rgba(255,255,255,0.12);
          border-bottom-right-radius: 4px;
          backdrop-filter: blur(10px);
        }
        .ai-bubble-error {
          background: rgba(239,68,68,0.2);
          color: #fca5a5;
          border: 1px solid rgba(239,68,68,0.3);
          border-bottom-right-radius: 4px;
        }
        .ai-bubble-typing {
          display: flex;
          gap: 5px;
          align-items: center;
          padding: 12px 16px;
        }

        .typing-dot {
          width: 7px;
          height: 7px;
          background: #00e5ff;
          border-radius: 50%;
          animation: typingBounce 1.4s infinite;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-8px); opacity: 1; }
        }

        /* ============ Suggestions ============ */
        .ai-suggestions {
          padding: 10px 12px;
          background: rgba(0,0,0,0.15);
          border-top: 1px solid rgba(255,255,255,0.08);
          display: flex;
          gap: 8px;
          overflow-x: auto;
          flex-wrap: nowrap;
        }
        .ai-suggestions::-webkit-scrollbar { height: 4px; }
        .ai-suggestions::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15);
          border-radius: 2px;
        }
        .ai-suggestion-chip {
          padding: 7px 14px;
          border-radius: 20px;
          border: 1px solid rgba(0,229,255,0.4);
          background: rgba(0,229,255,0.08);
          color: #67e8f9;
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
          font-family: inherit;
          flex: 0 0 auto;
          transition: all 0.2s;
        }
        .ai-suggestion-chip:hover:not(:disabled) {
          background: rgba(0,229,255,0.18);
          border-color: rgba(0,229,255,0.7);
          transform: translateY(-1px);
        }
        .ai-suggestion-chip:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ============ Input ============ */
        .ai-input-bar {
          padding: 12px;
          background: rgba(0,0,0,0.2);
          border-top: 1px solid rgba(255,255,255,0.08);
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }
        .ai-textarea {
          flex: 1;
          padding: 11px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.06);
          color: #f8fafc;
          font-size: 14px;
          font-family: inherit;
          resize: none;
          outline: none;
          max-height: 100px;
          direction: rtl;
          transition: all 0.2s;
        }
        .ai-textarea::placeholder { color: rgba(255,255,255,0.4); }
        .ai-textarea:focus {
          background: rgba(255,255,255,0.1);
          border-color: rgba(0,229,255,0.5);
          box-shadow: 0 0 0 3px rgba(0,229,255,0.12);
        }
        .ai-textarea:disabled { opacity: 0.6; }

        .ai-send-btn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #00e5ff, #a855f7);
          color: #fff;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(0,229,255,0.3);
          flex: 0 0 auto;
        }
        .ai-send-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(0,229,255,0.5);
        }
        .ai-send-btn:disabled {
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.3);
          cursor: not-allowed;
          box-shadow: none;
        }

        /* ============ Mobile ============ */
        @media (max-width: 480px) {
          .ai-window {
            bottom: 0;
            right: 0;
            width: 100vw;
            height: 100vh;
            border-radius: 0;
          }
          .ai-fab { bottom: 16px; right: 16px; }
        }
      `}</style>
    </>
  );
}