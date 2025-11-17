import { idbAdd, idbDelete, idbGetAll, idbUpdate, type QueuedItem } from './idb'

/**
 * Calculate exponential backoff delay in milliseconds
 * Formula: min(1000 * 2^retries, 300000)
 * Max delay: 5 minutes (300000ms)
 */
function calculateBackoffDelay(retries: number): number {
  const baseDelay = 1000 // 1 second
  const maxDelay = 300000 // 5 minutes
  return Math.min(baseDelay * Math.pow(2, retries), maxDelay)
}

/**
 * Check if item should be retried based on backoff delay
 */
function shouldRetry(item: QueuedItem): boolean {
  const now = Date.now()
  const delay = calculateBackoffDelay(item.retries)
  return (now - item.lastAttempt) >= delay
}

export async function queueSubmission(url: string, payload: any) {
  const id = `${payload.sessionId || 'anon'}-${crypto.randomUUID()}`
  const item: QueuedItem = {
    id,
    url,
    payload,
    createdAt: Date.now(),
    retries: 0,
    lastAttempt: 0 // Will be set on first attempt
  }
  await idbAdd(item)
  tryRegisterSync()
  return id
}

export async function processQueue(): Promise<{ processed: number; remaining: number; skipped: number }> {
  const items = await idbGetAll()
  let processed = 0
  let skipped = 0

  for (const item of items) {
    // Skip items that haven't reached their backoff delay
    if (item.retries > 0 && !shouldRetry(item)) {
      skipped++
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
        await idbDelete(item.id)
        processed++
      } else {
        item.retries += 1
        await idbUpdate(item)
      }
    } catch {
      item.retries += 1
      await idbUpdate(item)
    }
  }

  const remaining = (await idbGetAll()).length
  return { processed, remaining, skipped }
}

export function tryRegisterSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then((reg) => reg.sync.register('sm-sync-submissions')).catch(() => {})
  }
}

