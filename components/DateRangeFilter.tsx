"use client"
import { useState, useEffect } from 'react'
import { Column } from '@tanstack/react-table'

type DateRangeFilterProps = {
  column: Column<any, unknown>
}

type RangeValue = {
  start?: string
  end?: string
}

export function DateRangeFilter({ column }: DateRangeFilterProps) {
  const filterValue = column.getFilterValue() as RangeValue | undefined
  const [start, setStart] = useState<string>(filterValue?.start || '')
  const [end, setEnd] = useState<string>(filterValue?.end || '')

  useEffect(() => {
    if (start === '' && end === '') {
      column.setFilterValue(undefined)
    } else {
      column.setFilterValue({ start: start || undefined, end: end || undefined })
    }
  }, [start, end, column])

  return (
    <div className="flex flex-col gap-2">
      <input
        type="date"
        className="input w-full text-sm"
        placeholder="Start date"
        value={start}
        onChange={(e) => setStart(e.target.value)}
      />
      <span className="text-xs text-gray-500 text-center">to</span>
      <input
        type="date"
        className="input w-full text-sm"
        placeholder="End date"
        value={end}
        onChange={(e) => setEnd(e.target.value)}
      />
    </div>
  )
}
