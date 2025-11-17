"use client"
import { useState } from 'react'
import ResponseMap from '@/components/ResponseMap'
import { Card, CardContent } from '@/components/ui'
import Link from 'next/link'

export default function MapPage({ params }: { params: { id: string } }) {
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [showClusters, setShowClusters] = useState(true)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Response Map</h1>
          <p className="text-gray-600 text-sm mt-1">Visualize survey responses by location</p>
        </div>
        <Link href={`/dashboard/surveys/${params.id}/responses`}>
          <button className="border rounded px-4 py-2 hover:bg-gray-50 text-sm">
            View Responses
          </button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showClusters}
                onChange={(e) => setShowClusters(e.target.checked)}
                className="rounded"
              />
              <span>Cluster markers</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={(e) => setShowHeatmap(e.target.checked)}
                className="rounded"
              />
              <span>Show heat map</span>
            </label>
          </div>

          <ResponseMap
            surveyId={params.id}
            showHeatmap={showHeatmap}
            showClusters={showClusters}
          />
        </CardContent>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Map Features</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Click markers to view response details</li>
          <li>• Clustered markers show number of responses in that area</li>
          <li>• Heat map displays response density</li>
          <li>• Zoom and pan to explore different regions</li>
        </ul>
      </div>
    </div>
  )
}

