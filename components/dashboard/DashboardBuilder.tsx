'use client'

import { useEffect, useState } from 'react'
import GridLayout, { Layout } from 'react-grid-layout'
import { useDashboardStore } from '@/stores/dashboardStore'
import { GRID_CONFIG, getDefaultWidgetConfig, WIDGET_SIZES } from '@/lib/dashboard-utils'
import WidgetContainer from './WidgetContainer'
import { WidgetType } from '@/stores/dashboardStore'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

interface DashboardBuilderProps {
  surveyId: string
  isEditMode?: boolean
}

export default function DashboardBuilder({ surveyId, isEditMode = true }: DashboardBuilderProps) {
  const { dashboard, updateLayout, addWidget } = useDashboardStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !dashboard) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading dashboard...
      </div>
    )
  }

  function handleLayoutChange(newLayout: Layout[]) {
    if (isEditMode) {
      updateLayout(newLayout)
    }
  }

  function handleAddWidget(type: WidgetType) {
    const config = getDefaultWidgetConfig(type)
    const size = WIDGET_SIZES[type]

    // Find position at bottom
    const maxY = Math.max(...dashboard.layout.map(l => l.y + l.h), 0)

    addWidget({
      type,
      config,
      gridPosition: {
        x: 0,
        y: maxY,
        w: size.w,
        h: size.h
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Widget Library (Edit Mode Only) */}
      {isEditMode && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Add Widget</h3>
          <div className="flex gap-2 flex-wrap">
            {(['metric_card', 'chart', 'table', 'map', 'text'] as WidgetType[]).map(type => (
              <button
                key={type}
                onClick={() => handleAddWidget(type)}
                className="btn-outline px-3 py-2 text-sm rounded hover:bg-gray-50"
              >
                + {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid Layout */}
      {dashboard.widgets.length === 0 ? (
        <div className="p-12 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 mb-4">No widgets yet</p>
          {isEditMode && (
            <p className="text-sm text-gray-400">Click "Add Widget" above to get started</p>
          )}
        </div>
      ) : (
        <GridLayout
          className="layout"
          layout={dashboard.layout}
          cols={GRID_CONFIG.cols}
          rowHeight={GRID_CONFIG.rowHeight}
          width={1200}
          margin={GRID_CONFIG.margin}
          containerPadding={GRID_CONFIG.containerPadding}
          onLayoutChange={handleLayoutChange}
          isDraggable={isEditMode}
          isResizable={isEditMode}
          compactType="vertical"
        >
          {dashboard.widgets.map(widget => (
            <div key={widget.id} className="grid-item">
              <WidgetContainer
                widget={widget}
                surveyId={surveyId}
                isEditMode={isEditMode}
              />
            </div>
          ))}
        </GridLayout>
      )}

      {/* Custom Styles */}
      <style jsx global>{`
        .react-grid-layout {
          position: relative;
          transition: height 200ms ease;
        }
        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top;
        }
        .react-grid-item img {
          pointer-events: none;
          user-select: none;
        }
        .react-grid-item > .react-resizable-handle {
          position: absolute;
          width: 20px;
          height: 20px;
          background-color: #673ab7;
          border-radius: 0 0 4px 0;
        }
        .react-grid-item > .react-resizable-handle::after {
          content: '';
          position: absolute;
          right: 3px;
          bottom: 3px;
          width: 5px;
          height: 5px;
          border-right: 2px solid white;
          border-bottom: 2px solid white;
        }
        .grid-item {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  )
}
