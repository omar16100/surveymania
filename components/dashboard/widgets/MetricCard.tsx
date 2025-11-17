'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { useSurveySSE } from '@/hooks/useSSE'

interface MetricCardProps {
  surveyId: string
  config: {
    metric: 'total_responses' | 'completion_rate' | 'avg_time' | 'location_count'
    timeRange?: '7d' | '30d' | 'all'
    showTrend?: boolean
    title?: string
  }
}

interface MetricData {
  value: string
  label: string
  trend?: string
}

export default function MetricCard({ surveyId, config }: MetricCardProps) {
  const [data, setData] = useState<MetricData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Real-time updates via SSE
  useSurveySSE(
    surveyId,
    () => {
      // Refetch when new response arrives
      fetchMetricData()
    },
    undefined,
    true
  )

  useEffect(() => {
    fetchMetricData()
  }, [surveyId, config.metric, config.timeRange])

  async function fetchMetricData() {
    try {
      setLoading(true)
      const range = config.timeRange || '7d'
      const res = await fetch(`/api/surveys/${surveyId}/analytics?range=${range}`)

      if (!res.ok) throw new Error('Failed to fetch analytics')

      const analytics = await res.json()
      const metricData = extractMetric(analytics, config.metric)

      setData(metricData)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function extractMetric(analytics: any, metric: string): MetricData {
    const { metrics } = analytics

    switch (metric) {
      case 'total_responses':
        return {
          value: metrics?.total?.toString() || '0',
          label: 'Total Responses'
        }
      case 'completion_rate':
        return {
          value: `${metrics?.completionRate?.toFixed(1) || '0'}%`,
          label: 'Completion Rate'
        }
      case 'avg_time':
        const avgTime = metrics?.avgCompletionTime || 0
        const minutes = Math.floor(avgTime / 60)
        const seconds = Math.floor(avgTime % 60)
        return {
          value: `${minutes}m ${seconds}s`,
          label: 'Avg Completion Time'
        }
      case 'location_count':
        return {
          value: metrics?.responsesWithLocation?.toString() || '0',
          label: 'Responses with Location'
        }
      default:
        return { value: '0', label: 'Unknown Metric' }
    }
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">
            Loading...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-12 bg-gray-200 animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-red-600">
            Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-gray-600">
          {config.title || data.label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-gray-900">
          {data.value}
        </div>
        {config.showTrend && data.trend && (
          <p className="text-sm text-gray-500 mt-2">{data.trend}</p>
        )}
      </CardContent>
    </Card>
  )
}
