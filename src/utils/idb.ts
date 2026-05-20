export function setKey(key: string, value: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('storage', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('keyval');
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('keyval', 'readwrite');
      tx.objectStore('keyval').put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}

export function getKey<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('storage', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('keyval');
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('keyval', 'readonly');
      const store = tx.objectStore('keyval');
      const getRequest = store.get(key);
      getRequest.onsuccess = () => resolve(getRequest.result);
      getRequest.onerror = () => reject(getRequest.error);
    };
    request.onerror = () => reject(request.error);
  });
}

export function clearStore(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('storage', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('keyval');
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('keyval', 'readwrite');
      tx.objectStore('keyval').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}
