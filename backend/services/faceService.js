const faceapi = require('face-api.js');
const canvas = require('canvas');
const path = require('path');
const fs = require('fs');

// ============================================
// ✅ تحميل النماذج
// ============================================
const { Canvas, Image, ImageData, fetch: nodeFetch } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData, fetch: nodeFetch });

const MODELS_PATH = path.join(__dirname, '..', 'models', 'face');

// ✅ تحميل النماذج (مرة واحدة)
async function loadModels() {
  if (faceapi.nets.ssdMobilenetv1.isLoaded) return;
  
  try {
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH);
    console.log('✅ Face-api models loaded');
  } catch (err) {
    console.error('❌ Failed to load face models:', err.message);
    throw err;
  }
}

// ============================================
// ✅ استخراج الـ descriptor من صورة
// ============================================
async function getFaceDescriptor(imageBuffer) {
  await loadModels();
  
  try {
    // ✅ تحويل Buffer → Image
    const img = new Image();
    img.src = imageBuffer;
    
    // ✅ كشف الوجه + descriptor
    const detection = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    if (!detection) {
      return {
        success: false,
        error: 'لم يتم اكتشاف أي وجه في الصورة',
      };
    }
    
    // ✅ تحويل Float32Array → Array
    const descriptor = Array.from(detection.descriptor);
    
    return {
      success: true,
      descriptor,
      box: detection.detection.box,
      score: detection.detection.score,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}

// ============================================
// ✅ مقارنة وجهين
// ============================================
function compareFaces(descriptor1, descriptor2, threshold = 0.6) {
  try {
    const d1 = new Float32Array(descriptor1);
    const d2 = new Float32Array(descriptor2);
    
    const distance = faceapi.euclideanDistance(d1, d2);
    
    // ✅ كلما قل الـ distance → تشابه أعلى
    // ✅ < 0.6 → نفس الشخص
    return {
      match: distance < threshold,
      distance,
      confidence: Math.max(0, 1 - distance),
    };
  } catch (err) {
    return {
      match: false,
      distance: 999,
      confidence: 0,
      error: err.message,
    };
  }
}

// ============================================
// ✅ تحويل Data URL → Buffer
// ============================================
function dataURLToBuffer(dataURL) {
  const base64Data = dataURL.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

module.exports = {
  loadModels,
  getFaceDescriptor,
  compareFaces,
  dataURLToBuffer,
};