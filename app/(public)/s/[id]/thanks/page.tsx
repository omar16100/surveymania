"use client"
import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader } from '@/lib/components/ui/card'

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
      <div className="min-h-screen bg-surface-alt flex items-center justify-center">
        <p className="text-[var(--gform-color-text-secondary)]">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-alt flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[640px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Success Card */}
        <Card className="shadow-elevation-2">
          <CardContent className="p-12 text-center space-y-6">
            {/* Success Icon */}
            <div className="w-20 h-20 mx-auto bg-purple-5 rounded-full flex items-center justify-center animate-in zoom-in duration-500 delay-150">
              <div className="w-16 h-16 bg-purple rounded-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-white animate-in zoom-in duration-300 delay-300"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            {/* Success Message */}
            <div className="space-y-3">
              <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-[var(--gform-color-text)]">
                Thank You!
              </h1>
              {data.thankYouMessage ? (
                <p className="text-base text-[var(--gform-color-text-secondary)] leading-relaxed max-w-md mx-auto">
                  {data.thankYouMessage}
                </p>
              ) : (
                <p className="text-base text-[var(--gform-color-text-secondary)] leading-relaxed">
                  Your response has been recorded successfully.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Queued Indicator */}
        {data.queued && (
          <Card className="shadow-elevation-1">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-base font-semibold text-yellow-800">Submission Queued</h3>
                  <p className="text-sm text-yellow-700 leading-relaxed">
                    You were offline when submitting. Your response has been saved and will be automatically submitted when your device reconnects to the internet.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Location Map */}
        {data.location && (
          <Card className="shadow-elevation-1">
            <CardHeader>
              <h2 className="text-base font-semibold text-[var(--gform-color-text)]">
                Your Location
              </h2>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-control overflow-hidden border-t border-[var(--gform-color-border)]">
                <MapPreview
                  latitude={data.location.latitude}
                  longitude={data.location.longitude}
                  height="300px"
                />
              </div>
              <div className="px-8 py-4">
                <p className="text-xs text-[var(--gform-color-text-tertiary)]">
                  Coordinates: {data.location.latitude.toFixed(6)}, {data.location.longitude.toFixed(6)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submission Info */}
        <Card className="shadow-elevation-1">
          <CardContent className="p-8 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--gform-color-text-secondary)]">Submitted</span>
              <span className="text-sm font-medium text-[var(--gform-color-text)]">
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
              <div className="flex items-center justify-between pt-4 border-t border-[var(--gform-color-border)]">
                <span className="text-sm text-[var(--gform-color-text-secondary)]">Survey</span>
                <span className="text-sm font-medium text-[var(--gform-color-text)]">
                  {data.surveyTitle}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action */}
        <div className="text-center">
          <Link
            href={`/s/${resolvedParams.id}`}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:shadow-focus-ring border-[1.5px] border-[var(--gform-color-border)] bg-surface hover:bg-surface-alt min-h-[48px] px-6 py-3"
          >
            Submit Another Response
          </Link>
        </div>
      </div>
    </div>
  )
}
