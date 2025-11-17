interface ProgressBarProps {
  current: number
  total: number
  showCount?: boolean
  className?: string
}

export default function ProgressBar({
  current,
  total,
  showCount = true,
  className = ''
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className={`space-y-2 ${className}`}>
      {showCount && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">
            Question {current} of {total}
          </span>
          <span className="text-sm font-medium text-purple-600">
            {percentage}% complete
          </span>
        </div>
      )}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-purple-600 transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  )
}
