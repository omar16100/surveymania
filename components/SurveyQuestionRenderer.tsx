'use client'

import { UseFormRegister, FieldError, UseFormSetValue, UseFormWatch } from 'react-hook-form'
import { Card, CardContent } from '@/lib/components/ui/card'
import { cn } from '@/lib/utils'

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
  scaleMinLabel?: string
  scaleMaxLabel?: string
}

export type Question = {
  id: string
  type: string
  question: string
  description?: string
  required: boolean
  options?: string[]
  validation?: ValidationRule
}

interface SurveyQuestionRendererProps {
  question: Question
  questionNumber?: number
  showQuestionNumber?: boolean
  register: UseFormRegister<any>
  setValue: UseFormSetValue<any>
  watch: UseFormWatch<any>
  error?: FieldError
  geo?: { latitude: number; longitude: number; accuracy?: number } | null
}

export function SurveyQuestionRenderer({
  question,
  questionNumber,
  showQuestionNumber = false,
  register,
  setValue,
  watch,
  error,
  geo
}: SurveyQuestionRendererProps) {
  const q = question
  const val = q.validation
  const hasError = !!error

  return (
    <Card
      className={cn(
        'transition-all duration-200 animate-in fade-in slide-in-from-bottom-4',
        hasError && 'border-red-300 shadow-elevation-2'
      )}
    >
      <CardContent className="p-8 space-y-4">
        {/* Question Label */}
        <div className="space-y-2">
          <label className="block text-base font-medium leading-relaxed text-[var(--gform-color-text)]">
            {showQuestionNumber && questionNumber && (
              <span className="text-[var(--gform-color-text-tertiary)] font-normal mr-2">
                {questionNumber}.
              </span>
            )}
            {q.question}
            {q.required && (
              <span className="text-red-600 ml-1" aria-label="required">*</span>
            )}
          </label>
          {q.description && (
            <p className="text-sm text-[var(--gform-color-text-secondary)] leading-relaxed">
              {q.description}
            </p>
          )}
        </div>

        {/* Question Input */}
        <div className="space-y-3">
          {/* Text Input */}
          {q.type === 'text' && (
            <input
              className="flex min-h-[48px] w-full rounded-control border-[1.5px] border-[var(--gform-color-border)] bg-surface px-4 py-3 text-base text-[var(--gform-color-text)] transition-all duration-200 placeholder:text-[var(--gform-color-text-tertiary)] focus-visible:outline-none focus-visible:border-purple focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:bg-surface-elevated disabled:text-[var(--gform-color-text-disabled)]"
              {...register(q.id)}
            />
          )}

          {/* Textarea */}
          {q.type === 'textarea' && (
            <textarea
              className="flex min-h-[120px] w-full rounded-control border-[1.5px] border-[var(--gform-color-border)] bg-surface px-4 py-3 text-base text-[var(--gform-color-text)] transition-all duration-200 placeholder:text-[var(--gform-color-text-tertiary)] focus-visible:outline-none focus-visible:border-purple focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:bg-surface-elevated disabled:text-[var(--gform-color-text-disabled)] resize-y"
              rows={4}
              {...register(q.id)}
            />
          )}

          {/* Number Input */}
          {q.type === 'number' && (
            <input
              type="number"
              className="flex min-h-[48px] w-full rounded-control border-[1.5px] border-[var(--gform-color-border)] bg-surface px-4 py-3 text-base text-[var(--gform-color-text)] transition-all duration-200 placeholder:text-[var(--gform-color-text-tertiary)] focus-visible:outline-none focus-visible:border-purple focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:bg-surface-elevated disabled:text-[var(--gform-color-text-disabled)]"
              min={val?.minValue}
              max={val?.maxValue}
              {...register(q.id)}
            />
          )}

          {/* Email Input */}
          {q.type === 'email' && (
            <input
              type="email"
              className="flex min-h-[48px] w-full rounded-control border-[1.5px] border-[var(--gform-color-border)] bg-surface px-4 py-3 text-base text-[var(--gform-color-text)] transition-all duration-200 placeholder:text-[var(--gform-color-text-tertiary)] focus-visible:outline-none focus-visible:border-purple focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:bg-surface-elevated disabled:text-[var(--gform-color-text-disabled)]"
              {...register(q.id)}
            />
          )}

          {/* Phone Input */}
          {q.type === 'phone' && (
            <input
              type="tel"
              className="flex min-h-[48px] w-full rounded-control border-[1.5px] border-[var(--gform-color-border)] bg-surface px-4 py-3 text-base text-[var(--gform-color-text)] transition-all duration-200 placeholder:text-[var(--gform-color-text-tertiary)] focus-visible:outline-none focus-visible:border-purple focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:bg-surface-elevated disabled:text-[var(--gform-color-text-disabled)]"
              placeholder="e.g., +1 234 567 8900"
              {...register(q.id)}
            />
          )}

          {/* Single Choice / Dropdown */}
          {(q.type === 'single_choice' || q.type === 'dropdown') && Array.isArray(q.options) && (
            <select
              className="flex min-h-[48px] w-full items-center justify-between rounded-control border-[1.5px] border-[var(--gform-color-border)] bg-surface px-4 py-3 text-base text-[var(--gform-color-text)] transition-all duration-200 focus-visible:outline-none focus-visible:border-purple focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:bg-surface-elevated disabled:text-[var(--gform-color-text-disabled)]"
              {...register(q.id)}
            >
              <option value="">Select…</option>
              {q.options.map((o: string) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          )}

          {/* Multiple Choice */}
          {q.type === 'multiple_choice' && Array.isArray(q.options) && (
            <div className="space-y-3">
              {q.options.map((o: string) => (
                <label
                  key={o}
                  className="flex items-center gap-3 p-3 rounded-control border-[1.5px] border-[var(--gform-color-border)] bg-surface hover:bg-surface-alt cursor-pointer transition-all duration-200"
                >
                  <input
                    type="checkbox"
                    value={o}
                    className="w-5 h-5 rounded border-[1.5px] border-[var(--gform-color-border)] text-purple focus:ring-2 focus:ring-purple focus:ring-offset-2"
                    {...register(q.id)}
                  />
                  <span className="text-base text-[var(--gform-color-text)]">{o}</span>
                </label>
              ))}
            </div>
          )}

          {/* Rating (1-5 stars) */}
          {q.type === 'rating' && (
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5].map((r) => (
                <label
                  key={r}
                  className="flex items-center justify-center gap-2 min-h-[48px] px-4 py-3 rounded-control border-[1.5px] border-[var(--gform-color-border)] bg-surface hover:bg-surface-alt cursor-pointer transition-all duration-200 has-[:checked]:bg-purple-5 has-[:checked]:border-purple has-[:checked]:text-purple"
                >
                  <input
                    type="radio"
                    value={r}
                    className="sr-only"
                    {...register(q.id)}
                  />
                  <span className="text-base font-medium">{r}</span>
                </label>
              ))}
            </div>
          )}

          {/* Scale (slider) */}
          {q.type === 'scale' && (
            <div className="space-y-4">
              <input
                type="range"
                min={val?.scaleMin ?? 1}
                max={val?.scaleMax ?? 10}
                step={val?.scaleStep ?? 1}
                className="w-full h-2 rounded-full appearance-none bg-surface-alt cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200 [&::-webkit-slider-thumb]:hover:scale-110"
                {...register(q.id)}
                onChange={(e) => setValue(q.id, e.target.value)}
              />
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--gform-color-text-tertiary)]">
                  {val?.scaleMinLabel || val?.scaleMin || 1}
                </span>
                <span className="font-semibold text-purple text-lg">
                  {watch(q.id) || (val?.scaleMin ?? 1)}
                </span>
                <span className="text-[var(--gform-color-text-tertiary)]">
                  {val?.scaleMaxLabel || val?.scaleMax || 10}
                </span>
              </div>
            </div>
          )}

          {/* Date Input */}
          {q.type === 'date' && (
            <input
              type="date"
              className="flex min-h-[48px] w-full rounded-control border-[1.5px] border-[var(--gform-color-border)] bg-surface px-4 py-3 text-base text-[var(--gform-color-text)] transition-all duration-200 focus-visible:outline-none focus-visible:border-purple focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:bg-surface-elevated disabled:text-[var(--gform-color-text-disabled)]"
              {...register(q.id)}
            />
          )}

          {/* Time Input */}
          {q.type === 'time' && (
            <input
              type="time"
              className="flex min-h-[48px] w-full rounded-control border-[1.5px] border-[var(--gform-color-border)] bg-surface px-4 py-3 text-base text-[var(--gform-color-text)] transition-all duration-200 focus-visible:outline-none focus-visible:border-purple focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:bg-surface-elevated disabled:text-[var(--gform-color-text-disabled)]"
              {...register(q.id)}
            />
          )}

          {/* DateTime Input */}
          {q.type === 'datetime' && (
            <input
              type="datetime-local"
              className="flex min-h-[48px] w-full rounded-control border-[1.5px] border-[var(--gform-color-border)] bg-surface px-4 py-3 text-base text-[var(--gform-color-text)] transition-all duration-200 focus-visible:outline-none focus-visible:border-purple focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:bg-surface-elevated disabled:text-[var(--gform-color-text-disabled)]"
              {...register(q.id)}
            />
          )}

          {/* File Upload */}
          {q.type === 'file_upload' && (
            <div className="space-y-2">
              <input
                type="file"
                className="flex min-h-[48px] w-full rounded-control border-[1.5px] border-[var(--gform-color-border)] bg-surface px-4 py-3 text-base text-[var(--gform-color-text)] transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-control file:border-0 file:text-sm file:font-medium file:bg-purple-5 file:text-purple hover:file:bg-purple-10 focus-visible:outline-none focus-visible:border-purple focus-visible:shadow-focus-ring"
                accept={val?.allowedFileTypes?.join(',')}
                {...register(q.id)}
              />
              {(val?.maxFileSize || val?.allowedFileTypes) && (
                <p className="text-xs text-[var(--gform-color-text-tertiary)]">
                  {val.maxFileSize && `Max size: ${val.maxFileSize}MB`}
                  {val.maxFileSize && val.allowedFileTypes && ' • '}
                  {val.allowedFileTypes && `Allowed: ${val.allowedFileTypes.map(t => t.split('/')[1]).join(', ')}`}
                </p>
              )}
            </div>
          )}

          {/* Signature */}
          {q.type === 'signature' && (
            <div className="rounded-control border-[1.5px] border-[var(--gform-color-border)] bg-surface-alt p-4 space-y-3">
              <p className="text-xs text-[var(--gform-color-text-tertiary)]">
                Sign below:
              </p>
              <input
                type="text"
                className="flex min-h-[48px] w-full rounded-control border-[1.5px] border-[var(--gform-color-border)] bg-surface px-4 py-3 text-base text-[var(--gform-color-text)] font-signature transition-all duration-200 placeholder:text-[var(--gform-color-text-tertiary)] focus-visible:outline-none focus-visible:border-purple focus-visible:shadow-focus-ring"
                placeholder="Type your signature"
                {...register(q.id)}
              />
            </div>
          )}

          {/* Location */}
          {q.type === 'location' && (
            <div className="rounded-control border-[1.5px] border-[var(--gform-color-border)] bg-surface-alt p-4">
              <p className="text-sm text-[var(--gform-color-text-secondary)]">
                Location will be captured from your device
              </p>
              {geo && (
                <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Location captured
                </p>
              )}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-control bg-red-50 border-[1.5px] border-red-300">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-600 font-medium">
              {error.message}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
