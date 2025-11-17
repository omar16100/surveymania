"use client"
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'
import Link from 'next/link'
import WordCloud from '@/components/WordCloud'
import { processTextForWordCloud, calculateTextStatistics } from '@/lib/text-processing'

type QuestionAnalytics = {
  id: string
  type: string
  question: string
  order: number
  responseCount: number
  distribution?: Record<string, number>
  average?: number
  min?: number
  max?: number
  textResponses?: string[]
}

type TimeSeriesPoint = {
  date: string
  count: number
}

type AnalyticsData = {
  survey: {
    id: string
    title: string
    description: string
  }
  metrics: {
    totalResponses: number
    completedResponses: number
    completionRate: number
    averageTimeSeconds?: number
    responsesWithLocation: number
  }
  questions: QuestionAnalytics[]
  timeSeries: TimeSeriesPoint[]
}

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#30cfd0']

export default function AnalyticsPage() {
  const params = useParams()
  const surveyId = params.id as string
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d')

  useEffect(() => {
    loadAnalytics()
  }, [surveyId, timeRange])

  async function loadAnalytics() {
    try {
      const res = await fetch(`/api/surveys/${surveyId}/analytics?range=${timeRange}`)
      if (!res.ok) throw new Error('Failed to load analytics')
      const result = await res.json()
      setData(result)
    } catch (error) {
      console.error('Analytics error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading analytics..." />
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">Failed to load analytics</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{data.survey.title}</h1>
          <p className="text-gray-600 text-sm mt-1">Analytics & Insights</p>
        </div>
        <div className="flex gap-2">
          <select
            className="border rounded px-3 py-2 text-sm"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All time</option>
          </select>
          <Link href={`/dashboard/surveys/${surveyId}/responses`}>
            <button className="border rounded px-4 py-2 hover:bg-gray-50 text-sm">
              View Responses
            </button>
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Total Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.metrics.totalResponses}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.metrics.completionRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-1">
              {data.metrics.completedResponses} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Avg. Completion Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {data.metrics.averageTimeSeconds
                ? `${Math.round(data.metrics.averageTimeSeconds / 60)}m`
                : 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">With Location</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.metrics.responsesWithLocation}</p>
            <p className="text-xs text-gray-500 mt-1">
              {data.metrics.totalResponses > 0
                ? `${((data.metrics.responsesWithLocation / data.metrics.totalResponses) * 100).toFixed(1)}%`
                : '0%'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Response Trend */}
      {data.timeSeries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Response Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.timeSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#667eea" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Question Analytics */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Question Analytics</h2>
        {data.questions.map((q, idx) => (
          <Card key={q.id}>
            <CardHeader>
              <CardTitle className="text-lg">
                Q{q.order + 1}: {q.question}
              </CardTitle>
              <p className="text-sm text-gray-600">
                {q.responseCount} responses • {q.type}
              </p>
            </CardHeader>
            <CardContent>
              {/* Choice Distribution */}
              {q.distribution && Object.keys(q.distribution).length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={Object.entries(q.distribution).map(([name, value]) => ({
                            name,
                            value
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.keys(q.distribution).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={Object.entries(q.distribution).map(([name, value]) => ({
                          name,
                          value
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#667eea" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Numeric Stats */}
              {q.average !== undefined && (
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center p-4 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">Average</p>
                    <p className="text-2xl font-bold">{q.average.toFixed(2)}</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">Minimum</p>
                    <p className="text-2xl font-bold">{q.min}</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">Maximum</p>
                    <p className="text-2xl font-bold">{q.max}</p>
                  </div>
                </div>
              )}

              {/* Word Cloud for Text Questions */}
              {q.textResponses && q.textResponses.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <WordCloud
                      words={processTextForWordCloud(q.textResponses, { maxWords: 50 })}
                      width={700}
                      height={400}
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                    {(() => {
                      const stats = calculateTextStatistics(q.textResponses)
                      return (
                        <>
                          <div className="text-center p-3 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600">Total Responses</p>
                            <p className="text-xl font-bold">{stats.totalResponses}</p>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600">Total Words</p>
                            <p className="text-xl font-bold">{stats.totalWords}</p>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600">Unique Words</p>
                            <p className="text-xl font-bold">{stats.uniqueWords}</p>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600">Avg Words</p>
                            <p className="text-xl font-bold">{stats.averageWordCount}</p>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600">Most Common</p>
                            <p className="text-xl font-bold truncate" title={stats.mostFrequentWord?.text}>
                              {stats.mostFrequentWord?.text || '-'}
                            </p>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
              )}

              {/* No data */}
              {!q.distribution && q.average === undefined && !q.textResponses && (
                <p className="text-gray-500 text-sm">
                  No analytics available for this question type
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {data.questions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">No questions in this survey yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
