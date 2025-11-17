"use client"
import { useSurveyBuilder, type BuilderQuestion, type QuestionType } from '@/stores/surveyBuilder'
import { useState } from 'react'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import { Card } from '@/components/ui'
import { Badge } from '@/components/ui'
import LogicBuilder from '@/components/LogicBuilder'
import type { QuestionLogic } from '@/lib/logic-engine'
import { GripVertical } from 'lucide-react'

const TYPES: { label: string; value: QuestionType; group: string }[] = [
  { label: 'Short Text', value: 'text', group: 'Text' },
  { label: 'Long Text', value: 'textarea', group: 'Text' },
  { label: 'Number', value: 'number', group: 'Text' },
  { label: 'Email', value: 'email', group: 'Text' },
  { label: 'Phone', value: 'phone', group: 'Text' },
  { label: 'Single Choice', value: 'single_choice', group: 'Choice' },
  { label: 'Multiple Choice', value: 'multiple_choice', group: 'Choice' },
  { label: 'Dropdown', value: 'dropdown', group: 'Choice' },
  { label: 'Rating (1-5)', value: 'rating', group: 'Scale' },
  { label: 'Scale/Slider', value: 'scale', group: 'Scale' },
  { label: 'Date', value: 'date', group: 'Date/Time' },
  { label: 'Time', value: 'time', group: 'Date/Time' },
  { label: 'Date & Time', value: 'datetime', group: 'Date/Time' },
  { label: 'File Upload', value: 'file_upload', group: 'Special' },
  { label: 'Location', value: 'location', group: 'Special' },
  { label: 'Signature', value: 'signature', group: 'Special' }
]

export function QuestionEditor() {
  const { questions, addQuestion, removeQuestion, updateQuestion, reorder } = useSurveyBuilder()
  const [newType, setNewType] = useState<QuestionType>('text')
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)

  const needsOptions = (type: QuestionType) => ['single_choice', 'multiple_choice', 'dropdown'].includes(type)

  function add() {
    const q: BuilderQuestion = {
      id: crypto.randomUUID(),
      type: newType,
      question: '',
      required: false,
      options: needsOptions(newType) ? ['Option 1'] : undefined,
      validation: newType === 'scale' ? { scaleMin: 1, scaleMax: 10, scaleStep: 1 } : undefined
    }
    addQuestion(q)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Select value={newType} onValueChange={(value) => setNewType(value as QuestionType)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={add}>Add question</Button>
      </div>

      <div className="space-y-6">
        {questions.map((q, idx) => {
          const isSelected = selectedQuestionId === q.id
          return (
          <Card
            key={q.id}
            className={`p-4 transition-shadow ${isSelected ? 'card-selected' : 'card-hover'}`}
            onClick={() => setSelectedQuestionId(q.id)}
          >
            <div className="flex items-start gap-3">
              <button
                className="drag-handle mt-1"
                onClick={(e) => e.stopPropagation()}
                aria-label="Drag to reorder"
              >
                <GripVertical className="w-5 h-5" />
              </button>
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{q.type}</Badge>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={idx === 0} onClick={(e) => { e.stopPropagation(); reorder(idx, idx - 1); }}>Up</Button>
                    <Button variant="outline" size="sm" disabled={idx === questions.length - 1} onClick={(e) => { e.stopPropagation(); reorder(idx, idx + 1); }}>Down</Button>
                    <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); removeQuestion(q.id); }}>Remove</Button>
                  </div>
                </div>
              <Input placeholder="Question text" value={q.question} onChange={(e) => updateQuestion(q.id, { question: e.target.value })} />
              <Input placeholder="Description (optional)" value={q.description ?? ''} onChange={(e) => updateQuestion(q.id, { description: e.target.value })} />
              <Label className="flex items-center gap-2 text-sm font-normal cursor-pointer">
                <input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(q.id, { required: e.target.checked })} />
                Required
              </Label>

              {needsOptions(q.type) && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-medium">Options</p>
                  {(q.options ?? []).map((opt, i) => (
                    <div className="flex gap-2" key={i}>
                      <Input value={opt} onChange={(e) => {
                        const options = [...(q.options ?? [])]
                        options[i] = e.target.value
                        updateQuestion(q.id, { options })
                      }} />
                      <Button variant="outline" size="sm" onClick={() => {
                        const options = (q.options ?? []).filter((_, j) => j !== i)
                        updateQuestion(q.id, { options })
                      }}>Delete</Button>
                    </div>
                  ))}
                  <Button variant="outline" onClick={() => updateQuestion(q.id, { options: [...(q.options ?? []), `Option ${(q.options?.length ?? 0) + 1}`] })}>Add option</Button>
                </div>
              )}

              {['text', 'textarea'].includes(q.type) && (
                <div className="grid grid-cols-2 gap-2 p-3 bg-purple-50 rounded border">
                  <div>
                    <Label className="text-xs">Min length</Label>
                    <Input type="number" min="0" placeholder="No limit" value={q.validation?.minLength ?? ''} onChange={(e) => updateQuestion(q.id, { validation: { ...q.validation, minLength: e.target.value ? parseInt(e.target.value) : undefined } })} />
                  </div>
                  <div>
                    <Label className="text-xs">Max length</Label>
                    <Input type="number" min="0" placeholder="No limit" value={q.validation?.maxLength ?? ''} onChange={(e) => updateQuestion(q.id, { validation: { ...q.validation, maxLength: e.target.value ? parseInt(e.target.value) : undefined } })} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Custom regex pattern</Label>
                    <Input placeholder="e.g., ^[A-Z].*" value={q.validation?.regex ?? ''} onChange={(e) => updateQuestion(q.id, { validation: { ...q.validation, regex: e.target.value || undefined } })} />
                  </div>
                  {q.validation?.regex && (
                    <div className="col-span-2">
                      <Label className="text-xs">Regex error message</Label>
                      <Input placeholder="Custom error message" value={q.validation?.regexMessage ?? ''} onChange={(e) => updateQuestion(q.id, { validation: { ...q.validation, regexMessage: e.target.value || undefined } })} />
                    </div>
                  )}
                </div>
              )}

              {q.type === 'number' && (
                <div className="grid grid-cols-2 gap-2 p-3 bg-purple-50 rounded border">
                  <div>
                    <Label className="text-xs">Min value</Label>
                    <Input type="number" placeholder="No limit" value={q.validation?.minValue ?? ''} onChange={(e) => updateQuestion(q.id, { validation: { ...q.validation, minValue: e.target.value ? parseFloat(e.target.value) : undefined } })} />
                  </div>
                  <div>
                    <Label className="text-xs">Max value</Label>
                    <Input type="number" placeholder="No limit" value={q.validation?.maxValue ?? ''} onChange={(e) => updateQuestion(q.id, { validation: { ...q.validation, maxValue: e.target.value ? parseFloat(e.target.value) : undefined } })} />
                  </div>
                </div>
              )}

              {q.type === 'scale' && (
                <div className="grid grid-cols-2 gap-2 p-3 bg-purple-50 rounded border">
                  <div>
                    <Label className="text-xs">Min value</Label>
                    <Input type="number" placeholder="1" value={q.validation?.scaleMin ?? 1} onChange={(e) => updateQuestion(q.id, { validation: { ...q.validation, scaleMin: parseInt(e.target.value) || 1 } })} />
                  </div>
                  <div>
                    <Label className="text-xs">Max value</Label>
                    <Input type="number" placeholder="10" value={q.validation?.scaleMax ?? 10} onChange={(e) => updateQuestion(q.id, { validation: { ...q.validation, scaleMax: parseInt(e.target.value) || 10 } })} />
                  </div>
                  <div>
                    <Label className="text-xs">Step</Label>
                    <Input type="number" min="1" placeholder="1" value={q.validation?.scaleStep ?? 1} onChange={(e) => updateQuestion(q.id, { validation: { ...q.validation, scaleStep: parseInt(e.target.value) || 1 } })} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Min label (optional)</Label>
                    <Input placeholder="e.g., Not at all" value={q.validation?.scaleMinLabel ?? ''} onChange={(e) => updateQuestion(q.id, { validation: { ...q.validation, scaleMinLabel: e.target.value || undefined } })} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Max label (optional)</Label>
                    <Input placeholder="e.g., Extremely" value={q.validation?.scaleMaxLabel ?? ''} onChange={(e) => updateQuestion(q.id, { validation: { ...q.validation, scaleMaxLabel: e.target.value || undefined } })} />
                  </div>
                </div>
              )}

              {q.type === 'file_upload' && (
                <div className="grid grid-cols-1 gap-2 p-3 bg-purple-50 rounded border">
                  <div>
                    <Label className="text-xs">Max file size (MB)</Label>
                    <Input type="number" min="1" placeholder="10" value={q.validation?.maxFileSize ?? ''} onChange={(e) => updateQuestion(q.id, { validation: { ...q.validation, maxFileSize: e.target.value ? parseInt(e.target.value) : undefined } })} />
                  </div>
                  <div>
                    <Label className="text-xs">Allowed file types (comma-separated)</Label>
                    <Input placeholder="e.g., image/jpeg,image/png,application/pdf" value={q.validation?.allowedFileTypes?.join(',') ?? ''} onChange={(e) => updateQuestion(q.id, { validation: { ...q.validation, allowedFileTypes: e.target.value ? e.target.value.split(',').map(t => t.trim()) : undefined } })} />
                  </div>
                </div>
              )}

              <LogicBuilder
                questionId={q.id}
                questions={questions.map(question => ({
                  id: question.id,
                  type: question.type,
                  question: question.question
                }))}
                logic={q.logic as QuestionLogic | null}
                onChange={(logic) => updateQuestion(q.id, { logic })}
              />
              </div>
            </div>
          </Card>
        )
        })}
      </div>
    </div>
  )
}

