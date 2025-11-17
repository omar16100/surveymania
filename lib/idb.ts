// Minimal IndexedDB helper for offline queue
export type QueuedItem = {
  id: string
  url: string
  payload: any
  createdAt: number
  retries: number
  lastAttempt: number // Timestamp of last retry attempt
}

function openDB(): Promise<IDBDatabase> {
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

export async function idbAdd(item: QueuedItem): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('submissions', 'readwrite')
    tx.objectStore('submissions').put(item)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function idbGetAll(): Promise<QueuedItem[]> {
  const db = await openDB()
  const items = await new Promise<QueuedItem[]>((resolve, reject) => {
    const tx = db.transaction('submissions', 'readonly')
    const req = tx.objectStore('submissions').getAll()
    req.onsuccess = () => resolve(req.result as QueuedItem[])
    req.onerror = () => reject(req.error)
  })
  db.close()
  return items
}

export async function idbDelete(id: string): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('submissions', 'readwrite')
    tx.objectStore('submissions').delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function idbUpdate(item: QueuedItem): Promise<void> {
  await idbAdd(item)
}

