/* Simple service worker for offline submissions sync */
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('sm_offline', 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('submissions')) {
        db.createObjectStore('submissions', { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function idbAll(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('submissions', 'readonly')
    const req = tx.objectStore('submissions').getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function idbDelete(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('submissions', 'readwrite')
    tx.objectStore('submissions').delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function idbUpdate(db, item) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('submissions', 'readwrite')
    tx.objectStore('submissions').put(item)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function calculateBackoffDelay(retries) {
  const baseDelay = 1000 // 1 second
  const maxDelay = 300000 // 5 minutes
  return Math.min(baseDelay * Math.pow(2, retries), maxDelay)
}

function shouldRetry(item) {
  const now = Date.now()
  const delay = calculateBackoffDelay(item.retries)
  return (now - item.lastAttempt) >= delay
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sm-sync-submissions') {
    event.waitUntil(
      (async () => {
        const db = await openDB()
        const items = await idbAll(db)
        for (const item of items) {
          // Skip items that haven't reached their backoff delay
          if (item.retries > 0 && !shouldRetry(item)) {
            continue
          }

          // Update last attempt timestamp
          item.lastAttempt = Date.now()

          try {
            const res = await fetch(item.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.payload)
            })
            if (res.ok) {
              await idbDelete(db, item.id)
            } else {
              // Update retries count on failure
              item.retries = (item.retries || 0) + 1
              await idbUpdate(db, item)
            }
          } catch (e) {
            // Update retries count on error
            item.retries = (item.retries || 0) + 1
            await idbUpdate(db, item)
          }
        }
        db.close()
      })()
    )
  }
})

