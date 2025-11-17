'use client'

import { Widget } from '@/stores/dashboardStore'
import { useDashboardStore } from '@/stores/dashboardStore'
import MetricCard from './widgets/MetricCard'
import ChartWidget from './widgets/ChartWidget'
import TableWidget from './widgets/TableWidget'
import MapWidget from './widgets/MapWidget'
import TextWidget from './widgets/TextWidget'

interface WidgetContainerProps {
  widget: Widget
  surveyId: string
  isEditMode: boolean
}

export default function WidgetContainer({ widget, surveyId, isEditMode }: WidgetContainerProps) {
  const { removeWidget } = useDashboardStore()

  function handleDelete() {
    if (confirm('Are you sure you want to delete this widget?')) {
      removeWidget(widget.id)
    }
  }

  function renderWidget() {
    switch (widget.type) {
      case 'metric_card':
        return <MetricCard surveyId={surveyId} config={widget.config} />

      case 'chart':
        return <ChartWidget surveyId={surveyId} config={widget.config} />

      case 'table':
        return <TableWidget surveyId={surveyId} config={widget.config} />

      case 'map':
        return <MapWidget surveyId={surveyId} config={widget.config} />

      case 'text':
        return <TextWidget config={widget.config} />

      default:
        return (
          <div className="card h-full flex items-center justify-center">
            Unknown Widget Type
          </div>
        )
    }
  }

  return (
    <div className="relative h-full" data-widget-id={widget.id}>
      {renderWidget()}

      {isEditMode && (
        <div className="absolute top-2 right-2 flex gap-2">
          <button
            onClick={handleDelete}
            className="btn-sm bg-red-500 hover:bg-red-600 text-white rounded px-2 py-1 text-xs"
            title="Delete widget"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
