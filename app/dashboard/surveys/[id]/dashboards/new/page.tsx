'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useDashboardStore } from '@/stores/dashboardStore'
import { Input, Label, Textarea } from '@/components/ui'
import DashboardBuilder from '@/components/dashboard/DashboardBuilder'
import { widgetsToAPIFormat, serializeLayout } from '@/lib/dashboard-utils'

export default function NewDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const surveyId = params.id as string

  const { dashboard, reset } = useDashboardStore()
  const [name, setName] = useState('New Dashboard')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!dashboard) return

    try {
      setSaving(true)

      const res = await fetch(`/api/surveys/${surveyId}/dashboards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          layout: serializeLayout(dashboard.layout),
          widgets: widgetsToAPIFormat(dashboard.widgets)
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create dashboard')
      }

      const data = await res.json()

      // Reset store and redirect
      reset()
      router.push(`/dashboard/surveys/${surveyId}/dashboards/${data.dashboard.id}`)
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="name">Dashboard Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Dashboard"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your dashboard..."
                rows={1}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !dashboard?.widgets.length}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Dashboard'}
            </button>
            <button
              onClick={() => router.back()}
              className="btn-outline"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Builder */}
        <DashboardBuilder surveyId={surveyId} isEditMode={true} />
      </div>
    </div>
  )
}
