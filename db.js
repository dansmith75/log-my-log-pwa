const DB_NAME = 'log-my-log-db';
const STORE = 'entries';
const VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, operation) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let result;
    try { result = operation(store); } catch (err) { reject(err); return; }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getEntries() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result.sort((a,b) => b.timestamp.localeCompare(a.timestamp)));
    req.onerror = () => reject(req.error);
  });
}

export async function saveEntry(entry) { return withStore('readwrite', store => store.put(entry)); }
export async function deleteEntry(id) { return withStore('readwrite', store => store.delete(id)); }
export async function clearEntries() { return withStore('readwrite', store => store.clear()); }
export async function bulkSave(entries) {
  return withStore('readwrite', store => entries.forEach(entry => store.put(entry)));
}
