"use client"
import { useState } from 'react'
import { Column } from '@tanstack/react-table'
import { Filter, X } from 'lucide-react'
import { Button } from './ui'
import { NumberRangeFilter } from './NumberRangeFilter'
import { DateRangeFilter } from './DateRangeFilter'

type QuestionFilterProps = {
  column: Column<any, unknown>
  questionType: string
  options?: string[] // For choice/choices types
}

export function QuestionFilter({ column, questionType, options }: QuestionFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const filterValue = column.getFilterValue() as string | undefined

  function handleClear() {
    column.setFilterValue(undefined)
  }

  function renderFilterInput() {
    switch (questionType) {
      case 'text':
        return (
          <input
            type="text"
            className="input w-full"
            placeholder="Filter..."
            value={filterValue || ''}
            onChange={(e) => column.setFilterValue(e.target.value || undefined)}
          />
        )

      case 'number':
        return <NumberRangeFilter column={column} />

      case 'choice':
      case 'choices':
        if (!options || options.length === 0) {
          return (
            <input
              type="text"
              className="input w-full"
              placeholder="Filter..."
              value={filterValue || ''}
              onChange={(e) => column.setFilterValue(e.target.value || undefined)}
            />
          )
        }
        return (
          <select
            className="input w-full"
            value={filterValue || ''}
            onChange={(e) => column.setFilterValue(e.target.value || undefined)}
          >
            <option value="">All</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )

      case 'date':
      case 'datetime':
        return <DateRangeFilter column={column} />

      default:
        return (
          <input
            type="text"
            className="input w-full"
            placeholder="Filter..."
            value={filterValue || ''}
            onChange={(e) => column.setFilterValue(e.target.value || undefined)}
          />
        )
    }
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1 rounded hover:bg-gray-200 transition-colors ${
          filterValue ? 'text-purple-600' : 'text-gray-400'
        }`}
        title="Filter column"
      >
        <Filter className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Popover */}
          <div className="absolute top-full left-0 mt-1 z-20 bg-white border rounded-lg shadow-lg p-3 min-w-[200px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700">Filter</span>
              {filterValue && (
                <button
                  onClick={handleClear}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
            {renderFilterInput()}
          </div>
        </>
      )}
    </div>
  )
}
