const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const User = require('../models/User');
const { buildUserContext, buildSystemPrompt } = require('../services/aiContext');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ============================================
// ✅ POST /api/ai/chat
// ============================================
router.post('/chat', auth, tenant, async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ msg: 'الرسالة مطلوبة' });
    }

    // ✅ المستخدم من نفس الشركة
    const user = await User.findOne({
      _id: req.user.id,
      companyId: req.companyId,   // ← ✅
    });

    if (!user) {
      return res.status(404).json({ msg: 'المستخدم غير موجود' });
    }

    // ✅ نبني الـ context (ممكن نضيف companyId في المستقبل)
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
      .filter((h) => h && h.content && h.content.trim())
      .map((h) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      }));

    while (validHistory.length > 0 && validHistory[0].role === 'model') {
      validHistory.shift();
    }

    while (
      validHistory.length > 0 &&
      validHistory[validHistory.length - 1].role === 'model'
    ) {
      validHistory.pop();
    }

    let response;
    if (validHistory.length === 0) {
      const result = await model.generateContent(message);
      response = result.response.text();
    } else {
      try {
        const chat = model.startChat({ history: validHistory });
        const result = await chat.sendMessage(message);
        response = result.response.text();
      } catch (chatErr) {
        console.warn('startChat failed, using generateContent:', chatErr.message);
        const result = await model.generateContent(message);
        response = result.response.text();
      }
    }

    res.json({
      success: true,
      reply: response,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('AI Chat error:', err);

    let errorMsg = 'حدث خطأ مؤقت — جرب تاني';
    if (err.message?.includes('API_KEY')) {
      errorMsg = 'مفتاح API غير صالح — راجع الإعدادات';
    } else if (err.message?.includes('quota')) {
      errorMsg = 'تم استهلاك الحصة اليومية — جرب بعد شوية';
    } else if (err.message?.includes('role')) {
      errorMsg = 'خطأ في تنسيق المحادثة — جرب تسأل من جديد';
    } else if (err.message?.includes('not found')) {
      errorMsg = 'الموديل غير متاح';
    } else if (err.message?.includes('SAFETY') || err.message?.includes('blocked')) {
      errorMsg = 'مقدرش أجاوب على السؤال ده — جرب صيغة تانية';
    } else if (err.message?.includes('timeout') || err.message?.includes('ETIMEDOUT')) {
      errorMsg = 'الاتصال بطيء — جرب تاني';
    }

    res.status(500).json({ msg: errorMsg, error: err.message });
  }
});

// ============================================
// ✅ GET /api/ai/suggestions — اقتراحات جاهزة
// ============================================
router.get('/suggestions', auth, tenant, async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.user.id,
      companyId: req.companyId,   // ← ✅
    });

    const role = user?.companyRole || user?.role || 'employee';

    let suggestions = [];

    if (role === 'employee') {
      suggestions = [
        'كام يوم إجازة متبقي عندي؟',
        'إمتى آخر مرة سجّلت حضور؟',
        'إيه مواعيد العمل الرسمية؟',
        'مين المدير المباشر بتاعتي؟',
        'كام يوم تأخير عندي الشهر ده؟',
      ];
    } else if (role === 'manager' || role === 'hr') {
      suggestions = [
        'كام موظف غايب النهاردة؟',
        'مين أكتر واحد بيتأخر؟',
        'إيه نسبة الحضور الشهر ده؟',
        'كام طلب إجازة معلق؟',
        'إيه ترتيب الفروع حسب الحضور؟',
      ];
    } else if (role === 'company_owner' || role === 'superadmin') {
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