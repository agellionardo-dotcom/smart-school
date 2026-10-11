// frontend/src/hooks/useFaceApi.js
// Hook لتحميل نماذج Face API + استخراج الـ descriptor

import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';

const MODELS_URL = '/models';
const DETECTION_OPTIONS = new faceapi.SsdMobilenetv1Options({
  minConfidence: 0.5,
});

// ✅ مفتاح التخزين
const MODELS_LOADED_KEY = 'face_models_loaded';

export default function useFaceApi() {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const loadingRef = useRef(false);

  // ✅ تحميل النماذج
  const loadModels = useCallback(async () => {
    if (loaded || loadingRef.current) return true;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      console.log('[FaceAPI] Loading models from', MODELS_URL);

      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
      ]);

      console.log('[FaceAPI] ✅ Models loaded');
      localStorage.setItem(MODELS_LOADED_KEY, 'true');
      setLoaded(true);
      setLoading(false);
      return true;
    } catch (err) {
      console.error('[FaceAPI] ❌ Load error:', err);
      setError(err.message || 'فشل تحميل النماذج');
      setLoading(false);
      loadingRef.current = false;
      return false;
    }
  }, [loaded]);

  // ✅ تحميل تلقائي عند mount
  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // ✅ استخراج descriptor من عنصر فيديو/صورة
  const getDescriptor = useCallback(async (input) => {
    if (!input) return null;

    try {
      const detection = await faceapi
        .detectSingleFace(input, DETECTION_OPTIONS)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) return null;

      return {
        descriptor: Array.from(detection.descriptor),
        box: detection.detection.box,
        landmarks: detection.landmarks,
      };
    } catch (err) {
      console.error('[FaceAPI] Descriptor error:', err);
      return null;
    }
  }, []);

  // ✅ مقارنة descriptor مع آخر مسجل
  const compareDescriptors = useCallback((desc1, desc2) => {
    if (!desc1 || !desc2) return null;
    const distance = faceapi.euclideanDistance(desc1, desc2);
    return {
      distance,
      isMatch: distance < 0.6,
    };
  }, []);

  return {
    loaded,
    loading,
    error,
    loadModels,
    getDescriptor,
    compareDescriptors,
  };
}