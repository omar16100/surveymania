"use client"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import LoadingSpinner from '@/components/LoadingSpinner'

type Survey = {
  id: string
  title: string
  status: string
}

export default function NewCampaignPage() {
  const router = useRouter()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [surveyId, setSurveyId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [targetCount, setTargetCount] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/surveys')
        if (res.ok) {
          const data = await res.json()
          setSurveys(data.filter((s: Survey) => s.status === 'active'))
        }
      } catch (e) {
        console.error('Failed to load surveys:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!surveyId || !name) {
      alert('Survey and name are required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId,
          name,
          description: description || undefined,
          targetCount: targetCount ? parseInt(targetCount) : undefined,
          settings: {}
        })
      })

      if (res.ok) {
        const campaign = await res.json()
        router.push(`/dashboard/campaigns/${campaign.id}`)
      } else {
        const error = await res.json()
        alert(`Failed to create campaign: ${error.error || 'Unknown error'}`)
      }
    } catch (e: any) {
      alert(`Failed to create campaign: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading..." />
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Campaign</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set up a new campaign for team-based survey collection
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
            <CardDescription>
              Basic information about your campaign
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="survey" className="text-sm font-medium">
                Survey <span className="text-red-500">*</span>
              </label>
              <Select value={surveyId} onValueChange={setSurveyId} required>
                <SelectTrigger id="survey">
                  <SelectValue placeholder="Select a survey" />
                </SelectTrigger>
                <SelectContent>
                  {surveys.length === 0 ? (
                    <SelectItem value="" disabled>
                      No active surveys available
                    </SelectItem>
                  ) : (
                    surveys.map((survey) => (
                      <SelectItem key={survey.id} value={survey.id}>
                        {survey.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {surveys.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  You need at least one active survey to create a campaign
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Campaign Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="name"
                placeholder="e.g., Q4 Customer Satisfaction"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="description"
                className="input min-h-[100px] w-full"
                placeholder="Describe the goal and scope of this campaign..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="targetCount" className="text-sm font-medium">
                Target Response Count
              </label>
              <Input
                id="targetCount"
                type="number"
                min="1"
                placeholder="e.g., 500"
                value={targetCount}
                onChange={(e) => setTargetCount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Optional: Set a goal for number of responses to collect
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={saving || !surveyId || !name || surveys.length === 0}>
                {saving ? 'Creating...' : 'Create Campaign'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
