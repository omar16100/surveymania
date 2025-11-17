"use client"
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { queueSubmission, processQueue } from '@/lib/offlineQueue'
import { isQuestionVisible, type QuestionLogic } from '@/lib/logic-engine'
import { applyPiping, type PipingContext } from '@/lib/piping'
import ProgressBar from '@/components/ProgressBar'
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
        setError(geoError || 'Location is required to submit this survey.')
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
        localStorage.setItem('sm_thankyou', JSON.stringify(thankYouData))
        window.location.href = `/s/${survey.id}/thanks`
      } catch (e) {
        // Network error: queue it
        await queueSubmission(endpoint, payload)
        thankYouData.queued = true
        localStorage.setItem('sm_thankyou', JSON.stringify(thankYouData))
        alert('Network issue. Your response has been queued and will be submitted when online.')
        window.location.href = `/s/${survey.id}/thanks`
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (error) return <div className="space-y-4"><p className="text-red-600">{error}</p><Link className="btn" href="/">Back</Link></div>
  if (!survey) return <p>Loading…</p>
  if (survey.status !== 'active') return <div className="space-y-2"><h1 className="text-xl font-semibold">{survey.title}</h1><p className="text-gray-600">This survey isn’t accepting responses.</p></div>

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{survey.title}</h1>
        {survey.description && <p className="text-gray-600">{survey.description}</p>}
      </div>
      {!online && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          You are offline. Submissions will be queued and synced when back online.
        </div>
      )}
      {visibleQuestions.length > 0 && (
        <ProgressBar
          current={answeredCount}
          total={visibleQuestions.length}
          showCount={true}
        />
      )}
      {survey.settings?.locationRequired && (
        <LocationDiagnostics
          location={geo}
          loading={geoLoading}
          error={geoError}
        />
      )}
      {survey.settings?.locationRequired && geoError && !manualLocation && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 space-y-3">
          <p className="text-sm text-red-700">{geoError}</p>
          <div className="flex gap-2">
            <button
              className="btn btn-sm"
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
              className="btn btn-sm"
              onClick={() => setManualLocation(true)}
              type="button"
            >
              Enter Manually
            </button>
          </div>
        </div>
      )}
      {survey.settings?.locationRequired && manualLocation && !geo && (
        <div className="rounded-md border border-blue-300 bg-blue-50 p-3 space-y-3">
          <p className="text-sm text-blue-700">Enter your location manually:</p>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              className="input text-sm"
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
              className="input text-sm"
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
            className="btn btn-sm"
            onClick={() => setManualLocation(false)}
            type="button"
          >
            Use Device Location Instead
          </button>
        </div>
      )}
      <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
        {visibleQuestions.map((q) => {
          const val = q.validation
          const questionText = applyPiping(q.question, pipingContext)
          const descriptionText = q.description ? applyPiping(q.description, pipingContext) : null

          return (
            <div key={q.id} className="space-y-2">
              <label className="block text-sm font-medium">
                {questionText} {q.required && <span className="text-red-600">*</span>}
              </label>
              {descriptionText && <p className="text-xs text-gray-600">{descriptionText}</p>}

              {q.type === 'text' && (
                <input className="input" {...form.register(q.id)} />
              )}
              {q.type === 'textarea' && (
                <textarea className="input" rows={4} {...form.register(q.id)} />
              )}
              {q.type === 'number' && (
                <input
                  type="number"
                  className="input"
                  min={val?.minValue}
                  max={val?.maxValue}
                  {...form.register(q.id)}
                />
              )}
              {q.type === 'email' && (
                <input type="email" className="input" {...form.register(q.id)} />
              )}
              {q.type === 'phone' && (
                <input type="tel" className="input" placeholder="e.g., +1 234 567 8900" {...form.register(q.id)} />
              )}
              {(q.type === 'single_choice' || q.type === 'dropdown') && Array.isArray(q.options) && (
                <select className="input" {...form.register(q.id)}>
                  <option value="">Select…</option>
                  {q.options.map((o: string) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              )}
              {q.type === 'multiple_choice' && Array.isArray(q.options) && (
                <div className="space-y-1">
                  {q.options.map((o: string) => (
                    <label key={o} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" value={o} {...form.register(q.id)} /> {o}
                    </label>
                  ))}
                </div>
              )}
              {q.type === 'rating' && (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <label key={r} className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" value={r} {...form.register(q.id)} />
                      <span className="text-sm">{r}</span>
                    </label>
                  ))}
                </div>
              )}
              {q.type === 'scale' && (
                <div className="space-y-2">
                  <input
                    type="range"
                    min={val?.scaleMin ?? 1}
                    max={val?.scaleMax ?? 10}
                    step={val?.scaleStep ?? 1}
                    className="w-full"
                    {...form.register(q.id)}
                    onChange={(e) => form.setValue(q.id, e.target.value)}
                  />
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{val?.scaleMinLabel || val?.scaleMin || 1}</span>
                    <span className="font-semibold">{form.watch(q.id) || (val?.scaleMin ?? 1)}</span>
                    <span>{val?.scaleMaxLabel || val?.scaleMax || 10}</span>
                  </div>
                </div>
              )}
              {q.type === 'date' && (
                <input type="date" className="input" {...form.register(q.id)} />
              )}
              {q.type === 'time' && (
                <input type="time" className="input" {...form.register(q.id)} />
              )}
              {q.type === 'datetime' && (
                <input type="datetime-local" className="input" {...form.register(q.id)} />
              )}
              {q.type === 'file_upload' && (
                <div className="space-y-1">
                  <input
                    type="file"
                    className="input"
                    accept={val?.allowedFileTypes?.join(',')}
                    {...form.register(q.id)}
                  />
                  {(val?.maxFileSize || val?.allowedFileTypes) && (
                    <p className="text-xs text-gray-500">
                      {val.maxFileSize && `Max size: ${val.maxFileSize}MB`}
                      {val.maxFileSize && val.allowedFileTypes && ' • '}
                      {val.allowedFileTypes && `Allowed: ${val.allowedFileTypes.map(t => t.split('/')[1]).join(', ')}`}
                    </p>
                  )}
                </div>
              )}
              {q.type === 'signature' && (
                <div className="border rounded p-2 bg-gray-50">
                  <p className="text-xs text-gray-600 mb-2">Sign below:</p>
                  <input
                    type="text"
                    className="input font-signature"
                    placeholder="Type your signature"
                    {...form.register(q.id)}
                  />
                </div>
              )}
              {q.type === 'location' && (
                <div className="border rounded p-3 bg-gray-50">
                  <p className="text-xs text-gray-600">Location will be captured from your device</p>
                  {geo && (
                    <p className="text-xs text-green-600 mt-1">✓ Location captured</p>
                  )}
                </div>
              )}

              {form.formState.errors[q.id] && (
                <p className="text-sm text-red-600">{(form.formState.errors as any)[q.id]?.message as string}</p>
              )}
            </div>
          )
        })}
        <button className="btn" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit'}</button>
      </form>
    </div>
  )
}
