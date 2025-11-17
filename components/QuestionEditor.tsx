"use client"
import { useSurveyBuilder, type BuilderQuestion, type QuestionType } from '@/stores/surveyBuilder'
import { useState } from 'react'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import { Card, CardContent, CardHeader } from '@/lib/components/ui/card'
import { Badge } from '@/components/ui'
import { QuestionTypeSelector } from '@/components/QuestionTypeSelector'
import LogicBuilder from '@/components/LogicBuilder'
import type { QuestionLogic } from '@/lib/logic-engine'
import { GripVertical, ChevronUp, ChevronDown, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)

  const needsOptions = (type: QuestionType) => ['single_choice', 'multiple_choice', 'dropdown'].includes(type)

  function handleAddQuestion(type: QuestionType) {
    const q: BuilderQuestion = {
      id: crypto.randomUUID(),
      type,
      question: '',
      required: false,
      options: needsOptions(type) ? ['Option 1'] : undefined,
      validation: type === 'scale' ? { scaleMin: 1, scaleMax: 10, scaleStep: 1 } : undefined
    }
    addQuestion(q)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-[var(--gform-color-text)]">
            Questions
          </h2>
          <p className="text-sm text-[var(--gform-color-text-secondary)] mt-1">
            {questions.length === 0
              ? 'Add your first question to get started'
              : `${questions.length} question${questions.length === 1 ? '' : 's'}`
            }
          </p>
        </div>
        <QuestionTypeSelector onSelect={handleAddQuestion} />
      </div>

      <div className="space-y-6">
        {questions.map((q, idx) => {
          const isSelected = selectedQuestionId === q.id
          return (
            <Card
              key={q.id}
              className={cn(
                'transition-all duration-200 cursor-pointer',
                isSelected && 'border-purple-300 bg-purple-5 shadow-elevation-2'
              )}
              onClick={() => setSelectedQuestionId(q.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Drag Handle */}
                  <button
                    className="flex-shrink-0 p-2 -ml-2 -mt-2 rounded-control hover:bg-surface-alt transition-colors duration-200 cursor-grab active:cursor-grabbing"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Drag to reorder"
                  >
                    <GripVertical className="w-5 h-5 text-[var(--gform-color-text-tertiary)]" />
                  </button>

                  <div className="flex-1 space-y-4 min-w-0">
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {/* Question Number */}
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple text-white flex items-center justify-center text-sm font-semibold">
                          {idx + 1}
                        </div>
                        {/* Type Badge */}
                        <Badge variant="secondary" className="text-xs">
                          {TYPES.find(t => t.value === q.type)?.label || q.type}
                        </Badge>
                        {q.required && (
                          <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                            Required
                          </Badge>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          className="p-2 rounded-control hover:bg-surface-alt transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={idx === 0}
                          onClick={(e) => { e.stopPropagation(); reorder(idx, idx - 1); }}
                          aria-label="Move up"
                        >
                          <ChevronUp className="w-4 h-4 text-[var(--gform-color-text-tertiary)]" />
                        </button>
                        <button
                          className="p-2 rounded-control hover:bg-surface-alt transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={idx === questions.length - 1}
                          onClick={(e) => { e.stopPropagation(); reorder(idx, idx + 1); }}
                          aria-label="Move down"
                        >
                          <ChevronDown className="w-4 h-4 text-[var(--gform-color-text-tertiary)]" />
                        </button>
                        <button
                          className="p-2 rounded-control hover:bg-red-50 transition-colors duration-200"
                          onClick={(e) => { e.stopPropagation(); removeQuestion(q.id); }}
                          aria-label="Remove"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
              <Input placeholder="Question text" value={q.question} onChange={(e) => updateQuestion(q.id, { question: e.target.value })} />
              <Input placeholder="Description (optional)" value={q.description ?? ''} onChange={(e) => updateQuestion(q.id, { description: e.target.value })} />
              <Label className="flex items-center gap-2 text-sm font-normal cursor-pointer">
                <input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(q.id, { required: e.target.checked })} />
                Required
              </Label>

                    {needsOptions(q.type) && (
                      <Card className="bg-surface-alt border-[1.5px]">
                        <CardHeader>
                          <h4 className="text-sm font-semibold text-[var(--gform-color-text)]">Options</h4>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {(q.options ?? []).map((opt, i) => (
                            <div className="flex gap-2" key={i}>
                              <Input
                                value={opt}
                                onChange={(e) => {
                                  const options = [...(q.options ?? [])]
                                  options[i] = e.target.value
                                  updateQuestion(q.id, { options })
                                }}
                                className="flex-1"
                              />
                              <button
                                className="p-2 rounded-control hover:bg-red-50 transition-colors duration-200"
                                onClick={() => {
                                  const options = (q.options ?? []).filter((_, j) => j !== i)
                                  updateQuestion(q.id, { options })
                                }}
                                aria-label="Delete option"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            onClick={() => updateQuestion(q.id, { options: [...(q.options ?? []), `Option ${(q.options?.length ?? 0) + 1}`] })}
                            className="w-full"
                          >
                            Add option
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    {['text', 'textarea'].includes(q.type) && (
                      <Card className="bg-surface-alt border-[1.5px]">
                        <CardHeader>
                          <h4 className="text-sm font-semibold text-[var(--gform-color-text)]">Validation Rules</h4>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs font-medium text-[var(--gform-color-text-secondary)]">Min length</Label>
                            <Input type="number" min="0" placeholder="No limit" value={q.validation?.minLength ?? ''} onChange={(e) => updateQuestion(q.id, { validation: { ...q.validation, minLength: e.target.value ? parseInt(e.target.value) : undefined } })} />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-[var(--gform-color-text-secondary)]">Max length</Label>
                            <Input type="number" min="0" placeholder="No limit" value={q.validation?.maxLength ?? ''} onChange={(e) => updateQuestion(q.id, { validation: { ...q.validation, maxLength: e.target.value ? parseInt(e.target.value) : undefined } })} />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs font-medium text-[var(--gform-color-text-secondary)]">Custom regex pattern</Label>
                            <Input placeholder="e.g., ^[A-Z].*" value={q.validation?.regex ?? ''} onChange={(e) => updateQuestion(q.id, { validation: { ...q.validation, regex: e.target.value || undefined } })} />
                          </div>
                          {q.validation?.regex && (
                            <div className="col-span-2">
                              <Label className="text-xs font-medium text-[var(--gform-color-text-secondary)]">Regex error message</Label>
                              <Input placeholder="Custom error message" value={q.validation?.regexMessage ?? ''} onChange={(e) => updateQuestion(q.id, { validation: { ...q.validation, regexMessage: e.target.value || undefined } })} />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {q.type === 'number' && (
                      <Card className="bg-surface-alt border-[1.5px]">
                        <CardHeader>
                          <h4 className="text-sm font-semibold text-[var(--gform-color-text)]">Validation Rules</h4>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs font-medium text-[var(--gform-color-text-secondary)]">Min value</Label>
                            <Input type="number" placeholder="No limit" value={q.validation?.minValue ?? ''} onChange={(e) => updateQuestion(q.id, { validation: { ...q.validation, minValue: e.target.value ? parseFloat(e.target.value) : undefined } })} />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-[var(--gform-color-text-secondary)]">Max value</Label>
                            <Input type="number" placeholder="No limit" value={q.validation?.maxValue ?? ''} onChange={(e) => updateQuestion(q.id, { validation: { ...q.validation, maxValue: e.target.value ? parseFloat(e.target.value) : undefined } })} />
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {q.type === 'scale' && (
                      <Card className="bg-surface-alt border-[1.5px]">
                        <CardHeader>
                          <h4 className="text-sm font-semibold text-[var(--gform-color-text)]">Scale Settings</h4>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs font-medium text-[var(--gform-color-text-secondary)]">Min value</Label>
                            <Input type="number" placeholder="1" value={q.validation?.scaleMin ?? 1} onChange={(e) => updateQuestion(q.id, { validation: { ...q.validation, scaleMin: parseInt(e.target.value) || 1 } })} />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-[var(--gform-color-text-secondary)]">Max value</Label>
                            <Input type="number" placeholder="10" value={q.validation?.scaleMax ?? 10} onChange={(e) => updateQuestion(q.id, { validation: { ...q.validation, scaleMax: parseInt(e.target.value) || 10 } })} />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-[var(--gform-color-text-secondary)]">Step</Label>
                            <Input type="number" min="1" placeholder="1" value={q.validation?.scaleStep ?? 1} onChange={(e) => updateQuestion(q.id, { validation: { ...q.validation, scaleStep: parseInt(e.target.value) || 1 } })} />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs font-medium text-[var(--gform-color-text-secondary)]">Min label (optional)</Label>
                            <Input placeholder="e.g., Not at all" value={q.validation?.scaleMinLabel ?? ''} onChange={(e) => updateQuestion(q.id, { validation: { ...q.validation, scaleMinLabel: e.target.value || undefined } })} />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs font-medium text-[var(--gform-color-text-secondary)]">Max label (optional)</Label>
                            <Input placeholder="e.g., Extremely" value={q.validation?.scaleMaxLabel ?? ''} onChange={(e) => updateQuestion(q.id, { validation: { ...q.validation, scaleMaxLabel: e.target.value || undefined } })} />
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {q.type === 'file_upload' && (
                      <Card className="bg-surface-alt border-[1.5px]">
                        <CardHeader>
                          <h4 className="text-sm font-semibold text-[var(--gform-color-text)]">File Upload Settings</h4>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label className="text-xs font-medium text-[var(--gform-color-text-secondary)]">Max file size (MB)</Label>
                            <Input type="number" min="1" placeholder="10" value={q.validation?.maxFileSize ?? ''} onChange={(e) => updateQuestion(q.id, { validation: { ...q.validation, maxFileSize: e.target.value ? parseInt(e.target.value) : undefined } })} />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-[var(--gform-color-text-secondary)]">Allowed file types (comma-separated)</Label>
                            <Input placeholder="e.g., image/jpeg,image/png,application/pdf" value={q.validation?.allowedFileTypes?.join(',') ?? ''} onChange={(e) => updateQuestion(q.id, { validation: { ...q.validation, allowedFileTypes: e.target.value ? e.target.value.split(',').map(t => t.trim()) : undefined } })} />
                          </div>
                        </CardContent>
                      </Card>
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
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

