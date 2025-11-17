'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { useSurveySSE } from '@/hooks/useSSE'

interface TableWidgetProps {
  surveyId: string
  config: {
    columns?: string[] // question IDs to display
    pageSize?: number
    title?: string
  }
}

export default function TableWidget({ surveyId, config }: TableWidgetProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Real-time updates via SSE
  useSurveySSE(
    surveyId,
    () => {
      // Refetch when new response arrives
      fetchTableData()
    },
    undefined,
    true
  )

  useEffect(() => {
    fetchTableData()
  }, [surveyId])

  async function fetchTableData() {
    try {
      setLoading(true)
      const res = await fetch(`/api/surveys/${surveyId}/responses`)

      if (!res.ok) throw new Error('Failed to fetch responses')

      const responseData = await res.json()
      setData(responseData)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function formatAnswer(answer: any): string {
    if (answer.answerText) return answer.answerText
    if (answer.answerNumber !== null) return answer.answerNumber.toString()
    if (answer.answerChoices && answer.answerChoices.length > 0) {
      return Array.isArray(answer.answerChoices)
        ? answer.answerChoices.join(', ')
        : answer.answerChoices
    }
    return '-'
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Loading Table...
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
            Table Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data || !data.responses || data.responses.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {config.title || 'Response Table'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No responses yet</p>
        </CardContent>
      </Card>
    )
  }

  const pageSize = config.pageSize || 10
  const displayedResponses = data.responses.slice(0, pageSize)
  const questions = data.survey?.questions || []

  // Filter questions if columns specified
  const displayedQuestions = config.columns && config.columns.length > 0
    ? questions.filter((q: any) => config.columns!.includes(q.id))
    : questions.slice(0, 3) // Show first 3 questions by default

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {config.title || `Response Table (${data.responses.length} total)`}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-auto" style={{ maxHeight: 'calc(100% - 4rem)' }}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-700">
                Submitted
              </th>
              {displayedQuestions.map((q: any) => (
                <th key={q.id} className="px-3 py-2 text-left font-medium text-gray-700">
                  {q.question}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {displayedResponses.map((response: any) => (
              <tr key={response.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                  {response.submittedAt
                    ? new Date(response.submittedAt).toLocaleDateString()
                    : '-'}
                </td>
                {displayedQuestions.map((q: any) => {
                  const answer = response.answers?.find((a: any) => a.questionId === q.id)
                  return (
                    <td key={q.id} className="px-3 py-2 text-gray-900">
                      {answer ? formatAnswer(answer) : '-'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
