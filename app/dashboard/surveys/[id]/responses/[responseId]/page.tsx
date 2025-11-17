"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import LoadingSpinner from '@/components/LoadingSpinner'
import CommentThread from '@/components/CommentThread'
import { useUser } from '@clerk/nextjs'

type Question = {
  id: string
  question: string
  type: string
  order: number
}

type Answer = {
  id: string
  questionId: string
  answerType: string
  answerText: string | null
  answerNumber: number | null
  answerChoices: string[]
  question: Question
}

type ResponseDetail = {
  id: string
  sessionId: string
  status: string
  latitude: number | null
  longitude: number | null
  startedAt: string
  submittedAt: string | null
  ipAddress: string | null
  userAgent: string | null
  answers: Answer[]
  survey: {
    id: string
    title: string
  }
}

export default function ResponseDetailPage({
  params
}: {
  params: { id: string; responseId: string }
}) {
  const { user } = useUser()
  const [response, setResponse] = useState<ResponseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/responses/${params.responseId}`)
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to load')
        }
        const json = await res.json()
        setResponse(json)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.responseId])

  async function deleteResponse() {
    if (!confirm('Delete this response? This action cannot be undone.')) return
    try {
      const res = await fetch(`/api/responses/${params.responseId}`, { method: 'DELETE' })
      if (res.ok) {
        window.location.href = `/dashboard/surveys/${params.id}/responses`
      } else {
        const error = await res.json()
        alert(`Failed to delete: ${error.error || 'Unknown error'}`)
      }
    } catch (e: any) {
      alert(`Failed to delete: ${e.message}`)
    }
  }

  function formatAnswer(answer: Answer): string {
    switch (answer.answerType) {
      case 'text':
        return answer.answerText || ''
      case 'number':
        return answer.answerNumber?.toString() || ''
      case 'choice':
        return answer.answerText || ''
      case 'choices':
        return answer.answerChoices.join(', ')
      default:
        return answer.answerText || ''
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading response..." />
  }

  if (error || !response) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Response Detail</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error || 'Failed to load response'}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/surveys/${params.id}/responses`}>Back to Responses</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{response.survey.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">Response Detail</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/surveys/${params.id}/responses`}>Back</Link>
          </Button>
          <Button variant="destructive" onClick={deleteResponse}>
            Delete Response
          </Button>
        </div>
      </div>

      {/* Response Metadata */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <Badge variant={response.status === 'completed' ? 'default' : 'secondary'}>
              {response.status}
            </Badge>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Started At</CardDescription>
            <CardTitle className="text-lg">
              {new Date(response.startedAt).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Submitted At</CardDescription>
            <CardTitle className="text-lg">
              {response.submittedAt ? new Date(response.submittedAt).toLocaleString() : 'N/A'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Session ID:</div>
            <div className="font-mono text-xs">{response.sessionId}</div>

            <div className="text-muted-foreground">Response ID:</div>
            <div className="font-mono text-xs">{response.id}</div>

            {response.ipAddress && (
              <>
                <div className="text-muted-foreground">IP Address:</div>
                <div className="font-mono text-xs">{response.ipAddress}</div>
              </>
            )}

            {response.latitude && response.longitude && (
              <>
                <div className="text-muted-foreground">Location:</div>
                <div className="font-mono text-xs">
                  {response.latitude.toFixed(6)}, {response.longitude.toFixed(6)}
                </div>
              </>
            )}

            {response.userAgent && (
              <>
                <div className="text-muted-foreground">User Agent:</div>
                <div className="text-xs truncate">{response.userAgent}</div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Answers */}
      <Card>
        <CardHeader>
          <CardTitle>Answers</CardTitle>
          <CardDescription>
            {response.answers.length} answer{response.answers.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {response.answers
            .sort((a, b) => a.question.order - b.question.order)
            .map((answer) => (
              <div key={answer.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{answer.question.question}</p>
                      <p className="text-xs text-muted-foreground">
                        Type: {answer.question.type}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-md bg-gray-50 p-3">
                    <p className="text-sm whitespace-pre-wrap">
                      {formatAnswer(answer) || <em className="text-gray-400">No answer</em>}
                    </p>
                  </div>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>

      {/* Comments */}
      {user && (
        <CommentThread responseId={params.responseId} currentUserId={user.id} />
      )}
    </div>
  )
}
