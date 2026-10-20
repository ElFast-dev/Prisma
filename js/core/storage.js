const DB_NAME = "prisma-local-v1";
const DB_STORE = "kv";
let dbPromise = null;

export function openDB() {
  if (!("indexedDB" in window)) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(function (resolve) {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = function () {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE, { keyPath: "key" });
    };
    request.onsuccess = function () { resolve(request.result); };
    request.onerror = function () { resolve(null); };
    request.onblocked = function () { resolve(null); };
  });
  return dbPromise;
}

export async function dbGet(key) {
  const db = await openDB();
  if (!db) {
    try { return JSON.parse(localStorage.getItem("prisma:" + key) || "null"); } catch (_) { return null; }
  }
  return new Promise(function (resolve) {
    const tx = db.transaction(DB_STORE, "readonly");
    const request = tx.objectStore(DB_STORE).get(key);
    request.onsuccess = function () { resolve(request.result ? request.result.value : null); };
    request.onerror = function () {
      try { resolve(JSON.parse(localStorage.getItem("prisma:" + key) || "null")); } catch (_) { resolve(null); }
    };
  });
}

export async function dbSet(key, value) {
  const db = await openDB();
  if (!db) {
    localStorage.setItem("prisma:" + key, JSON.stringify(value));
    return;
  }
  return new Promise(function (resolve, reject) {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put({ key: key, value: value });
    tx.oncomplete = function () { resolve(); };
    tx.onerror = function () {
      try { localStorage.setItem("prisma:" + key, JSON.stringify(value)); resolve(); }
      catch (error) { reject(error); }
    };
    tx.onabort = function () {
      try { localStorage.setItem("prisma:" + key, JSON.stringify(value)); resolve(); }
      catch (error) { reject(error); }
    };
  });
}
