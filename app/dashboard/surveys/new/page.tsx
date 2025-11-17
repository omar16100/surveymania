"use client"
import { useSurveyBuilder } from '@/stores/surveyBuilder'
import { useState } from 'react'
import { QuestionEditor } from '@/components/QuestionEditor'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Textarea } from '@/components/ui'
import { Label } from '@/components/ui'

export default function NewSurveyPage() {
  const builder = useSurveyBuilder()
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: builder.title,
          description: builder.description,
          settings: { isPublic: true, requireAuth: false, allowAnonymous: true, multipleResponses: false, locationRequired: false, locationAccuracy: 0 },
          questions: builder.questions.map((q, i) => ({
            order: i + 1,
            type: q.type,
            question: q.question,
            required: q.required,
            options: q.options ?? []
          }))
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to save')
      builder.reset()
      alert('Survey created: ' + data.id)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">New Survey</h1>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Survey Title</Label>
          <Input
            id="title"
            placeholder="Enter survey title"
            value={builder.title}
            onChange={(e) => builder.setMeta(e.target.value, builder.description)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Enter survey description"
            value={builder.description}
            onChange={(e) => builder.setMeta(builder.title, e.target.value)}
            rows={3}
          />
        </div>
      </div>
      <QuestionEditor />
      <div className="flex gap-2">
        <Button onClick={save} disabled={saving || !builder.title}>
          {saving ? 'Saving...' : 'Save Survey'}
        </Button>
        <Button variant="outline" onClick={() => builder.reset()}>
          Reset
        </Button>
      </div>
    </div>
  )
}

