const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const auth = require('../middleware/auth');
const User = require('../models/User');
const { buildUserContext, buildSystemPrompt } = require('../services/aiContext');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ============================================
// ✅ POST /api/ai/chat
// ============================================
router.post('/chat', auth, async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ msg: 'الرسالة مطلوبة' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'المستخدم غير موجود' });

    const context = await buildUserContext(user);
    const systemPrompt = buildSystemPrompt(context);

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.8-flash',
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
        topP: 0.9,
      },
    });

    // ✅ بناء history سليم — لازم يبدأ بـ user
    let validHistory = (history || [])
      .filter(h => h && h.content && h.content.trim())
      .map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      }));

    // ✅ شيل رسالة الترحيب (model) من الأول
    while (validHistory.length > 0 && validHistory[0].role === 'model') {
      validHistory.shift();
    }

    // ✅ لو الـ history فاضي، نستخدم generateContent مباشرة
    let response;
    if (validHistory.length === 0) {
      const result = await model.generateContent(message);
      response = result.response.text();
    } else {
      const chat = model.startChat({ history: validHistory });
      const result = await chat.sendMessage(message);
      response = result.response.text();
    }

    res.json({
      success: true,
      reply: response,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('AI Chat error:', err);

    let errorMsg = 'حدث خطأ في المساعد الذكي';
    if (err.message?.includes('API_KEY')) {
      errorMsg = 'مفتاح API غير صالح — راجع الإعدادات';
    } else if (err.message?.includes('quota')) {
      errorMsg = 'تم استهلاك الحصة اليومية — جرب بكرة';
    } else if (err.message?.includes('role')) {
      errorMsg = 'خطأ في تنسيق المحادثة';
    } else if (err.message?.includes('not found')) {
      errorMsg = 'الموديل غير متاح';
    }

    res.status(500).json({ msg: errorMsg, error: err.message });
  }
});

// ============================================
// ✅ GET /api/ai/suggestions
// ============================================
router.get('/suggestions', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const role = user.role;

    let suggestions = [];

    if (role === 'employee') {
      suggestions = [
        'كام يوم إجازة متبقي عندي؟',
        'إمتى آخر مرة سجّلت حضور؟',
        'إيه مواعيد العمل الرسمية؟',
        'مين المدير المباشر بتاعتي؟',
        'كام يوم تأخير عندي الشهر ده؟',
      ];
    } else if (role === 'manager') {
      suggestions = [
        'كام موظف غايب النهاردة؟',
        'مين أكتر واحد بيتأخر؟',
        'إيه نسبة الحضور الشهر ده؟',
        'كام طلب إجازة معلق؟',
        'إيه ترتيب الفروع حسب الحضور؟',
      ];
    } else if (role === 'hr' || role === 'superadmin') {
      suggestions = [
        'كام موظف في الشركة؟',
        'إيه نسبة الحضور النهاردة؟',
        'مين أعلى فرع في التأخير؟',
        'كام طلب إجازة معلق؟',
        'إيه إحصائيات الرواتب الشهر ده؟',
      ];
    }

    res.json({ suggestions });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;