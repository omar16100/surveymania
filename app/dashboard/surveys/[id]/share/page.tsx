"use client"
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
import { Button } from '@/components/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Input } from '@/components/ui'
import LoadingSpinner from '@/components/LoadingSpinner'

type Survey = {
  id: string
  title: string
  status: string
}

export default function ShareSurveyPage({ params }: { params: { id: string } }) {
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/s/${params.id}`
    : ''

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/surveys/${params.id}`)
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to load')
        }
        const data = await res.json()
        setSurvey(data)

        // Generate QR code
        if (canvasRef.current) {
          await QRCode.toCanvas(canvasRef.current, publicUrl, {
            width: 300,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          })
          const dataUrl = canvasRef.current.toDataURL('image/png')
          setQrCodeUrl(dataUrl)
        }
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id, publicUrl])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      alert('Failed to copy link')
    }
  }

  function downloadQRCode(format: 'png' | 'svg') {
    if (format === 'png' && qrCodeUrl) {
      const a = document.createElement('a')
      a.href = qrCodeUrl
      a.download = `survey-${params.id}-qr.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } else if (format === 'svg') {
      QRCode.toString(publicUrl, { type: 'svg', width: 300, margin: 2 })
        .then(svg => {
          const blob = new Blob([svg], { type: 'image/svg+xml' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `survey-${params.id}-qr.svg`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        })
    }
  }

  function shareOnSocial(platform: 'whatsapp' | 'twitter' | 'linkedin') {
    const text = encodeURIComponent(`Check out this survey: ${survey?.title || 'Survey'}`)
    const url = encodeURIComponent(publicUrl)

    const urls = {
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
    }

    window.open(urls[platform], '_blank', 'width=600,height=400')
  }

  const embedCode = `<iframe src="${publicUrl}" width="100%" height="800" frameborder="0"></iframe>`

  async function copyEmbedCode() {
    try {
      await navigator.clipboard.writeText(embedCode)
      alert('Embed code copied!')
    } catch (e) {
      alert('Failed to copy embed code')
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading..." />
  }

  if (error || !survey) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Share Survey</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error || 'Failed to load survey'}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/surveys/${params.id}`}>Back to Survey</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Share Survey</h1>
          <p className="text-sm text-muted-foreground mt-1">{survey.title}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/surveys/${params.id}`}>Back</Link>
        </Button>
      </div>

      {survey.status !== 'active' && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            ⚠️ This survey is not active. Publish it first to start collecting responses.
          </p>
        </div>
      )}

      {/* Public Link */}
      <Card>
        <CardHeader>
          <CardTitle>Public Link</CardTitle>
          <CardDescription>
            Share this link to collect responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={publicUrl}
              readOnly
              className="font-mono text-sm"
            />
            <Button onClick={copyLink} variant={copied ? 'default' : 'outline'}>
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* QR Code */}
      <Card>
        <CardHeader>
          <CardTitle>QR Code</CardTitle>
          <CardDescription>
            Let people scan to access your survey
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            <div className="border rounded-lg p-4 bg-white">
              <canvas ref={canvasRef} />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => downloadQRCode('png')} variant="outline">
                Download PNG
              </Button>
              <Button onClick={() => downloadQRCode('svg')} variant="outline">
                Download SVG
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Sharing */}
      <Card>
        <CardHeader>
          <CardTitle>Social Media</CardTitle>
          <CardDescription>
            Share on social platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => shareOnSocial('whatsapp')} variant="outline">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </Button>
            <Button onClick={() => shareOnSocial('twitter')} variant="outline">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
              Twitter
            </Button>
            <Button onClick={() => shareOnSocial('linkedin')} variant="outline">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              LinkedIn
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Embed Code */}
      <Card>
        <CardHeader>
          <CardTitle>Embed on Website</CardTitle>
          <CardDescription>
            Add this survey to your website using an iframe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            value={embedCode}
            readOnly
            className="input min-h-[100px] w-full font-mono text-xs"
          />
          <Button onClick={copyEmbedCode} variant="outline">
            Copy Embed Code
          </Button>
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">How to use:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Copy the embed code above</li>
              <li>Paste it into your website's HTML</li>
              <li>Adjust width and height as needed</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
