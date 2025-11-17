"use client"
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Input } from '@/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import LoadingSpinner from '@/components/LoadingSpinner'

type CampaignMember = {
  id: string
  userId: string
  role: string
  status: string
  invitedAt: string
  joinedAt: string | null
  user: {
    email: string
    name: string | null
  }
}

type Campaign = {
  id: string
  name: string
  members: CampaignMember[]
}

export default function CampaignMembersPage({ params }: { params: { id: string } }) {
  const { user } = useUser()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<string>('collector')
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    loadCampaign()
  }, [params.id])

  async function loadCampaign() {
    setLoading(true)
    try {
      const res = await fetch(`/api/campaigns/${params.id}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to load')
      }
      const data = await res.json()
      setCampaign(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function inviteMember(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail || !user) return

    setInviting(true)
    try {
      // For now, use email as userId (in real app, would search for user by email)
      const res = await fetch(`/api/campaigns/${params.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: inviteEmail, // In production, resolve email to userId
          role: inviteRole,
          invitedBy: user.id,
          permissions: {}
        })
      })

      if (res.ok) {
        setInviteEmail('')
        setInviteRole('collector')
        await loadCampaign()
      } else {
        const err = await res.json()
        alert(`Failed to invite: ${err.error || 'Unknown error'}`)
      }
    } catch (e: any) {
      alert(`Failed to invite: ${e.message}`)
    } finally {
      setInviting(false)
    }
  }

  async function updateRole(memberId: string, newRole: string) {
    try {
      const res = await fetch(`/api/campaigns/${params.id}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })

      if (res.ok) {
        setCampaign(prev => prev ? {
          ...prev,
          members: prev.members.map(m => m.id === memberId ? { ...m, role: newRole } : m)
        } : null)
      } else {
        const err = await res.json()
        alert(`Failed to update role: ${err.error || 'Unknown error'}`)
      }
    } catch (e: any) {
      alert(`Failed to update role: ${e.message}`)
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm('Remove this member from the campaign?')) return

    try {
      const res = await fetch(`/api/campaigns/${params.id}/members/${memberId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setCampaign(prev => prev ? {
          ...prev,
          members: prev.members.filter(m => m.id !== memberId)
        } : null)
      } else {
        const err = await res.json()
        alert(`Failed to remove member: ${err.error || 'Unknown error'}`)
      }
    } catch (e: any) {
      alert(`Failed to remove member: ${e.message}`)
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading members..." />
  }

  if (error || !campaign) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Campaign Members</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error || 'Failed to load campaign'}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/campaigns/${params.id}`}>Back to Campaign</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Members</h1>
          <p className="text-sm text-muted-foreground mt-1">{campaign.name}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/campaigns/${params.id}`}>Back to Campaign</Link>
        </Button>
      </div>

      {/* Invite Form */}
      <Card>
        <CardHeader>
          <CardTitle>Invite Member</CardTitle>
          <CardDescription>
            Add team members to this campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={inviteMember} className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1"
                required
              />
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="collector">Collector</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={inviting || !inviteEmail}>
                {inviting ? 'Inviting...' : 'Invite'}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Admin:</strong> Full control over campaign</p>
              <p><strong>Collector:</strong> Can submit responses</p>
              <p><strong>Viewer:</strong> Read-only access</p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Current Members</CardTitle>
          <CardDescription>
            {campaign.members.length} member{campaign.members.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campaign.members.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No members yet. Invite team members above to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {campaign.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {member.user.name || member.user.email}
                    </p>
                    {member.user.name && (
                      <p className="text-sm text-muted-foreground">
                        {member.user.email}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {member.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        Invited {new Date(member.invitedAt).toLocaleDateString()}
                      </p>
                      {member.joinedAt && (
                        <p className="text-xs text-muted-foreground">
                          • Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={member.role}
                      onValueChange={(value) => updateRole(member.id, value)}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="collector">Collector</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeMember(member.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
