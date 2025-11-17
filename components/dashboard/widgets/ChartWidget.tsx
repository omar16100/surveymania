'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts'
import { useSurveySSE } from '@/hooks/useSSE'

interface ChartWidgetProps {
  surveyId: string
  config: {
    chartType: 'line' | 'bar' | 'pie'
    dataSource: 'timeSeries' | 'question_distribution'
    questionId?: string
    timeRange?: '7d' | '30d' | 'all'
    title?: string
  }
}

const COLORS = ['#673ab7', '#9c27b0', '#e91e63', '#f44336', '#ff5722', '#ff9800']

export default function ChartWidget({ surveyId, config }: ChartWidgetProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Real-time updates via SSE
  useSurveySSE(
    surveyId,
    () => {
      // Refetch when new response arrives
      fetchChartData()
    },
    undefined,
    true
  )

  useEffect(() => {
    fetchChartData()
  }, [surveyId, config.dataSource, config.questionId, config.timeRange])

  async function fetchChartData() {
    try {
      setLoading(true)
      const range = config.timeRange || '7d'
      const res = await fetch(`/api/surveys/${surveyId}/analytics?range=${range}`)

      if (!res.ok) throw new Error('Failed to fetch analytics')

      const analytics = await res.json()
      const chartData = extractChartData(analytics)

      setData(chartData)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function extractChartData(analytics: any): any[] {
    if (config.dataSource === 'timeSeries') {
      return analytics.timeSeries || []
    }

    if (config.dataSource === 'question_distribution' && config.questionId) {
      const question = analytics.questions?.find((q: any) => q.id === config.questionId)
      if (question?.distribution) {
        return Object.entries(question.distribution).map(([label, value]) => ({
          name: label,
          value
        }))
      }
    }

    return []
  }

  function renderChart() {
    switch (config.chartType) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="count" stroke="#673ab7" strokeWidth={2} />
          </LineChart>
        )

      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.dataSource === 'timeSeries' ? 'date' : 'name'} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={config.dataSource === 'timeSeries' ? 'count' : 'value'} fill="#673ab7" />
          </BarChart>
        )

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => entry.name}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        )

      default:
        return null
    }
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Loading Chart...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-full bg-gray-200 animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-red-600">
            Chart Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data.length) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {config.title || 'Chart'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {config.title || `${config.chartType.charAt(0).toUpperCase() + config.chartType.slice(1)} Chart`}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)]">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
