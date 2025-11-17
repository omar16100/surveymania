import { create } from 'zustand'
import { Layout } from 'react-grid-layout'

export type WidgetType = 'metric_card' | 'chart' | 'table' | 'map' | 'text'

export interface Widget {
  id: string
  type: WidgetType
  config: Record<string, any>
  gridPosition: { x: number; y: number; w: number; h: number }
  order: number
}

export interface Dashboard {
  id?: string
  name: string
  description?: string
  layout: Layout[]
  widgets: Widget[]
  isPublic: boolean
  publicToken?: string
}

interface DashboardStore {
  dashboard: Dashboard | null
  isDirty: boolean

  // Actions
  setDashboard: (dashboard: Dashboard) => void
  updateLayout: (layout: Layout[]) => void
  addWidget: (widget: Omit<Widget, 'id' | 'order'>) => void
  updateWidget: (id: string, updates: Partial<Widget>) => void
  removeWidget: (id: string) => void
  updateDashboardInfo: (info: Partial<Pick<Dashboard, 'name' | 'description' | 'isPublic'>>) => void
  reset: () => void
  markClean: () => void
}

const DEFAULT_DASHBOARD: Dashboard = {
  name: 'New Dashboard',
  description: '',
  layout: [],
  widgets: [],
  isPublic: false
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  dashboard: null,
  isDirty: false,

  setDashboard: (dashboard) => set({ dashboard, isDirty: false }),

  updateLayout: (layout) => {
    const { dashboard } = get()
    if (!dashboard) return

    // Update grid positions in widgets based on layout
    const updatedWidgets = dashboard.widgets.map(widget => {
      const layoutItem = layout.find(l => l.i === widget.id)
      if (layoutItem) {
        return {
          ...widget,
          gridPosition: {
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h
          }
        }
      }
      return widget
    })

    set({
      dashboard: {
        ...dashboard,
        layout,
        widgets: updatedWidgets
      },
      isDirty: true
    })
  },

  addWidget: (widget) => {
    const { dashboard } = get()
    if (!dashboard) return

    const id = crypto.randomUUID()
    const order = dashboard.widgets.length

    // Find a good position for the new widget (bottom of the grid)
    const maxY = Math.max(...dashboard.layout.map(l => l.y + l.h), 0)
    const newWidget: Widget = {
      ...widget,
      id,
      order,
      gridPosition: widget.gridPosition || { x: 0, y: maxY, w: 4, h: 3 }
    }

    const newLayoutItem: Layout = {
      i: id,
      x: newWidget.gridPosition.x,
      y: newWidget.gridPosition.y,
      w: newWidget.gridPosition.w,
      h: newWidget.gridPosition.h
    }

    set({
      dashboard: {
        ...dashboard,
        layout: [...dashboard.layout, newLayoutItem],
        widgets: [...dashboard.widgets, newWidget]
      },
      isDirty: true
    })
  },

  updateWidget: (id, updates) => {
    const { dashboard } = get()
    if (!dashboard) return

    const updatedWidgets = dashboard.widgets.map(w =>
      w.id === id ? { ...w, ...updates } : w
    )

    // Update layout if gridPosition changed
    let updatedLayout = dashboard.layout
    if (updates.gridPosition) {
      updatedLayout = dashboard.layout.map(l =>
        l.i === id
          ? { ...l, ...updates.gridPosition }
          : l
      )
    }

    set({
      dashboard: {
        ...dashboard,
        layout: updatedLayout,
        widgets: updatedWidgets
      },
      isDirty: true
    })
  },

  removeWidget: (id) => {
    const { dashboard } = get()
    if (!dashboard) return

    set({
      dashboard: {
        ...dashboard,
        layout: dashboard.layout.filter(l => l.i !== id),
        widgets: dashboard.widgets.filter(w => w.id !== id)
      },
      isDirty: true
    })
  },

  updateDashboardInfo: (info) => {
    const { dashboard } = get()
    if (!dashboard) return

    set({
      dashboard: {
        ...dashboard,
        ...info
      },
      isDirty: true
    })
  },

  reset: () => set({ dashboard: { ...DEFAULT_DASHBOARD }, isDirty: false }),

  markClean: () => set({ isDirty: false })
}))
