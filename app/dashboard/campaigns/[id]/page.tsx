"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import LoadingSpinner from '@/components/LoadingSpinner'

type CampaignMember = {
  id: string
  userId: string
  role: string
  status: string
  joinedAt: string | null
  user: {
    email: string
    name: string | null
  }
}

type CampaignDetail = {
  id: string
  surveyId: string
  name: string
  description: string | null
  targetCount: number | null
  status: string
  createdAt: string
  updatedAt: string
  members: CampaignMember[]
}

type Stats = {
  responses: number
}

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [campaignRes, statsRes] = await Promise.all([
          fetch(`/api/campaigns/${params.id}`),
          fetch(`/api/campaigns/${params.id}/stats`)
        ])

        if (!campaignRes.ok) {
          const err = await campaignRes.json()
          throw new Error(err.error || 'Failed to load campaign')
        }

        const campaignData = await campaignRes.json()
        const statsData = statsRes.ok ? await statsRes.json() : { responses: 0 }

        setCampaign(campaignData)
        setStats(statsData)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  async function updateStatus(newStatus: string) {
    if (!campaign) return
    try {
      const res = await fetch(`/api/campaigns/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        setCampaign({ ...campaign, status: newStatus })
      } else {
        const data = await res.json()
        alert(`Failed to update status: ${data.error || 'Unknown error'}`)
      }
    } catch (e: any) {
      alert(`Failed to update status: ${e.message}`)
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading campaign..." />
  }

  if (error || !campaign) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Campaign</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error || 'Failed to load campaign'}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/campaigns">Back to Campaigns</Link>
        </Button>
      </div>
    )
  }

  const completionRate = campaign.targetCount && stats
    ? Math.min(100, Math.round((stats.responses / campaign.targetCount) * 100))
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
          {campaign.description && (
            <p className="text-muted-foreground">{campaign.description}</p>
          )}
        </div>
        <Select value={campaign.status} onValueChange={updateStatus}>
          <SelectTrigger className="w-[130px]">
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

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Responses</CardDescription>
            <CardTitle className="text-3xl">{stats?.responses || 0}</CardTitle>
          </CardHeader>
          {campaign.targetCount && (
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Target: {campaign.targetCount}
              </p>
            </CardContent>
          )}
        </Card>

        {completionRate !== null && (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Progress</CardDescription>
              <CardTitle className="text-3xl">{completionRate}%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-600"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Team Members</CardDescription>
            <CardTitle className="text-3xl">{campaign.members.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href={`/dashboard/surveys/${campaign.surveyId}/responses`}>
            View Responses
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/campaigns/${campaign.id}/members`}>
            Manage Members
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/campaigns/${campaign.id}/territories`}>
            Manage Territories
          </Link>
        </Button>
      </div>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {campaign.members.length} member{campaign.members.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campaign.members.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">
                No team members yet
              </p>
              <Button asChild>
                <Link href={`/dashboard/campaigns/${campaign.id}/members`}>
                  Invite Members
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {campaign.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {member.user.name || member.user.email}
                    </p>
                    {member.user.name && (
                      <p className="text-sm text-muted-foreground">
                        {member.user.email}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                      {member.role}
                    </Badge>
                    <Badge variant="secondary">
                      {member.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign Info */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Campaign ID:</div>
            <div className="font-mono text-xs">{campaign.id}</div>

            <div className="text-muted-foreground">Survey ID:</div>
            <div className="font-mono text-xs">{campaign.surveyId}</div>

            <div className="text-muted-foreground">Created:</div>
            <div>{new Date(campaign.createdAt).toLocaleString()}</div>

            <div className="text-muted-foreground">Last Updated:</div>
            <div>{new Date(campaign.updatedAt).toLocaleString()}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
