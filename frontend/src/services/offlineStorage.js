import { Preferences } from '@capacitor/preferences';

// حفظ بيانات في التخزين المحلي
export const saveData = async (key, value) => {
  try {
    await Preferences.set({
      key: key,
      value: JSON.stringify(value)
    });
    return true;
  } catch (error) {
    console.error('Error saving data:', error);
    return false;
  }
};

// قراءة بيانات من التخزين المحلي
export const getData = async (key) => {
  try {
    const { value } = await Preferences.get({ key: key });
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Error reading data:', error);
    return null;
  }
};

// حذف بيانات من التخزين المحلي
export const removeData = async (key) => {
  try {
    await Preferences.remove({ key: key });
    return true;
  } catch (error) {
    console.error('Error removing data:', error);
    return false;
  }
};

// إضافة عنصر إلى قائمة الانتظار (للطلبات المؤجلة)
export const addToQueue = async (item) => {
  try {
    const queue = await getData('sync_queue') || [];
    queue.push({
      ...item,
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString()
    });
    await saveData('sync_queue', queue);
    return true;
  } catch (error) {
    console.error('Error adding to queue:', error);
    return false;
  }
};

// قراءة قائمة الانتظار
export const getQueue = async () => {
  return await getData('sync_queue') || [];
};

// حذف عنصر من قائمة الانتظار
export const removeFromQueue = async (id) => {
  try {
    const queue = await getData('sync_queue') || [];
    const newQueue = queue.filter(item => item.id !== id);
    await saveData('sync_queue', newQueue);
    return true;
  } catch (error) {
    console.error('Error removing from queue:', error);
    return false;
  }
};