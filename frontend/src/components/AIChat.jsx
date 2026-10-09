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
      .slice(-10, -1)                              // آخر 10 رسائل (بدون الجديدة)
      .filter(m => !m.isError)                     // بدون رسائل خطأ
      .filter(m => m.content && m.content.trim())  // بدون الفاضية
      .map(m => ({
        role: m.role,
        content: m.content,
      }));

    // ✅ شيل رسالة الترحيب (model) من الأول
    while (history.length > 0 && history[0].role === 'model') {
      history.shift();
    }

    // ✅ شيل أي "model" من الآخر (لأن Gemini عايز آخر رسالة user)
    while (history.length > 0 && history[history.length - 1].role === 'model') {
      history.pop();
    }

    // ✅ لو الـ history فيه "model" متتاليين، شيلهم
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