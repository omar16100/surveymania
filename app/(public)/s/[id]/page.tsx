"use client"
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { queueSubmission, processQueue } from '@/lib/offlineQueue'
import { isQuestionVisible, type QuestionLogic } from '@/lib/logic-engine'
import { applyPiping, type PipingContext } from '@/lib/piping'
import { SurveyProgress } from '@/components/SurveyProgress'
import { SurveyQuestionRenderer } from '@/components/SurveyQuestionRenderer'
import { SurveySubmitButton } from '@/components/SurveySubmitButton'
import LocationDiagnostics from '@/components/LocationDiagnostics'

type ValidationRule = {
  minLength?: number
  maxLength?: number
  minValue?: number
  maxValue?: number
  regex?: string
  regexMessage?: string
  maxFileSize?: number
  allowedFileTypes?: string[]
  scaleMin?: number
  scaleMax?: number
  scaleStep?: number
}

type Question = {
  id: string
  type: string
  question: string
  description?: string
  required: boolean
  options?: any
  validation?: ValidationRule
  logic?: QuestionLogic | null
}

type Survey = {
  id: string
  title: string
  description: string
  status: string
  settings: any
  questions: Question[]
}

function buildSchema(questions: Question[]) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const q of questions) {
    const key = q.id
    const val = q.validation

    switch (q.type) {
      case 'text':
      case 'textarea': {
        let s = z.string().trim()
        if (q.required) s = s.min(1, 'Required')
        if (val?.minLength) s = s.min(val.minLength, `Minimum ${val.minLength} characters`)
        if (val?.maxLength) s = s.max(val.maxLength, `Maximum ${val.maxLength} characters`)
        if (val?.regex) s = s.regex(new RegExp(val.regex), val.regexMessage || 'Invalid format')
        shape[key] = s
        break
      }
      case 'email': {
        let s = z.string().email('Invalid email address')
        if (q.required) s = s.min(1, 'Required')
        shape[key] = s
        break
      }
      case 'phone': {
        let s = z.string().regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number')
        if (q.required) s = s.min(1, 'Required')
        shape[key] = s
        break
      }
      case 'number': {
        let s = z.preprocess(
          (v) => (v === '' ? undefined : Number(v)),
          q.required
            ? z.number({ invalid_type_error: 'Must be a number', required_error: 'Required' })
            : z.number({ invalid_type_error: 'Must be a number' }).optional()
        )
        if (val?.minValue !== undefined) {
          s = s.pipe(z.number().min(val.minValue, `Minimum value is ${val.minValue}`))
        }
        if (val?.maxValue !== undefined) {
          s = s.pipe(z.number().max(val.maxValue, `Maximum value is ${val.maxValue}`))
        }
        shape[key] = s
        break
      }
      case 'single_choice':
      case 'dropdown': {
        const opts: string[] = Array.isArray(q.options) ? q.options : []
        let s = q.required
          ? z.string().min(1, 'Required').refine((v) => opts.includes(v), 'Invalid option')
          : z.string().refine((v) => !v || opts.includes(v), 'Invalid option')
        shape[key] = s
        break
      }
      case 'multiple_choice': {
        const opts: string[] = Array.isArray(q.options) ? q.options : []
        let s = q.required
          ? z.array(z.string()).min(1, 'Select at least one').refine((arr) => arr.every((v) => opts.includes(v)), 'Invalid option')
          : z.array(z.string()).refine((arr) => arr.every((v) => opts.includes(v)), 'Invalid option')
        shape[key] = s.default([])
        break
      }
      case 'rating': {
        let s = z.preprocess(
          (v) => (v === '' ? undefined : Number(v)),
          q.required
            ? z.number().min(1).max(5, 'Rating must be 1-5')
            : z.number().min(1).max(5).optional()
        )
        shape[key] = s
        break
      }
      case 'scale': {
        const min = val?.scaleMin ?? 1
        const max = val?.scaleMax ?? 10
        let s = z.preprocess(
          (v) => (v === '' ? undefined : Number(v)),
          q.required
            ? z.number().min(min).max(max)
            : z.number().min(min).max(max).optional()
        )
        shape[key] = s
        break
      }
      case 'date':
      case 'time':
      case 'datetime': {
        let s = z.string()
        if (q.required) s = s.min(1, 'Required')
        shape[key] = s
        break
      }
      case 'file_upload': {
        let s = q.required
          ? z.instanceof(FileList).refine((files) => files.length > 0, 'File is required')
          : z.instanceof(FileList).optional()
        if (val?.maxFileSize && val.maxFileSize > 0) {
          s = s.refine(
            (files) => !files || files.length === 0 || files[0].size <= val.maxFileSize! * 1024 * 1024,
            `File size must be less than ${val.maxFileSize}MB`
          )
        }
        if (val?.allowedFileTypes && val.allowedFileTypes.length > 0) {
          s = s.refine(
            (files) => !files || files.length === 0 || val.allowedFileTypes!.includes(files[0].type),
            `Allowed types: ${val.allowedFileTypes.join(', ')}`
          )
        }
        shape[key] = s
        break
      }
      case 'signature':
      case 'location': {
        let s = z.string()
        if (q.required) s = s.min(1, 'Required')
        shape[key] = s
        break
      }
      default: {
        shape[key] = z.any().optional()
      }
    }
  }
  return z.object(shape)
}

export default function PublicSurveyPage({ params }: { params: { id: string } }) {
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitState, setSubmitState] = useState<'default' | 'loading' | 'success' | 'error'>('default')
  const [submitError, setSubmitError] = useState<string>('')
  const [geo, setGeo] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [online, setOnline] = useState<boolean>(true)
  const [manualLocation, setManualLocation] = useState(false)

  useEffect(() => {
    ;(async () => {
      const res = await fetch(`/api/surveys/${params.id}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Failed to load survey')
        return
      }
      setSurvey(data)
    })()
  }, [params.id])

  // Geolocation if required
  useEffect(() => {
    if (!survey) return
    if (survey.settings?.locationRequired && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      setGeoLoading(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeo({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy })
          setGeoError(null)
          setGeoLoading(false)
        },
        (err) => {
          setGeo(null)
          setGeoError(err.message || 'Location permission denied')
          setGeoLoading(false)
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
      )
    }
  }, [survey])

  // Online/offline status and queue processing
  useEffect(() => {
    setOnline(typeof navigator !== 'undefined' ? navigator.onLine : true)
    const onOnline = async () => {
      setOnline(true)
      try { await processQueue() } catch {}
    }
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    // try to process any pending on load
    ;(async () => { try { await processQueue() } catch {} })()
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const schema = useMemo(() => buildSchema(survey?.questions ?? []), [survey])
  const form = useForm<{ [k: string]: any }>({ resolver: zodResolver(schema), defaultValues: {} })

  // Watch form values for conditional logic and piping
  const formValues = form.watch()

  // Build piping context from form values
  const pipingContext: PipingContext = useMemo(() => ({
    answers: formValues,
    questionOrder: survey?.questions.map(q => q.id) ?? []
  }), [formValues, survey])

  // Filter visible questions based on logic rules
  const visibleQuestions = useMemo(() => {
    if (!survey) return []
    return survey.questions.filter(q => isQuestionVisible(q.logic, formValues))
  }, [survey, formValues])

  // Calculate progress (count answered required questions)
  const answeredCount = useMemo(() => {
    return visibleQuestions.filter(q => {
      const value = formValues[q.id]
      if (value === undefined || value === null || value === '') return false
      if (Array.isArray(value) && value.length === 0) return false
      return true
    }).length
  }, [visibleQuestions, formValues])

  async function onSubmit(values: Record<string, any>) {
    if (!survey) return
    setSubmitting(true)
    setSubmitState('loading')
    setSubmitError('')
    try {
      // generate or re-use session id
      let sessionId = localStorage.getItem('sm_session')
      if (!sessionId) {
        sessionId = crypto.randomUUID()
        localStorage.setItem('sm_session', sessionId)
      }
      const answers = survey.questions.map((q) => {
        const v = values[q.id]
        switch (q.type) {
          case 'text':
          case 'textarea':
          case 'email':
          case 'phone':
          case 'date':
          case 'time':
          case 'datetime':
          case 'signature':
            return { questionId: q.id, answerType: 'text', answerText: v ?? '' }
          case 'number':
          case 'rating':
          case 'scale':
            return { questionId: q.id, answerType: 'number', answerNumber: typeof v === 'number' ? v : (typeof v === 'string' && v ? parseFloat(v) : undefined) }
          case 'single_choice':
          case 'dropdown':
            return { questionId: q.id, answerType: 'choice', answerText: v ?? '' }
          case 'multiple_choice':
            return { questionId: q.id, answerType: 'choices', answerChoices: Array.isArray(v) ? v : [] }
          case 'file_upload':
            // For now, store file metadata as text. File upload requires S3/R2 integration
            return { questionId: q.id, answerType: 'text', answerText: v instanceof FileList && v.length > 0 ? v[0].name : '' }
          case 'location':
            // Location stored separately in response, but include confirmation
            return { questionId: q.id, answerType: 'text', answerText: geo ? `${geo.latitude}, ${geo.longitude}` : '' }
          default:
            return { questionId: q.id, answerType: 'text', answerText: '' }
        }
      })
      const payload: any = {
        sessionId,
        userAgent: navigator.userAgent,
        answers,
        metadata: {}
      }
      if (geo) payload.location = geo

      // If location is required but unavailable, block submit with message
      if (survey.settings?.locationRequired && !geo) {
        const errorMsg = geoError || 'Location is required to submit this survey.'
        setError(errorMsg)
        setSubmitState('error')
        setSubmitError(errorMsg)
        setSubmitting(false)
        return
      }

      const endpoint = `/api/surveys/${survey.id}/responses`

      // Store thank you data for the confirmation page
      const thankYouData = {
        queued: false,
        location: geo ? { latitude: geo.latitude, longitude: geo.longitude } : undefined,
        submittedAt: new Date().toISOString(),
        surveyTitle: survey.title,
        thankYouMessage: survey.settings?.thankYouMessage || undefined
      }

      if (!online) {
        await queueSubmission(endpoint, payload)
        thankYouData.queued = true
        localStorage.setItem('sm_thankyou', JSON.stringify(thankYouData))
        alert('You are offline. Your response has been queued and will be submitted automatically when back online.')
        window.location.href = `/s/${survey.id}/thanks`
        return
      }

      try {
        const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Failed to submit')

        // Show success state briefly before redirect
        setSubmitState('success')
        localStorage.setItem('sm_thankyou', JSON.stringify(thankYouData))
        setTimeout(() => {
          window.location.href = `/s/${survey.id}/thanks`
        }, 800)
      } catch (e) {
        // Network error: queue it
        await queueSubmission(endpoint, payload)
        thankYouData.queued = true
        localStorage.setItem('sm_thankyou', JSON.stringify(thankYouData))
        alert('Network issue. Your response has been queued and will be submitted when online.')
        window.location.href = `/s/${survey.id}/thanks`
      }
    } catch (e: any) {
      const errorMsg = e.message || 'An unexpected error occurred'
      setError(errorMsg)
      setSubmitState('error')
      setSubmitError(errorMsg)
    } finally {
      setSubmitting(false)
    }
  }

  if (error) return <div className="min-h-screen bg-surface-alt flex items-center justify-center px-4"><div className="space-y-4 text-center"><p className="text-red-600">{error}</p><Link className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:shadow-focus-ring bg-purple text-white shadow-elevation-1 hover:bg-purple-dark hover:shadow-elevation-2 min-h-[48px] px-6 py-3" href="/">Back</Link></div></div>
  if (!survey) return <div className="min-h-screen bg-surface-alt flex items-center justify-center"><p className="text-[var(--gform-color-text-secondary)]">Loading…</p></div>
  if (survey.status !== 'active') return <div className="min-h-screen bg-surface-alt flex items-center justify-center px-4"><div className="space-y-2 text-center"><h1 className="text-xl font-semibold text-[var(--gform-color-text)]">{survey.title}</h1><p className="text-[var(--gform-color-text-secondary)]">This survey isn't accepting responses.</p></div></div>

  return (
    <div className="min-h-screen bg-surface-alt scroll-smooth">
      {/* Floating Progress Bar */}
      {visibleQuestions.length > 0 && (
        <SurveyProgress
          currentQuestion={answeredCount}
          totalQuestions={visibleQuestions.length}
          showPercentage={false}
        />
      )}

      {/* Main Content Container */}
      <div className="mx-auto max-w-[640px] px-4 md:px-8 py-12 pt-16">
        {/* Survey Header */}
        <div className="mb-12 space-y-3">
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-[var(--gform-color-text)]">{survey.title}</h1>
          {survey.description && <p className="text-base text-[var(--gform-color-text-secondary)] leading-relaxed">{survey.description}</p>}
        </div>

        {/* Offline Warning */}
        {!online && (
          <div className="mb-8 rounded-control border-[1.5px] border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
            You are offline. Submissions will be queued and synced when back online.
          </div>
        )}
        {/* Location Diagnostics */}
        {survey.settings?.locationRequired && (
          <div className="mb-8">
            <LocationDiagnostics
              location={geo}
              loading={geoLoading}
              error={geoError}
            />
          </div>
        )}

        {/* Location Error with Retry/Manual Entry */}
        {survey.settings?.locationRequired && geoError && !manualLocation && (
          <div className="mb-8 rounded-control border-[1.5px] border-red-300 bg-red-50 p-4 space-y-3">
            <p className="text-sm text-red-700">{geoError}</p>
            <div className="flex gap-3">
              <button
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:shadow-focus-ring border-[1.5px] border-[var(--gform-color-border)] bg-surface hover:bg-surface-alt min-h-[48px] px-6 py-3"
              onClick={() => {
                if (navigator?.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => { setGeo({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }); setGeoError(null) },
                    (err) => { setGeo(null); setGeoError(err.message || 'Location permission denied') },
                    { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
                  )
                }
              }}
              type="button"
            >
                Retry Location
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:shadow-focus-ring border-[1.5px] border-[var(--gform-color-border)] bg-surface hover:bg-surface-alt min-h-[48px] px-6 py-3"
                onClick={() => setManualLocation(true)}
                type="button"
              >
                Enter Manually
              </button>
            </div>
          </div>
        )}

        {/* Manual Location Entry */}
        {survey.settings?.locationRequired && manualLocation && !geo && (
          <div className="mb-8 rounded-control border-[1.5px] border-blue-300 bg-blue-50 p-4 space-y-4">
            <p className="text-sm text-blue-700">Enter your location manually:</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                className="flex min-h-[48px] w-full rounded-control border-[1.5px] border-[var(--gform-color-border)] bg-surface px-4 py-3 text-base text-[var(--gform-color-text)] transition-all duration-200 placeholder:text-[var(--gform-color-text-tertiary)] focus-visible:outline-none focus-visible:border-purple focus-visible:shadow-focus-ring"
                placeholder="Latitude (e.g., 40.7128)"
              step="any"
              id="manual-lat"
              onBlur={(e) => {
                const lat = parseFloat(e.target.value)
                const lon = parseFloat((document.getElementById('manual-lon') as HTMLInputElement)?.value || '0')
                if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
                  setGeo({ latitude: lat, longitude: lon })
                  setGeoError(null)
                }
              }}
              />
              <input
                type="number"
                className="flex min-h-[48px] w-full rounded-control border-[1.5px] border-[var(--gform-color-border)] bg-surface px-4 py-3 text-base text-[var(--gform-color-text)] transition-all duration-200 placeholder:text-[var(--gform-color-text-tertiary)] focus-visible:outline-none focus-visible:border-purple focus-visible:shadow-focus-ring"
                placeholder="Longitude (e.g., -74.0060)"
              step="any"
              id="manual-lon"
              onBlur={(e) => {
                const lon = parseFloat(e.target.value)
                const lat = parseFloat((document.getElementById('manual-lat') as HTMLInputElement)?.value || '0')
                if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
                  setGeo({ latitude: lat, longitude: lon })
                  setGeoError(null)
                }
              }}
              />
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:shadow-focus-ring border-[1.5px] border-[var(--gform-color-border)] bg-surface hover:bg-surface-alt min-h-[48px] px-6 py-3"
              onClick={() => setManualLocation(false)}
              type="button"
            >
              Use Device Location Instead
            </button>
          </div>
        )}

        {/* Survey Form */}
        <form className="space-y-12" onSubmit={form.handleSubmit(onSubmit)}>
          {visibleQuestions.map((q, index) => {
            // Apply piping to question text and description
            const pipedQuestion = {
              ...q,
              question: applyPiping(q.question, pipingContext),
              description: q.description ? applyPiping(q.description, pipingContext) : undefined
            }

            return (
              <SurveyQuestionRenderer
                key={q.id}
                question={pipedQuestion}
                questionNumber={index + 1}
                showQuestionNumber={visibleQuestions.length > 1}
                register={form.register}
                setValue={form.setValue}
                watch={form.watch}
                error={form.formState.errors[q.id] as any}
                geo={geo}
              />
            )
          })}

          {/* Submit Button */}
          <div className="pt-4">
            <SurveySubmitButton
              state={submitState}
              errorMessage={submitError}
              onReset={() => {
                setSubmitState('default')
                setSubmitError('')
              }}
            />
          </div>
        </form>
      </div>
    </div>
  )
}
