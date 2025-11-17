import { Layout } from 'react-grid-layout'
import { WidgetType, Widget } from '@/stores/dashboardStore'

// Default widget sizes (grid units: 12 columns)
export const WIDGET_SIZES: Record<WidgetType, { w: number; h: number; minW?: number; minH?: number }> = {
  metric_card: { w: 3, h: 2, minW: 2, minH: 2 },
  chart: { w: 6, h: 4, minW: 4, minH: 3 },
  table: { w: 12, h: 5, minW: 6, minH: 4 },
  map: { w: 12, h: 6, minW: 6, minH: 5 },
  text: { w: 6, h: 3, minW: 3, minH: 2 }
}

// Grid settings
export const GRID_CONFIG = {
  cols: 12,
  rowHeight: 60,
  margin: [16, 16] as [number, number],
  containerPadding: [0, 0] as [number, number],
  breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
  cols_breakpoints: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }
}

// Serialize layout to JSON string
export function serializeLayout(layout: Layout[]): string {
  return JSON.stringify(layout)
}

// Parse layout from JSON string
export function parseLayout(layoutStr: string): Layout[] {
  try {
    return JSON.parse(layoutStr) as Layout[]
  } catch {
    return []
  }
}

// Serialize widget config to JSON string
export function serializeWidgetConfig(config: Record<string, any>): string {
  return JSON.stringify(config)
}

// Parse widget config from JSON string
export function parseWidgetConfig(configStr: string): Record<string, any> {
  try {
    return JSON.parse(configStr)
  } catch {
    return {}
  }
}

// Convert widgets to API format
export function widgetsToAPIFormat(widgets: Widget[]) {
  return widgets.map(w => ({
    type: w.type,
    config: serializeWidgetConfig(w.config),
    gridPosition: JSON.stringify(w.gridPosition),
    order: w.order
  }))
}

// Convert API widgets to store format
export function apiWidgetsToStoreFormat(apiWidgets: any[]): Widget[] {
  return apiWidgets.map(w => ({
    id: w.id,
    type: w.type as WidgetType,
    config: parseWidgetConfig(w.config),
    gridPosition: JSON.parse(w.gridPosition || '{"x":0,"y":0,"w":4,"h":3}'),
    order: w.order
  }))
}

// Convert API dashboard to store format
export function apiDashboardToStoreFormat(apiDashboard: any) {
  return {
    id: apiDashboard.id,
    name: apiDashboard.name,
    description: apiDashboard.description || '',
    layout: parseLayout(apiDashboard.layout),
    widgets: apiWidgetsToStoreFormat(apiDashboard.widgets || []),
    isPublic: apiDashboard.isPublic,
    publicToken: apiDashboard.publicToken
  }
}

// Generate widget title based on type and config
export function getWidgetTitle(widget: Widget): string {
  switch (widget.type) {
    case 'metric_card':
      return widget.config.title || getMetricLabel(widget.config.metric)
    case 'chart':
      return widget.config.title || `${widget.config.chartType || 'Chart'} - ${widget.config.dataSource || 'Data'}`
    case 'table':
      return widget.config.title || 'Response Table'
    case 'map':
      return widget.config.title || 'Response Map'
    case 'text':
      return widget.config.title || 'Text Widget'
    default:
      return 'Widget'
  }
}

// Get metric label from metric key
function getMetricLabel(metric?: string): string {
  const labels: Record<string, string> = {
    total_responses: 'Total Responses',
    completion_rate: 'Completion Rate',
    avg_time: 'Avg Completion Time',
    location_count: 'Responses with Location'
  }
  return metric ? labels[metric] || metric : 'Metric'
}

// Get widget icon for library
export function getWidgetIcon(type: WidgetType): string {
  const icons: Record<WidgetType, string> = {
    metric_card: '📊',
    chart: '📈',
    table: '📋',
    map: '🗺️',
    text: '📝'
  }
  return icons[type] || '📦'
}

// Get widget description
export function getWidgetDescription(type: WidgetType): string {
  const descriptions: Record<WidgetType, string> = {
    metric_card: 'Single metric card with stats',
    chart: 'Bar, line, or pie chart',
    table: 'Response data table',
    map: 'Geographic response map',
    text: 'Text or markdown content'
  }
  return descriptions[type] || 'Widget'
}

// Default widget configs
export function getDefaultWidgetConfig(type: WidgetType): Record<string, any> {
  switch (type) {
    case 'metric_card':
      return {
        metric: 'total_responses',
        timeRange: '7d',
        showTrend: true
      }
    case 'chart':
      return {
        chartType: 'line',
        dataSource: 'timeSeries',
        timeRange: '7d'
      }
    case 'table':
      return {
        columns: [],
        pageSize: 10
      }
    case 'map':
      return {
        showClusters: true,
        showHeatmap: false
      }
    case 'text':
      return {
        content: '# New Text Widget\n\nAdd your content here...',
        alignment: 'left'
      }
    default:
      return {}
  }
}

// Validate layout (check for overlaps, out of bounds)
export function validateLayout(layout: Layout[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  layout.forEach((item, index) => {
    // Check bounds
    if (item.x < 0 || item.y < 0) {
      errors.push(`Item ${index} has negative coordinates`)
    }
    if (item.x + item.w > GRID_CONFIG.cols) {
      errors.push(`Item ${index} exceeds grid width`)
    }

    // Check for overlaps (simplified check)
    layout.forEach((other, otherIndex) => {
      if (index !== otherIndex) {
        const overlap = !(
          item.x + item.w <= other.x ||
          other.x + other.w <= item.x ||
          item.y + item.h <= other.y ||
          other.y + other.h <= item.y
        )
        if (overlap) {
          errors.push(`Item ${index} overlaps with item ${otherIndex}`)
        }
      }
    })
  })

  return {
    valid: errors.length === 0,
    errors
  }
}
