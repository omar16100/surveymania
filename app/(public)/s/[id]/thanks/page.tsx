"use client"
import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const MapPreview = dynamic(() => import('@/components/MapPreview'), { ssr: false })

type ThankYouData = {
  queued?: boolean
  location?: { latitude: number; longitude: number }
  submittedAt: string
  surveyTitle?: string
  thankYouMessage?: string
}

export default function ThanksPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [data, setData] = useState<ThankYouData | null>(null)

  useEffect(() => {
    // Retrieve thank you data from localStorage
    const stored = localStorage.getItem('sm_thankyou')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setData(parsed)
        // Clear after reading
        localStorage.removeItem('sm_thankyou')
      } catch {}
    } else {
      // Fallback if no data stored
      setData({
        submittedAt: new Date().toISOString()
      })
    }
  }, [])

  if (!data) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Success Message */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Thank You!</h1>

        {data.thankYouMessage ? (
          <p className="text-lg text-gray-700">{data.thankYouMessage}</p>
        ) : (
          <p className="text-lg text-gray-700">Your response has been recorded.</p>
        )}
      </div>

      {/* Queued Indicator */}
      {data.queued && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">Submission Queued</h3>
              <p className="text-sm text-yellow-700 mt-1">
                You were offline when submitting. Your response has been saved and will be automatically submitted when your device reconnects to the internet.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Location Map */}
      {data.location && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-gray-700">Your Location</h2>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <MapPreview
              latitude={data.location.latitude}
              longitude={data.location.longitude}
              height="300px"
            />
          </div>
          <p className="text-xs text-gray-500">
            Coordinates: {data.location.latitude.toFixed(6)}, {data.location.longitude.toFixed(6)}
          </p>
        </div>
      )}

      {/* Submission Info */}
      <div className="border-t border-gray-200 pt-6 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Submitted</span>
          <span className="text-gray-900">
            {new Date(data.submittedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
        {data.surveyTitle && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Survey</span>
            <span className="text-gray-900">{data.surveyTitle}</span>
          </div>
        )}
      </div>

      {/* Action */}
      <div className="text-center pt-4">
        <Link
          href={`/s/${resolvedParams.id}`}
          className="text-purple-600 hover:text-purple-700 font-medium text-sm"
        >
          Submit Another Response
        </Link>
      </div>
    </div>
  )
}
