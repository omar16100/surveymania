"use client"
import { useEffect, useState } from 'react'
import { Button, Badge, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { showToast } from '@/components/Toast'

type Member = { id: string; role: 'admin'|'member'|'viewer'; user: { clerkId: string; email: string; firstName: string; lastName: string } }
type Org = { id: string; name: string }
type Invite = {
  id: string
  email: string
  role: 'admin' | 'member' | 'viewer'
  status: string
  expiresAt: string
  createdAt: string
  invitedBy: {
    firstName: string
    lastName: string
  }
}

export default function OrgMembersPage() {
  const [org, setOrg] = useState<Org | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Member['role']>('member')
  const [inviting, setInviting] = useState(false)

  async function load() {
    const cur = await (await fetch('/api/organizations/current')).json()
    setOrg(cur.organization)
    if (cur.organization?.id) {
      const list = await (await fetch(`/api/organizations/${cur.organization.id}/members`)).json()
      setMembers(list)

      // Load invites
      const inviteRes = await fetch(`/api/organizations/${cur.organization.id}/invites`)
      if (inviteRes.ok) {
        const inviteData = await inviteRes.json()
        setInvites(inviteData.invites || [])
      }
    }
  }

  useEffect(() => { load() }, [])

  async function sendInvite() {
    if (!org || !email) return

    setInviting(true)
    try {
      const res = await fetch(`/api/organizations/${org.id}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to send invite')
      }

      showToast('Invitation sent!', 'success')
      setEmail('')
      await load()
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setInviting(false)
    }
  }

  async function setMemberRole(id: string, newRole: Member['role']) {
    if (!org) return
    await fetch(`/api/organizations/${org.id}/members/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: newRole }) })
    await load()
  }

  async function removeMember(id: string) {
    if (!org) return
    if (!confirm('Remove this member?')) return
    await fetch(`/api/organizations/${org.id}/members/${id}`, { method: 'DELETE' })
    await load()
  }

  async function revokeInvite(id: string) {
    if (!confirm('Revoke this invitation?')) return
    try {
      const res = await fetch(`/api/invites/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to revoke invite')
      showToast('Invitation revoked', 'success')
      await load()
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Team Members</h1>
        <p className="text-gray-600 text-sm mt-1">{org ? org.name : 'Loading…'}</p>
      </div>

      {/* Invite Form */}
      <Card>
        <CardHeader>
          <CardTitle>Invite New Member</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 max-w-lg">
            <input
              type="email"
              className="border rounded px-3 py-2"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select
              className="border rounded px-3 py-2"
              value={role}
              onChange={(e) => setRole(e.target.value as Member['role'])}
            >
              <option value="viewer">Viewer - Read-only access</option>
              <option value="member">Member - Can create and edit</option>
              <option value="admin">Admin - Full access</option>
            </select>
            <Button onClick={sendInvite} disabled={!email || !org || inviting}>
              {inviting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invites.filter(i => i.status === 'pending').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations ({invites.filter(i => i.status === 'pending').length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="p-3">Email</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Invited By</th>
                    <th className="p-3">Expires</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.filter(i => i.status === 'pending').map((invite) => (
                    <tr key={invite.id} className="border-b">
                      <td className="p-3">{invite.email}</td>
                      <td className="p-3">
                        <Badge variant="outline">{invite.role}</Badge>
                      </td>
                      <td className="p-3">{invite.invitedBy.firstName} {invite.invitedBy.lastName}</td>
                      <td className="p-3 text-sm text-gray-600">
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => revokeInvite(invite.id)}
                        >
                          Revoke
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Members */}
      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b">
                    <td className="p-3">{m.user.firstName} {m.user.lastName}</td>
                    <td className="p-3 text-gray-600">{m.user.email}</td>
                    <td className="p-3">
                      <select
                        className="border rounded px-2 py-1 text-sm"
                        value={m.role}
                        onChange={(e) => setMemberRole(m.id, e.target.value as Member['role'])}
                      >
                        <option value="viewer">Viewer</option>
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeMember(m.id)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

