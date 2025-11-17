'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useDashboardStore } from '@/stores/dashboardStore'
import { Input, Label, Textarea } from '@/components/ui'
import DashboardBuilder from '@/components/dashboard/DashboardBuilder'
import { widgetsToAPIFormat, serializeLayout, apiDashboardToStoreFormat } from '@/lib/dashboard-utils'
import { exportDashboardToPDF } from '@/lib/dashboard-export'

export default function DashboardPage() {
  const params = useParams()
  const router = useRouter()
  const surveyId = params.id as string
  const dashboardId = params.dashboardId as string

  const { dashboard, setDashboard, updateDashboardInfo, isDirty, markClean } = useDashboardStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboard()
  }, [dashboardId])

  async function fetchDashboard() {
    try {
      setLoading(true)
      const res = await fetch(`/api/dashboards/${dashboardId}`)

      if (!res.ok) throw new Error('Failed to fetch dashboard')

      const data = await res.json()
      const dashboardData = apiDashboardToStoreFormat(data.dashboard)

      setDashboard(dashboardData)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!dashboard) return

    try {
      setSaving(true)

      const res = await fetch(`/api/dashboards/${dashboardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: dashboard.name,
          description: dashboard.description,
          layout: serializeLayout(dashboard.layout),
          isPublic: dashboard.isPublic,
          widgets: widgetsToAPIFormat(dashboard.widgets)
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to update dashboard')
      }

      const data = await res.json()
      const updatedDashboard = apiDashboardToStoreFormat(data.dashboard)
      setDashboard(updatedDashboard)
      markClean()
      setIsEditMode(false)

      alert('Dashboard saved successfully!')
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleTogglePublic() {
    if (!dashboard) return

    const newPublicState = !dashboard.isPublic
    updateDashboardInfo({ isPublic: newPublicState })

    if (newPublicState) {
      alert('Dashboard will be made public when you save.')
    }
  }

  async function handleExportPDF() {
    if (!dashboard) return

    try {
      setExporting(true)
      await exportDashboardToPDF(dashboard, {
        includeHeader: true,
        scale: 2
      })
    } catch (error: any) {
      alert(`Failed to export PDF: ${error.message}`)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-gray-500">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!dashboard) return null

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          {isEditMode ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="name">Dashboard Name</Label>
                  <Input
                    id="name"
                    value={dashboard.name}
                    onChange={(e) => updateDashboardInfo({ name: e.target.value })}
                    placeholder="My Dashboard"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={dashboard.description || ''}
                    onChange={(e) => updateDashboardInfo({ description: e.target.value })}
                    placeholder="Describe your dashboard..."
                    rows={1}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dashboard.isPublic}
                    onChange={handleTogglePublic}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Make this dashboard public</span>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !isDirty}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setIsEditMode(false)
                    fetchDashboard() // Reload to discard changes
                  }}
                  className="btn-outline"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{dashboard.name}</h1>
                  {dashboard.description && (
                    <p className="text-gray-600 mt-1">{dashboard.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportPDF}
                    disabled={exporting || dashboard.widgets.length === 0}
                    className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exporting ? 'Exporting...' : '📄 Export PDF'}
                  </button>
                  <button onClick={() => setIsEditMode(true)} className="btn-primary">
                    Edit Dashboard
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/surveys/${surveyId}/dashboards`)}
                    className="btn-outline"
                  >
                    Back to List
                  </button>
                </div>
              </div>

              {dashboard.isPublic && dashboard.publicToken && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-sm text-purple-800 font-medium mb-1">🌐 Public Dashboard</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/dashboards/public/${dashboard.publicToken}`}
                      className="input flex-1 text-sm"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/dashboards/public/${dashboard.publicToken}`)
                        alert('Link copied to clipboard!')
                      }}
                      className="btn-outline"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Builder */}
        <DashboardBuilder surveyId={surveyId} isEditMode={isEditMode} />
      </div>
    </div>
  )
}
