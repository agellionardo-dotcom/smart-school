const isCapacitor = typeof window !== 'undefined' && window.Capacitor !== undefined;

export const API_URL = isCapacitor
  ? 'http://192.168.1.10:5000'
  : 'http://localhost:5000';