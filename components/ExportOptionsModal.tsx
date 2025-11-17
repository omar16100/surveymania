"use client"
import { useState } from 'react'
import { Button } from './ui'
import { X } from 'lucide-react'
import { ColumnFiltersState } from '@tanstack/react-table'

type ExportFormat = 'csv' | 'xlsx'
type ExportScope = 'all' | 'filtered' | 'selected'

type ExportOptionsModalProps = {
  isOpen: boolean
  onClose: () => void
  surveyId: string
  surveyTitle: string
  totalRows: number
  filteredRows: number
  selectedRows: string[]
  columnFilters: ColumnFiltersState
  columns: Array<{ id: string; label: string }>
}

export function ExportOptionsModal({
  isOpen,
  onClose,
  surveyId,
  surveyTitle,
  totalRows,
  filteredRows,
  selectedRows,
  columnFilters,
  columns
}: ExportOptionsModalProps) {
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [scope, setScope] = useState<ExportScope>('all')
  const [selectedColumns, setSelectedColumns] = useState<string[]>(columns.map(c => c.id))
  const [isExporting, setIsExporting] = useState(false)

  if (!isOpen) return null

  function toggleColumn(columnId: string) {
    setSelectedColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    )
  }

  function selectAllColumns() {
    setSelectedColumns(columns.map(c => c.id))
  }

  function deselectAllColumns() {
    setSelectedColumns([])
  }

  async function handleExport() {
    if (selectedColumns.length === 0) {
      alert('Please select at least one column to export')
      return
    }

    setIsExporting(true)

    try {
      const payload: any = {
        format,
        scope,
        columns: selectedColumns
      }

      if (scope === 'filtered') {
        payload.filters = columnFilters
      }

      if (scope === 'selected') {
        payload.rowIds = selectedRows
      }

      const response = await fetch(`/api/surveys/${surveyId}/export-filtered`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export failed')
      }

      // Download file
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch
        ? filenameMatch[1]
        : `${surveyTitle}-export-${Date.now()}.${format}`

      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      onClose()
    } catch (e: any) {
      alert(`Export failed: ${e.message}`)
    } finally {
      setIsExporting(false)
    }
  }

  const rowCount =
    scope === 'all' ? totalRows :
    scope === 'filtered' ? filteredRows :
    selectedRows.length

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold">Export Responses</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Format
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={format === 'csv'}
                    onChange={(e) => setFormat(e.target.value as ExportFormat)}
                    className="cursor-pointer"
                  />
                  <span>CSV</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value="xlsx"
                    checked={format === 'xlsx'}
                    onChange={(e) => setFormat(e.target.value as ExportFormat)}
                    className="cursor-pointer"
                  />
                  <span>Excel (XLSX)</span>
                </label>
              </div>
            </div>

            {/* Scope Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Scope
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    value="all"
                    checked={scope === 'all'}
                    onChange={(e) => setScope(e.target.value as ExportScope)}
                    className="cursor-pointer"
                  />
                  <span>All rows ({totalRows})</span>
                </label>
                <label className={`flex items-center gap-2 ${columnFilters.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="radio"
                    name="scope"
                    value="filtered"
                    checked={scope === 'filtered'}
                    onChange={(e) => setScope(e.target.value as ExportScope)}
                    disabled={columnFilters.length === 0}
                    className="cursor-pointer disabled:cursor-not-allowed"
                  />
                  <span>Filtered rows ({filteredRows})</span>
                </label>
                <label className={`flex items-center gap-2 ${selectedRows.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="radio"
                    name="scope"
                    value="selected"
                    checked={scope === 'selected'}
                    onChange={(e) => setScope(e.target.value as ExportScope)}
                    disabled={selectedRows.length === 0}
                    className="cursor-pointer disabled:cursor-not-allowed"
                  />
                  <span>Selected rows ({selectedRows.length})</span>
                </label>
              </div>
            </div>

            {/* Column Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Columns to Export
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllColumns}
                    className="text-xs text-purple-600 hover:text-purple-700"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAllColumns}
                    className="text-xs text-gray-600 hover:text-gray-700"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <div className="border rounded-lg p-3 max-h-60 overflow-y-auto space-y-1.5">
                {columns.map(col => (
                  <label
                    key={col.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(col.id)}
                      onChange={() => toggleColumn(col.id)}
                      className="cursor-pointer"
                    />
                    <span className="text-sm">{col.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Export Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Export:</span> {rowCount} row{rowCount !== 1 ? 's' : ''} × {selectedColumns.length} column{selectedColumns.length !== 1 ? 's' : ''} as {format.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t">
            <Button variant="outline" onClick={onClose} disabled={isExporting}>
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting || selectedColumns.length === 0}
            >
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
