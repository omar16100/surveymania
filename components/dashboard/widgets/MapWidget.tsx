'use client'

import { Card, CardHeader, CardTitle } from '@/components/ui'
import dynamic from 'next/dynamic'

// Dynamically import ResponseMap to avoid SSR issues
const ResponseMap = dynamic(() => import('@/components/ResponseMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-gray-100">
      <p className="text-gray-500">Loading map...</p>
    </div>
  )
})

interface MapWidgetProps {
  surveyId: string
  config: {
    showClusters?: boolean
    showHeatmap?: boolean
    title?: string
  }
}

export default function MapWidget({ surveyId, config }: MapWidgetProps) {
  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {config.title || 'Response Map'}
        </CardTitle>
      </CardHeader>
      <div className="h-[calc(100%-3rem)]">
        <ResponseMap
          surveyId={surveyId}
          showClusters={config.showClusters ?? true}
          showHeatmap={config.showHeatmap ?? false}
        />
      </div>
    </Card>
  )
}
