'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

type SubmitState = 'default' | 'loading' | 'success' | 'error'

interface SurveySubmitButtonProps {
  state: SubmitState
  errorMessage?: string
  disabled?: boolean
  className?: string
  onReset?: () => void
}

export function SurveySubmitButton({
  state,
  errorMessage,
  disabled = false,
  className,
  onReset
}: SurveySubmitButtonProps) {
  const [currentState, setCurrentState] = useState<SubmitState>(state)

  useEffect(() => {
    setCurrentState(state)

    // Auto-reset after success (3 seconds)
    if (state === 'success') {
      const timer = setTimeout(() => {
        setCurrentState('default')
        onReset?.()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [state, onReset])

  const isDisabled = disabled || currentState === 'loading' || currentState === 'success'

  return (
    <div className="space-y-3">
      <button
        type="submit"
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-control text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:shadow-focus-ring min-h-[48px] px-6 py-3 w-full sm:w-auto',
          // Default state
          currentState === 'default' &&
            'bg-purple text-white shadow-elevation-1 hover:bg-purple-dark hover:shadow-elevation-2 active:scale-[0.98]',
          // Loading state
          currentState === 'loading' &&
            'bg-purple text-white shadow-elevation-1 cursor-wait opacity-90',
          // Success state
          currentState === 'success' &&
            'bg-green-600 text-white shadow-elevation-2 cursor-default',
          // Error state
          currentState === 'error' &&
            'bg-red-600 text-white shadow-elevation-2 hover:bg-red-700 active:scale-[0.98]',
          // Disabled state
          isDisabled && 'cursor-not-allowed',
          className
        )}
      >
        {/* Default State */}
        {currentState === 'default' && (
          <>
            <span>Submit</span>
          </>
        )}

        {/* Loading State */}
        {currentState === 'loading' && (
          <>
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Submitting…</span>
          </>
        )}

        {/* Success State */}
        {currentState === 'success' && (
          <>
            <svg
              className="h-5 w-5 animate-in zoom-in duration-300"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>Submitted!</span>
          </>
        )}

        {/* Error State */}
        {currentState === 'error' && (
          <>
            <svg
              className="h-5 w-5 animate-in zoom-in duration-200"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span>Try Again</span>
          </>
        )}
      </button>

      {/* Error Message */}
      {currentState === 'error' && errorMessage && (
        <div className="flex items-start gap-2 p-3 rounded-control bg-red-50 border-[1.5px] border-red-300 animate-in fade-in slide-in-from-top-2 duration-200">
          <svg
            className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <div className="space-y-1">
            <p className="text-sm text-red-600 font-medium">Submission failed</p>
            <p className="text-xs text-red-500">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Success Message (optional, shown briefly) */}
      {currentState === 'success' && (
        <div className="flex items-center gap-2 p-3 rounded-control bg-green-50 border-[1.5px] border-green-300 animate-in fade-in slide-in-from-top-2 duration-200">
          <svg
            className="w-5 h-5 text-green-600 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-green-600 font-medium">
            Your response has been submitted successfully
          </p>
        </div>
      )}
    </div>
  )
}
