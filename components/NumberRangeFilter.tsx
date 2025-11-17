"use client"
import { useState, useEffect } from 'react'
import { Column } from '@tanstack/react-table'

type NumberRangeFilterProps = {
  column: Column<any, unknown>
}

type RangeValue = {
  min?: number
  max?: number
}

export function NumberRangeFilter({ column }: NumberRangeFilterProps) {
  const filterValue = column.getFilterValue() as RangeValue | undefined
  const [min, setMin] = useState<string>(filterValue?.min?.toString() || '')
  const [max, setMax] = useState<string>(filterValue?.max?.toString() || '')

  useEffect(() => {
    const minNum = min === '' ? undefined : parseFloat(min)
    const maxNum = max === '' ? undefined : parseFloat(max)

    if (minNum === undefined && maxNum === undefined) {
      column.setFilterValue(undefined)
    } else {
      column.setFilterValue({ min: minNum, max: maxNum })
    }
  }, [min, max, column])

  return (
    <div className="flex gap-2 items-center">
      <input
        type="number"
        className="input w-20 text-sm"
        placeholder="Min"
        value={min}
        onChange={(e) => setMin(e.target.value)}
        step="any"
      />
      <span className="text-xs text-gray-500">to</span>
      <input
        type="number"
        className="input w-20 text-sm"
        placeholder="Max"
        value={max}
        onChange={(e) => setMax(e.target.value)}
        step="any"
      />
    </div>
  )
}
