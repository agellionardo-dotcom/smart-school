const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// ============================================
// ✅ تهيئة Cloudinary
// ============================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ============================================
// ✅ أنواع المستندات المسموحة
// ============================================
const ALLOWED_TYPES = {
  'national_id': 'بطاقة الرقم القومي',
  'birth_certificate': 'شهادة الميلاد',
  'degree': 'المؤهل الدراسي',
  'contract': 'العقد',
  'health_insurance': 'التأمين الصحي',
  'social_insurance': 'التأمينات الاجتماعية',
  'bank_account': 'بيانات البنك',
  'experience': 'شهادة خبرة',
  'personal_photo': 'صورة شخصية',
  'training': 'شهادة تدريب',
  'medical_report': 'تقرير طبي',
  'driving_license': 'رخصة قيادة',
  'signature': 'التوقيع',
  'pledge': 'تعهد',
  'other': 'أخرى',
};

// ============================================
// ✅ Cloudinary Storage
// ============================================
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // ✅ userId من الـ auth middleware
    const userId = req.user?.id || 'unknown';
    const docType = req.body?.type || 'other';

    // ✅ اسم الملف (بدون مسافات)
    const timestamp = Date.now();
    const sanitizedName = (file.originalname || 'file')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 50);

    return {
      folder: `smart-school/documents/${userId}`,
      public_id: `${docType}_${timestamp}_${sanitizedName}`,
      resource_type: 'auto', // pdf, image, ...
      // ✅ تحسين تلقائي
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    };
  },
});

// ============================================
// ✅ فلتر الملفات (validation)
// ============================================
const fileFilter = (req, file, cb) => {
  // ✅ الأنواع المسموحة
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'نوع الملف غير مسموح. الأنواع المسموحة: JPG, PNG, WEBP, PDF, DOC, DOCX'
      ),
      false
    );
  }
};

// ============================================
// ✅ Multer Upload
// ============================================
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
    files: 1, // ملف واحد
  },
});

// ============================================
// ✅ Export
// ============================================
module.exports = {
  upload,
  cloudinary,
  ALLOWED_TYPES,
};