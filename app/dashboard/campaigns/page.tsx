"use client"
import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Input } from '@/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import LoadingSpinner from '@/components/LoadingSpinner'

type Campaign = {
  id: string
  surveyId: string
  name: string
  description: string | null
  targetCount: number | null
  status: string
  createdAt: string
  updatedAt: string
  members?: any[]
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/campaigns')
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error || 'Failed to load')
        }
        const data = await res.json()
        setCampaigns(data)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      const matchesSearch = campaign.name.toLowerCase().includes(search.toLowerCase()) ||
                           (campaign.description || '').toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [campaigns, search, statusFilter])

  async function updateStatus(id: string, newStatus: string) {
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        setCampaigns((c) => c.map((campaign) => (campaign.id === id ? { ...campaign, status: newStatus } : campaign)))
      } else {
        const data = await res.json().catch(() => ({}))
        alert(`Failed to update status: ${data?.error || 'Unknown error'}`)
      }
    } catch (e: any) {
      alert(`Failed to update status: ${e.message}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize team-based survey collection efforts
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/campaigns/new">New Campaign</Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {loading ? (
        <LoadingSpinner message="Loading campaigns..." />
      ) : (
        <>
          <div className="flex gap-4">
            <Input
              placeholder="Search campaigns..."
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
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredCampaigns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8">
                <p className="text-gray-600">
                  {campaigns.length === 0 ? 'No campaigns yet. Create one to get started.' : 'No campaigns match your filters.'}
                </p>
                {campaigns.length === 0 && (
                  <Button className="mt-4" asChild>
                    <Link href="/dashboard/campaigns/new">Create Campaign</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCampaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <CardTitle className="text-lg">{campaign.name}</CardTitle>
                        {campaign.description && (
                          <CardDescription className="line-clamp-2">{campaign.description}</CardDescription>
                        )}
                      </div>
                      <Select value={campaign.status} onValueChange={(value) => updateStatus(campaign.id, value)}>
                        <SelectTrigger className="w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      {campaign.targetCount && (
                        <div>
                          Target: <span className="font-medium">{campaign.targetCount}</span> responses
                        </div>
                      )}
                      {campaign.members && (
                        <div>
                          <span className="font-medium">{campaign.members.length}</span> member{campaign.members.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created {new Date(campaign.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/campaigns/${campaign.id}`}>View Details</Link>
                      </Button>
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
