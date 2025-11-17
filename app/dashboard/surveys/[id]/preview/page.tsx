"use client"
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'

type Question = {
  id: string
  type: string
  question: string
  required: boolean
  options?: any
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
    switch (q.type) {
      case 'text':
      case 'textarea': {
        let s = z.string().trim()
        if (q.required) s = s.min(1, 'Required')
        shape[key] = s
        break
      }
      case 'number': {
        let s = z.preprocess((v) => (v === '' ? undefined : Number(v)), z.number({ invalid_type_error: 'Must be a number' }))
        if (q.required) s = s.refine((v) => typeof v === 'number' && !Number.isNaN(v), 'Required')
        shape[key] = s.optional()
        break
      }
      case 'single_choice': {
        const opts: string[] = Array.isArray(q.options) ? q.options : []
        let s = z.string().refine((v) => !v || opts.includes(v), 'Invalid option')
        if (q.required) s = s.min(1, 'Required')
        shape[key] = s
        break
      }
      case 'multiple_choice': {
        const opts: string[] = Array.isArray(q.options) ? q.options : []
        let s = z.array(z.string()).refine((arr) => arr.every((v) => opts.includes(v)), 'Invalid option')
        if (q.required) s = s.min(1, 'Select at least one')
        shape[key] = s.default([])
        break
      }
      default: {
        shape[key] = z.any().optional()
      }
    }
  }
  return z.object(shape)
}

export default function PreviewSurveyPage({ params }: { params: { id: string } }) {
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [geoRequired, setGeoRequired] = useState(false)

  useEffect(() => {
    ;(async () => {
      const res = await fetch(`/api/surveys/${params.id}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Failed to load survey')
        return
      }
      setSurvey(data)
      setGeoRequired(!!data?.settings?.locationRequired)
    })()
  }, [params.id])

  const schema = useMemo(() => buildSchema(survey?.questions ?? []), [survey])
  const form = useForm<{ [k: string]: any }>({ resolver: zodResolver(schema), defaultValues: {} })

  if (error) return <div className="space-y-4"><p className="text-red-600">{error}</p><Link className="btn" href="/dashboard/surveys">Back</Link></div>
  if (!survey) return <p>Loading…</p>

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Preview – {survey.title}</CardTitle>
          <CardDescription>
            This is a read-only preview of the public form. Submissions are disabled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {geoRequired && (
            <div className="mb-4 flex items-center gap-2 text-sm">
              <Badge variant="secondary">Location Required</Badge>
              <span className="text-gray-600">Respondents will be prompted to share their location.</span>
            </div>
          )}
          {survey.description && <p className="mb-4 text-gray-700">{survey.description}</p>}

          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            {survey.questions.map((q) => (
              <div key={q.id} className="space-y-2">
                <label className="block text-sm font-medium">
                  {q.question} {q.required && <span className="text-red-600">*</span>}
                </label>
                {q.type === 'text' && (
                  <input className="input" {...form.register(q.id)} placeholder="Text" disabled />
                )}
                {q.type === 'textarea' && (
                  <textarea className="input" rows={4} {...form.register(q.id)} placeholder="Long text" disabled />
                )}
                {q.type === 'number' && (
                  <input type="number" className="input" {...form.register(q.id)} placeholder="123" disabled />
                )}
                {q.type === 'single_choice' && Array.isArray(q.options) && (
                  <select className="input" {...form.register(q.id)} disabled>
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
                        <input type="checkbox" value={o} {...form.register(q.id)} disabled /> {o}
                      </label>
                    ))}
                  </div>
                )}
                {form.formState.errors[q.id] && (
                  <p className="text-sm text-red-600">{(form.formState.errors as any)[q.id]?.message as string}</p>
                )}
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Button disabled>Submit (disabled in preview)</Button>
              <Link className="btn" href={`/s/${survey.id}`}>Open Public Link</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

