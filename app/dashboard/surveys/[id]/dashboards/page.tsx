'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui'

export default function DashboardsListPage() {
  const params = useParams()
  const router = useRouter()
  const surveyId = params.id as string

  const [dashboards, setDashboards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboards()
  }, [surveyId])

  async function fetchDashboards() {
    try {
      setLoading(true)
      const res = await fetch(`/api/surveys/${surveyId}/dashboards`)

      if (!res.ok) throw new Error('Failed to fetch dashboards')

      const data = await res.json()
      setDashboards(data.dashboards || [])
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(dashboardId: string) {
    if (!confirm('Are you sure you want to delete this dashboard?')) return

    try {
      const res = await fetch(`/api/dashboards/${dashboardId}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to delete dashboard')

      // Refresh list
      fetchDashboards()
    } catch (e: any) {
      alert('Error: ' + e.message)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboards</h1>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboards</h1>
            <p className="text-gray-600">Custom dashboard views for this survey</p>
          </div>
          <Link
            href={`/dashboard/surveys/${surveyId}/dashboards/new`}
            className="btn-primary"
          >
            + Create Dashboard
          </Link>
        </div>

        {dashboards.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500 mb-4">No dashboards yet</p>
              <Link
                href={`/dashboard/surveys/${surveyId}/dashboards/new`}
                className="btn-primary inline-block"
              >
                Create Your First Dashboard
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboards.map(dashboard => (
              <Card key={dashboard.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{dashboard.name}</CardTitle>
                  {dashboard.description && (
                    <CardDescription>{dashboard.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">{dashboard.widgets.length}</span> widgets
                    </div>

                    {dashboard.isPublic && (
                      <div className="text-sm text-purple-600 font-medium">
                        🌐 Public
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/surveys/${surveyId}/dashboards/${dashboard.id}`}
                        className="btn-outline flex-1 text-center"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleDelete(dashboard.id)}
                        className="btn-outline text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Link
            href={`/dashboard/surveys/${surveyId}`}
            className="text-purple-600 hover:text-purple-700"
          >
            ← Back to Survey
          </Link>
        </div>
      </div>
    </div>
  )
}
