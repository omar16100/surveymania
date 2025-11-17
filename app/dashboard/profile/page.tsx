"use client"
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import LoadingSpinner from '@/components/LoadingSpinner'

type Organization = {
  id: string
  slug: string
  name: string
  ownerId: string
}

type UserData = {
  id: string
  email: string
  name: string | null
  organizationId: string | null
  organization: Organization | null
  createdAt: string
}

export default function ProfilePage() {
  const { user, isLoaded } = useUser()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!isLoaded) return
      setLoading(true)
      try {
        const res = await fetch('/api/user/me')
        if (res.ok) {
          const data = await res.json()
          setUserData(data)
        }
      } catch (e) {
        console.error('Failed to load user data:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isLoaded])

  if (!isLoaded || loading) {
    return <LoadingSpinner message="Loading profile..." />
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-gray-600">Not signed in</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Profile</h1>
        <Button variant="outline" onClick={() => window.open('https://clerk.com/docs', '_blank')}>
          Manage Account
        </Button>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your personal account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="text-sm">{user.fullName || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-sm">{user.primaryEmailAddress?.emailAddress || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">User ID</p>
              <p className="text-sm font-mono text-xs">{user.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Account Created</p>
              <p className="text-sm">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organization Info */}
      {userData?.organization && (
        <Card>
          <CardHeader>
            <CardTitle>Current Organization</CardTitle>
            <CardDescription>Your active organization workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Organization Name</p>
                <p className="text-sm">{userData.organization.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Slug</p>
                <p className="text-sm font-mono">{userData.organization.slug}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Organization ID</p>
                <p className="text-sm font-mono text-xs">{userData.organization.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Role</p>
                <p className="text-sm">
                  {userData.organization.ownerId === userData.id ? 'Owner' : 'Member'}
                </p>
              </div>
            </div>
            <Button variant="outline" asChild>
              <a href="/dashboard/org">Manage Organization</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {!userData?.organization && (
        <Card>
          <CardHeader>
            <CardTitle>No Organization</CardTitle>
            <CardDescription>You are not part of any organization yet</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/dashboard/org">Create or Join Organization</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>Your activity overview</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Activity statistics will be available in a future update
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
