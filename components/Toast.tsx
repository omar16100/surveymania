"use client"
import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export type Toast = {
  id: string
  type: ToastType
  message: string
  duration?: number
}

let toastListeners: Array<(toast: Toast) => void> = []

export function showToast(message: string, type: ToastType = 'info', duration: number = 4000) {
  const toast: Toast = {
    id: Math.random().toString(36).substring(7),
    type,
    message,
    duration
  }
  toastListeners.forEach(listener => listener(toast))
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts(prev => [...prev, toast])

      // Auto-remove after duration
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id))
      }, toast.duration || 4000)
    }

    toastListeners.push(listener)

    return () => {
      toastListeners = toastListeners.filter(l => l !== listener)
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`rounded-lg shadow-lg p-4 min-w-[300px] max-w-md animate-in slide-in-from-right ${
            toast.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
            toast.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
            toast.type === 'warning' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' :
            'bg-blue-50 border border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
