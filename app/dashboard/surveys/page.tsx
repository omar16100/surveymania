"use client"
import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Input } from '@/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import LoadingSpinner from '@/components/LoadingSpinner'

type Survey = {
  id: string
  title: string
  description: string
  status: string
  createdAt: string
  publishedAt: string | null
  _count: {
    questions: number
    responses: number
  }
}

export default function SurveysPage() {
  const [rows, setRows] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/surveys')
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error || 'Failed to load')
        }
        const data = await res.json()
        setRows(data)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filteredSurveys = useMemo(() => {
    return rows.filter(survey => {
      const matchesSearch = survey.title.toLowerCase().includes(search.toLowerCase()) ||
                           survey.description.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || survey.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [rows, search, statusFilter])

  async function updateStatus(id: string, newStatus: string) {
    try {
      const res = await fetch(`/api/surveys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        setRows((s) => s.map((r) => (r.id === id ? { ...r, status: newStatus } as Survey : r)))
      } else {
        const data = await res.json().catch(() => ({}))
        alert(`Failed to update status: ${data?.error || 'Unknown error'}`)
      }
    } catch (e: any) {
      alert(`Failed to update status: ${e.message}`)
    }
  }

  async function duplicate(id: string) {
    try {
      const dupRes = await fetch(`/api/surveys/${id}/duplicate`, { method: 'POST' })
      if (!dupRes.ok) {
        const data = await dupRes.json().catch(() => ({}))
        alert(`Failed to duplicate: ${data?.error || 'Unknown error'}`)
        return
      }
      const res = await fetch('/api/surveys')
      if (res.ok) {
        setRows(await res.json())
      }
    } catch (e: any) {
      alert(`Failed to duplicate: ${e.message}`)
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this survey?')) return
    await fetch(`/api/surveys/${id}`, { method: 'DELETE' })
    setRows((s) => s.filter((r) => r.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Surveys</h1>
        <Button asChild>
          <Link href="/dashboard/surveys/new">New Survey</Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {loading ? (
        <LoadingSpinner message="Loading surveys..." />
      ) : (
        <>
          <div className="flex gap-4">
            <Input
              placeholder="Search surveys..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredSurveys.length === 0 ? (
            <p className="text-gray-600">
              {rows.length === 0 ? 'No surveys yet. Create one to get started.' : 'No surveys match your filters.'}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSurveys.map((survey) => (
                <Card key={survey.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <CardTitle className="text-lg">{survey.title}</CardTitle>
                        {survey.description && (
                          <CardDescription className="line-clamp-2">{survey.description}</CardDescription>
                        )}
                      </div>
                      <Select value={survey.status} onValueChange={(value) => updateStatus(survey.id, value)}>
                        <SelectTrigger className="w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">{survey._count.questions}</span> questions
                      </div>
                      <div>
                        <span className="font-medium">{survey._count.responses}</span> responses
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created {new Date(survey.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild className="flex-1">
                          <Link href={`/dashboard/surveys/${survey.id}/preview`}>Preview</Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild className="flex-1">
                          <Link href={`/s/${survey.id}`}>View</Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild className="flex-1">
                          <Link href={`/dashboard/surveys/${survey.id}/responses`}>Responses</Link>
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild className="flex-1">
                          <Link href={`/dashboard/surveys/${survey.id}/analytics`}>Analytics</Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild className="flex-1">
                          <Link href={`/dashboard/surveys/${survey.id}/share`}>Share</Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild className="flex-1">
                          <Link href={`/dashboard/surveys/${survey.id}/map`}>Map</Link>
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="destructive" size="sm" onClick={() => remove(survey.id)} className="flex-1">
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
