"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SignedIn, SignedOut, SignInButton, useUser } from '@clerk/nextjs'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from '@/components/ui'
import LoadingSpinner from '@/components/LoadingSpinner'
import { showToast } from '@/components/Toast'

type InviteDetails = {
  id: string
  email: string
  role: string
  status: string
  expiresAt: string
  organization: {
    id: string
    name: string
  }
  invitedBy: {
    firstName: string
    lastName: string
  }
  createdAt: string
}

export default function InviteAcceptPage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadInvite()
  }, [params.token])

  async function loadInvite() {
    try {
      const res = await fetch(`/api/invites/accept/${params.token}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to load invite')
      }
      const data = await res.json()
      setInvite(data.invite)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAccept() {
    if (!user) return

    setAccepting(true)
    try {
      const res = await fetch(`/api/invites/accept/${params.token}`, {
        method: 'POST'
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to accept invite')
      }

      const data = await res.json()
      showToast(`Joined ${data.organization.name}!`, 'success')

      // Redirect to organization dashboard
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    } catch (e: any) {
      showToast(e.message, 'error')
      setError(e.message)
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading invitation..." />
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
            <CardDescription>
              {error || 'This invitation link is invalid or has expired.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push('/')}>
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (invite.status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-yellow-600">Invitation Expired</CardTitle>
            <CardDescription>
              This invitation has expired. Please ask {invite.invitedBy.firstName} {invite.invitedBy.lastName} to send a new invitation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Organization:</strong> {invite.organization.name}</p>
              <p><strong>Invited by:</strong> {invite.invitedBy.firstName} {invite.invitedBy.lastName}</p>
              <p><strong>Expired:</strong> {new Date(invite.expiresAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (invite.status === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-green-600">Already Accepted</CardTitle>
            <CardDescription>
              This invitation has already been accepted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (invite.status === 'revoked') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Invitation Revoked</CardTitle>
            <CardDescription>
              This invitation has been cancelled.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Email mismatch check (only when user is loaded)
  if (isLoaded && user && user.primaryEmailAddress?.emailAddress !== invite.email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-yellow-600">Email Mismatch</CardTitle>
            <CardDescription>
              This invitation was sent to <strong>{invite.email}</strong>, but you're signed in as <strong>{user.primaryEmailAddress?.emailAddress}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Please sign in with the email address that received the invitation, or ask for a new invitation to your current email.
            </p>
            <Button variant="outline" onClick={() => router.push('/sign-out')}>
              Sign Out and Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          <CardTitle>You're Invited!</CardTitle>
          <CardDescription>
            {invite.invitedBy.firstName} {invite.invitedBy.lastName} has invited you to join
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900">{invite.organization.name}</h3>
            <Badge className="mt-2">{invite.role}</Badge>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium">{invite.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Role:</span>
              <span className="font-medium capitalize">{invite.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Expires:</span>
              <span className="font-medium">{new Date(invite.expiresAt).toLocaleDateString()}</span>
            </div>
          </div>

          <SignedOut>
            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                Sign in to accept this invitation
              </p>
              <SignInButton mode="modal">
                <Button className="w-full" size="lg">
                  Sign In to Accept
                </Button>
              </SignInButton>
            </div>
          </SignedOut>

          <SignedIn>
            <Button
              className="w-full"
              size="lg"
              onClick={handleAccept}
              disabled={accepting}
            >
              {accepting ? 'Accepting...' : 'Accept Invitation'}
            </Button>
          </SignedIn>

          <p className="text-xs text-gray-500 text-center">
            By accepting, you'll be able to collaborate on surveys and campaigns within this organization.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
