'use client'

import { cn } from '@/lib/utils'

interface SurveyProgressProps {
  currentQuestion: number
  totalQuestions: number
  className?: string
  showPercentage?: boolean
}

export function SurveyProgress({
  currentQuestion,
  totalQuestions,
  className,
  showPercentage = false
}: SurveyProgressProps) {
  const percentage = Math.round((currentQuestion / totalQuestions) * 100)

  return (
    <div className={cn('fixed top-0 left-0 right-0 z-50', className)}>
      <div
        className="h-1 bg-purple transition-all duration-300 ease-out"
        style={{ width: `${percentage}%` }}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Survey progress: ${percentage}% complete`}
      />
      {showPercentage && (
        <div className="bg-surface/95 backdrop-blur-sm px-4 py-2 text-center">
          <span className="text-xs text-[var(--gform-color-text-tertiary)] font-medium">
            Question {currentQuestion} of {totalQuestions} • {percentage}% complete
          </span>
        </div>
      )}
    </div>
  )
}
