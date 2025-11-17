"use client"
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { ColumnDef, ColumnFiltersState, ColumnOrderState, ColumnPinningState, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, RowSelectionState, SortingState, useReactTable, VisibilityState } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'
import { showToast } from '@/components/Toast'
import ExportMenu from '@/components/ExportMenu'
import { QuestionFilter } from '@/components/QuestionFilter'
import { ExportOptionsModal } from '@/components/ExportOptionsModal'
import { GripVertical } from 'lucide-react'

type Question = {
  id: string
  question: string
  type: string
  order: number
  options?: string | null
}

type Answer = {
  id: string
  questionId: string
  answerType: string
  answerText: string | null
  answerNumber: number | null
  answerChoices: string[]
}

type Response = {
  id: string
  sessionId: string
  status: string
  latitude: number | null
  longitude: number | null
  address: string | null
  city: string | null
  country: string | null
  geocodedAt: string | null
  startedAt: string
  submittedAt: string | null
  answers: Answer[]
}

type ResponseData = {
  survey: {
    id: string
    title: string
    questions: Question[]
  }
  responses: Response[]
  stats: {
    total: number
    completed: number
    completionRate: number
  }
}

export default function ResponsesPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<ResponseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'submittedAt', desc: true }])
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({ left: ['select', 'submittedAt'] })
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>({})
  const [columnSizingInfo, setColumnSizingInfo] = useState<any>({})
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([])
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const tbodyRef = useRef<HTMLTableSectionElement | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Load filters from URL and localStorage on mount
  useEffect(() => {
    // Try URL first
    const urlFilters = searchParams.get('filters')
    if (urlFilters) {
      try {
        const parsed = JSON.parse(decodeURIComponent(urlFilters))
        setColumnFilters(parsed)
        return
      } catch (e) {
        console.error('Failed to parse URL filters:', e)
      }
    }

    // Fallback to localStorage
    const saved = localStorage.getItem(`sm:responses:${params.id}:filters`)
    if (saved) {
      try {
        setColumnFilters(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse saved filters:', e)
      }
    }
  }, [params.id, searchParams])

  // Save filters to localStorage and URL
  useEffect(() => {
    if (columnFilters.length > 0) {
      // Save to localStorage
      localStorage.setItem(`sm:responses:${params.id}:filters`, JSON.stringify(columnFilters))

      // Update URL
      const newParams = new URLSearchParams(searchParams.toString())
      newParams.set('filters', encodeURIComponent(JSON.stringify(columnFilters)))
      router.replace(`?${newParams.toString()}`, { scroll: false })
    } else {
      // Clear localStorage and URL if no filters
      localStorage.removeItem(`sm:responses:${params.id}:filters`)
      const newParams = new URLSearchParams(searchParams.toString())
      newParams.delete('filters')
      const newUrl = newParams.toString() ? `?${newParams.toString()}` : window.location.pathname
      router.replace(newUrl, { scroll: false })
    }
  }, [columnFilters, params.id, router, searchParams])

  // Load column order from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`sm:responses:${params.id}:colOrder`)
    if (saved) {
      try {
        setColumnOrder(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse saved column order:', e)
      }
    }
  }, [params.id])

  // Save column order to localStorage
  useEffect(() => {
    if (columnOrder.length > 0) {
      localStorage.setItem(`sm:responses:${params.id}:colOrder`, JSON.stringify(columnOrder))
    }
  }, [columnOrder, params.id])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await fetch(`/api/surveys/${params.id}/responses`)
      const json = await res.json()
      setData(json)
      setLoading(false)
    }
    load()
  }, [params.id])

  // Real-time subscription via SSE
  useEffect(() => {
    const eventSource = new EventSource(`/api/surveys/${params.id}/sse`)

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)

        // Handle different event types
        if (payload.type === 'survey:response:new') {
          const eventData = payload.data

          // Add new response to the table
          setData(prev => {
            if (!prev) return prev

            // Check if response already exists (deduplication)
            if (prev.responses.some(r => r.id === eventData.id)) {
              return prev
            }

            // Create new response object matching our Response type
            const newResponse: Response = {
              id: eventData.id,
              sessionId: eventData.sessionId,
              status: eventData.status,
              latitude: eventData.latitude,
              longitude: eventData.longitude,
              startedAt: eventData.submittedAt || new Date().toISOString(),
              submittedAt: eventData.submittedAt,
              answers: eventData.answers || []
            }

            // Prepend to responses list
            return {
              ...prev,
              responses: [newResponse, ...prev.responses],
              stats: {
                total: prev.stats.total + 1,
                completed: eventData.status === 'completed' ? prev.stats.completed + 1 : prev.stats.completed,
                completionRate: prev.stats.total + 1 > 0
                  ? Math.round(((eventData.status === 'completed' ? prev.stats.completed + 1 : prev.stats.completed) / (prev.stats.total + 1)) * 1000) / 10
                  : 0
              }
            }
          })

          // Show toast notification
          showToast('New response received!', 'success', 3000)
        }
      } catch (error) {
        console.error('SSE message parse error:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      eventSource.close()
    }

    // Cleanup
    return () => {
      eventSource.close()
    }
  }, [params.id])

  async function downloadCsv() {
    try {
      const response = await fetch(`/api/surveys/${params.id}/export-csv`)
      if (!response.ok) {
        const error = await response.json()
        alert(`Export failed: ${error.error || 'Unknown error'}`)
        return
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch ? filenameMatch[1] : `survey-${params.id}-export.csv`

      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: any) {
      alert(`Export failed: ${e.message}`)
    }
  }

  async function deleteResponse(responseId: string) {
    if (!confirm('Delete this response? This action cannot be undone.')) return
    try {
      const res = await fetch(`/api/responses/${responseId}`, { method: 'DELETE' })
      if (res.ok) {
        setData(prev => prev ? {
          ...prev,
          responses: prev.responses.filter(r => r.id !== responseId),
          stats: {
            ...prev.stats,
            total: prev.stats.total - 1,
            completed: prev.responses.find(r => r.id === responseId)?.status === 'completed'
              ? prev.stats.completed - 1
              : prev.stats.completed,
            completionRate: prev.stats.total > 1
              ? Math.round(((prev.stats.completed - (prev.responses.find(r => r.id === responseId)?.status === 'completed' ? 1 : 0)) / (prev.stats.total - 1)) * 100)
              : 0
          }
        } : null)
      } else {
        const error = await res.json()
        alert(`Failed to delete: ${error.error || 'Unknown error'}`)
      }
    } catch (e: any) {
      alert(`Failed to delete: ${e.message}`)
    }
  }

  async function geocodeResponse(responseId: string) {
    try {
      const res = await fetch(`/api/responses/${responseId}/geocode`, { method: 'POST' })
      if (res.ok) {
        const geocoded = await res.json()
        // Update response in state
        setData(prev => prev ? {
          ...prev,
          responses: prev.responses.map(r =>
            r.id === responseId
              ? { ...r, address: geocoded.address, city: geocoded.city, country: geocoded.country, geocodedAt: geocoded.geocodedAt }
              : r
          )
        } : null)
        showToast('Address geocoded successfully', 'success', 3000)
      } else {
        const error = await res.json()
        alert(`Geocoding failed: ${error.error || 'Unknown error'}`)
      }
    } catch (e: any) {
      alert(`Geocoding failed: ${e.message}`)
    }
  }

  // Column reordering handlers
  function handleDragStart(e: React.DragEvent, columnId: string) {
    e.dataTransfer.effectAllowed = 'move'
    setDraggedColumn(columnId)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(e: React.DragEvent, targetColumnId: string) {
    e.preventDefault()

    if (!draggedColumn || draggedColumn === targetColumnId) {
      setDraggedColumn(null)
      return
    }

    const allColumns = table.getAllLeafColumns()
    const currentOrder = columnOrder.length > 0 ? columnOrder : allColumns.map(c => c.id)

    // Don't allow reordering pinned columns
    const draggedCol = allColumns.find(c => c.id === draggedColumn)
    const targetCol = allColumns.find(c => c.id === targetColumnId)

    if (draggedCol?.getIsPinned() || targetCol?.getIsPinned()) {
      setDraggedColumn(null)
      return
    }

    const draggedIndex = currentOrder.indexOf(draggedColumn)
    const targetIndex = currentOrder.indexOf(targetColumnId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedColumn(null)
      return
    }

    const newOrder = [...currentOrder]
    newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedColumn)

    setColumnOrder(newOrder)
    setDraggedColumn(null)
  }

  function resetColumnOrder() {
    setColumnOrder([])
    localStorage.removeItem(`sm:responses:${params.id}:colOrder`)
    showToast('Column order reset to default', 'success', 2000)
  }

  // Format answer for display
  function formatAnswer(response: Response, questionId: string): string {
    const answer = response.answers.find(a => a.questionId === questionId)
    if (!answer) return ''

    switch (answer.answerType) {
      case 'text':
        return answer.answerText || ''
      case 'number':
        return answer.answerNumber?.toString() || ''
      case 'choice':
        return answer.answerText || ''
      case 'choices':
        return answer.answerChoices.join(', ')
      default:
        return answer.answerText || ''
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading responses..." />
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Responses</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">Failed to load responses</p>
        </div>
      </div>
    )
  }

  // TanStack Table setup
  const columns = useMemo<ColumnDef<Response>[]>(() => {
    const select: ColumnDef<Response> = {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="cursor-pointer"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="cursor-pointer"
        />
      ),
      enableSorting: false,
      enableColumnFilter: false,
      enableResizing: false,
      size: 40
    }
    const base: ColumnDef<Response>[] = [
      {
        accessorKey: 'submittedAt',
        header: 'Submitted',
        enableColumnFilter: true,
        filterFn: (row, id, value: any) => {
          const raw = row.getValue(id) as string | null
          if (!raw) return false
          const ts = new Date(raw).getTime()
          const from = value?.from ? new Date(value.from).getTime() : -Infinity
          const to = value?.to ? new Date(value.to).getTime() : Infinity
          return ts >= from && ts <= to
        },
        sortingFn: (a, b, id) => {
          const av = a.getValue(id) as string | null
          const bv = b.getValue(id) as string | null
          return new Date(av || 0).getTime() - new Date(bv || 0).getTime()
        },
        cell: (info) => info.getValue()
          ? new Date(info.getValue() as string).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          : 'N/A'
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableColumnFilter: true,
        filterFn: (row, id, value: any) => {
          if (!value) return true
          return String(row.getValue(id)) === String(value)
        },
        cell: (info) => <Badge variant={String(info.getValue()) === 'completed' ? 'default' : 'secondary'}>{String(info.getValue())}</Badge>
      }
    ]
    const dyn: ColumnDef<Response>[] = data.survey.questions.map((q) => {
      // Parse options if available
      let parsedOptions: string[] | undefined
      if (q.options) {
        try {
          const opts = JSON.parse(q.options)
          parsedOptions = Array.isArray(opts) ? opts : undefined
        } catch {
          parsedOptions = undefined
        }
      }

      return {
        id: `q_${q.id}`,
        header: ({ column }) => (
          <div className="flex items-center gap-1.5">
            <span className="flex-1">{q.question}</span>
            <QuestionFilter column={column} questionType={q.type} options={parsedOptions} />
          </div>
        ),
        accessorFn: (row) => formatAnswer(row, q.id),
        enableColumnFilter: true,
        filterFn: (row, id, value: any) => {
          // Handle number range filters
          if (q.type === 'number' && value && typeof value === 'object' && ('min' in value || 'max' in value)) {
            const cellValue = row.getValue(id) as string
            if (!cellValue) return false
            const num = parseFloat(cellValue)
            if (isNaN(num)) return false
            if (value.min !== undefined && num < value.min) return false
            if (value.max !== undefined && num > value.max) return false
            return true
          }

          // Handle date range filters
          if ((q.type === 'date' || q.type === 'datetime') && value && typeof value === 'object' && ('start' in value || 'end' in value)) {
            const cellValue = row.getValue(id) as string
            if (!cellValue) return false
            const cellDate = new Date(cellValue).getTime()
            if (isNaN(cellDate)) return false
            if (value.start) {
              const startDate = new Date(value.start).getTime()
              if (cellDate < startDate) return false
            }
            if (value.end) {
              const endDate = new Date(value.end).getTime()
              if (cellDate > endDate) return false
            }
            return true
          }

          // Default string filter
          const v = String(row.getValue(id) ?? '').toLowerCase()
          const needle = String(value ?? '').toLowerCase()
          return v.includes(needle)
        }
      }
    })
    const loc: ColumnDef<Response> = {
      id: 'location',
      header: 'Location',
      accessorFn: (row) => {
        if (row.address) return row.address
        if (row.latitude && row.longitude) return `${row.latitude.toFixed(4)}, ${row.longitude.toFixed(4)}`
        return 'N/A'
      },
      cell: (info) => {
        const row = info.row.original
        if (row.address) {
          return (
            <div className="text-sm">
              <div className="font-medium">{row.city || row.address}</div>
              {row.country && <div className="text-gray-500">{row.country}</div>}
            </div>
          )
        }
        if (row.latitude && row.longitude) {
          return `${row.latitude.toFixed(4)}, ${row.longitude.toFixed(4)}`
        }
        return 'N/A'
      }
    }
    const actions: ColumnDef<Response> = {
      id: 'actions',
      header: 'Actions',
      cell: (info) => {
        const row = info.row.original
        const hasCoords = row.latitude && row.longitude
        const hasAddress = row.address
        const canGeocode = hasCoords && !hasAddress

        return (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={`/dashboard/surveys/${params.id}/responses/${row.id}`}>View</a>
            </Button>
            {canGeocode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => geocodeResponse(row.id)}
                title="Convert coordinates to address"
              >
                Geocode
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={() => deleteResponse(row.id)}>
              Delete
            </Button>
          </div>
        )
      },
      enableSorting: false,
      enableColumnFilter: false
    }
    return [select, ...base, ...dyn, loc, actions]
  }, [data, params.id])

  const table = useReactTable({
    data: data.responses,
    columns,
    state: { sorting, globalFilter, columnVisibility, columnFilters, columnPinning, columnSizing, columnSizingInfo, columnOrder, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onColumnPinningChange: setColumnPinning,
    onColumnSizingChange: setColumnSizing,
    onColumnSizingInfoChange: setColumnSizingInfo,
    onColumnOrderChange: setColumnOrder,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    enableColumnPinning: true,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  })

  const allRows = table.getRowModel().rows
  const rowVirtualizer = useVirtualizer({
    count: allRows.length,
    getScrollElement: () => tbodyRef.current,
    estimateSize: () => 44,
    overscan: 10
  })
  const virtualItems = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()
  const startIndex = virtualItems[0]?.index ?? 0
  const endIndex = virtualItems[virtualItems.length - 1]?.index ?? 0
  const visibleRows = allRows.slice(startIndex, endIndex + 1)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{data.survey.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">Response Data</p>
        </div>
        <div className="flex items-center gap-2">
          <input className="input" placeholder="Search…" value={globalFilter} onChange={(e) => { setGlobalFilter(e.target.value); setPage(0) }} />
          {/* Status filter */}
          <select
            className="input"
            value={(table.getColumn('status')?.getFilterValue() as string) ?? ''}
            onChange={(e) => { table.getColumn('status')?.setFilterValue(e.target.value || undefined); setPage(0) }}
          >
            <option value="">All statuses</option>
            <option value="completed">completed</option>
            <option value="in_progress">in_progress</option>
            <option value="abandoned">abandoned</option>
          </select>
          {/* Submitted date range filter */}
          <input
            type="date"
            className="input"
            value={(table.getColumn('submittedAt')?.getFilterValue() as any)?.from ?? ''}
            onChange={(e) => {
              const cur: any = table.getColumn('submittedAt')?.getFilterValue() || {}
              cur.from = e.target.value
              table.getColumn('submittedAt')?.setFilterValue(cur)
              setPage(0)
            }}
          />
          <input
            type="date"
            className="input"
            value={(table.getColumn('submittedAt')?.getFilterValue() as any)?.to ?? ''}
            onChange={(e) => {
              const cur: any = table.getColumn('submittedAt')?.getFilterValue() || {}
              cur.to = e.target.value
              table.getColumn('submittedAt')?.setFilterValue(cur)
              setPage(0)
            }}
          />
          <Button onClick={downloadCsv}>Export CSV</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Responses</CardDescription>
            <CardTitle className="text-3xl">{data.stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl">{data.stats.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completion Rate</CardDescription>
            <CardTitle className="text-3xl">{data.stats.completionRate}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Export Menu */}
      <div className="flex items-center gap-3">
        <ExportMenu surveyId={params.id} surveyTitle={data.survey.title} />
        <Button onClick={() => setExportModalOpen(true)}>
          Export with Options
        </Button>
      </div>

      {/* Row Selection */}
      {Object.keys(rowSelection).length > 0 && (
        <div className="flex items-center gap-3 text-sm bg-purple-50 border border-purple-200 rounded-lg p-3">
          <span className="font-medium text-purple-900">
            {Object.keys(rowSelection).length} of {data.responses.length} rows selected
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRowSelection({})}
          >
            Clear Selection
          </Button>
        </div>
      )}

      {/* Active Filters */}
      {columnFilters.length > 0 && (
        <div className="flex items-center gap-3 text-sm bg-blue-50 border border-blue-200 rounded-lg p-3">
          <span className="font-medium text-blue-900">
            {columnFilters.length} filter{columnFilters.length > 1 ? 's' : ''} active
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setColumnFilters([])}
          >
            Clear All Filters
          </Button>
        </div>
      )}

      {data.responses.length === 0 ? (
        <p className="text-gray-600">No responses yet.</p>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id} className="text-left">
                  {hg.headers.map(h => {
                    const isPinned = h.column.getIsPinned() === 'left'
                    const isDraggable = !isPinned && h.id !== 'actions'
                    const isDragging = draggedColumn === h.id

                    return (
                      <th
                        key={h.id}
                        className={`border-b p-3 font-medium select-none relative ${
                          isPinned ? 'sticky left-0 bg-gray-50 z-10' : ''
                        } ${isDragging ? 'opacity-50' : ''}`}
                        style={{ width: h.getSize() }}
                        draggable={isDraggable}
                        onDragStart={(e) => isDraggable && handleDragStart(e, h.id)}
                        onDragOver={(e) => isDraggable && handleDragOver(e)}
                        onDrop={(e) => isDraggable && handleDrop(e, h.id)}
                      >
                        <div className="flex items-center gap-1">
                          {isDraggable && (
                            <GripVertical
                              className="w-4 h-4 text-gray-400 cursor-grab active:cursor-grabbing hover:text-gray-600 flex-shrink-0"
                              onMouseDown={(e) => e.stopPropagation()}
                            />
                          )}
                          <div className="inline-flex items-center gap-1 cursor-pointer" onClick={h.column.getToggleSortingHandler()}>
                            {flexRender(h.column.columnDef.header, h.getContext())}
                            {h.column.getIsSorted() === 'asc' && <span>▲</span>}
                            {h.column.getIsSorted() === 'desc' && <span>▼</span>}
                          </div>
                        </div>
                        {h.column.getCanResize() && (
                          <div
                            onMouseDown={h.getResizeHandler()}
                            onTouchStart={h.getResizeHandler()}
                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none hover:bg-purple"
                          />
                        )}
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody ref={tbodyRef as any} className="block max-h-[60vh] overflow-auto">
              {/* Spacer before */}
              <tr className="table w-full" style={{ height: virtualItems[0]?.start ?? 0 }}>
                <td className="p-0" colSpan={table.getAllLeafColumns().length}></td>
              </tr>
              {visibleRows.map((r, i) => (
                <tr key={r.id} className="table w-full hover:bg-gray-50" style={{ height: virtualItems[i]?.size || 44 }}>
                  {r.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className={`border-b p-3 align-top max-w-xs truncate ${cell.column.getIsPinned() === 'left' ? 'sticky left-0 bg-white z-10' : ''}`}
                      style={{ width: cell.column.getSize() }}
                      title={String(cell.getValue() ?? '')}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Spacer after */}
              <tr className="table w-full" style={{ height: totalSize - (virtualItems[virtualItems.length - 1]?.end ?? 0) }}>
                <td className="p-0" colSpan={table.getAllLeafColumns().length}></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Column visibility + Pinning + Reordering */}
      {data.responses.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600 mr-1">Columns:</span>
            {table.getAllLeafColumns().map(col => (
              <label key={col.id} className="text-sm flex items-center gap-1">
                <input type="checkbox" checked={col.getIsVisible()} onChange={col.getToggleVisibilityHandler()} />
                {String(col.columnDef.header ?? col.id)}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Pinned:</span>
              {table.getAllLeafColumns().slice(0, 2).map(col => (
                <label key={col.id} className="text-sm flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={col.getIsPinned() === 'left'}
                    onChange={(e) => col.pin(e.target.checked ? 'left' : false)}
                  />
                  {String(col.columnDef.header ?? col.id)}
                </label>
              ))}
            </div>
            {columnOrder.length > 0 && (
              <Button variant="outline" size="sm" onClick={resetColumnOrder}>
                Reset Column Order
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Export Options Modal */}
      <ExportOptionsModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        surveyId={params.id}
        surveyTitle={data.survey.title}
        totalRows={data.responses.length}
        filteredRows={table.getFilteredRowModel().rows.length}
        selectedRows={Object.keys(rowSelection)}
        columnFilters={columnFilters}
        columns={table.getAllLeafColumns()
          .filter(col => col.id !== 'select' && col.id !== 'actions')
          .map(col => ({
            id: col.id,
            label: typeof col.columnDef.header === 'function'
              ? col.id
              : String(col.columnDef.header ?? col.id)
          }))}
      />
    </div>
  )
}
