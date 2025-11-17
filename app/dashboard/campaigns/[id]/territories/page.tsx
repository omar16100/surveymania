'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import TerritoryAssigner from '@/components/TerritoryAssigner'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Button } from '@/components/ui'

type CampaignMember = {
  id: string
  userId: string
  user: {
    clerkId: string
    firstName: string
    lastName: string
    email: string
    avatar: string
  }
  role: string
}

type Campaign = {
  id: string
  name: string
  surveyId: string
}

export default function CampaignTerritoriesPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [members, setMembers] = useState<CampaignMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCampaignData()
  }, [campaignId])

  async function loadCampaignData() {
    try {
      const [campaignRes, membersRes] = await Promise.all([
        fetch(`/api/campaigns/${campaignId}`),
        fetch(`/api/campaigns/${campaignId}/members`)
      ])

      if (!campaignRes.ok) {
        throw new Error('Failed to load campaign')
      }

      const campaignData = await campaignRes.json()
      const membersData = membersRes.ok ? await membersRes.json() : { members: [] }

      setCampaign({
        id: campaignData.id,
        name: campaignData.name,
        surveyId: campaignData.surveyId
      })
      setMembers(membersData.members || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading territories..." />
  }

  if (error || !campaign) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Territory Management</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error || 'Failed to load campaign'}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/campaigns/${campaignId}`}>Back to Campaign</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Territory Management</h1>
          <p className="text-gray-600 mt-1">{campaign.name}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/campaigns/${campaignId}`}>
            Back to Campaign
          </Link>
        </Button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How to use Territory Management</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Draw territories on the map using the polygon or rectangle tool (top-right)</li>
          <li>• Click on a territory to edit its details or reassign it</li>
          <li>• Assign territories to team members to track coverage areas</li>
          <li>• Edit territories by using the edit tool, then click the polygon to modify</li>
        </ul>
      </div>

      {/* Territory Assigner */}
      <TerritoryAssigner
        campaignId={campaignId}
        members={members}
        onTerritoryCreated={() => {
          // Optionally refresh data or show notification
        }}
        onTerritoryUpdated={() => {
          // Optionally refresh data or show notification
        }}
        onTerritoryDeleted={() => {
          // Optionally refresh data or show notification
        }}
      />
    </div>
  )
}
