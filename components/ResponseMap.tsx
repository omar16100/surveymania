"use client"
import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { exportMapAsImage } from '@/lib/map-export'
import { isPointInPolygon } from '@/lib/map-filter'
import Link from 'next/link'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

// Dynamically import map to avoid SSR issues
const MapComponent = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">Loading map...</div>
})

type Feature = {
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
  properties: {
    id: string
    sessionId: string
    accuracy: number | null
    submittedAt: string
    status: string
    answers: Array<{
      question: string
      answerType: string
      answerText: string | null
      answerNumber: number | null
      answerChoices: string[]
    }>
  }
}

type GeoJSONData = {
  type: 'FeatureCollection'
  features: Feature[]
}

type Props = {
  surveyId: string
  showHeatmap?: boolean
  showClusters?: boolean
}

export default function ResponseMap({ surveyId, showHeatmap = false, showClusters = true }: Props) {
  const [data, setData] = useState<GeoJSONData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [polygonFilter, setPolygonFilter] = useState<{ type: 'polygon'; coordinates: Array<{ lat: number; lng: number }> } | null>(null)
  const [filteredIds, setFilteredIds] = useState<string[]>([])

  useEffect(() => {
    loadMapData()
  }, [surveyId])

  async function loadMapData() {
    try {
      const res = await fetch(`/api/surveys/${surveyId}/map`)
      if (!res.ok) throw new Error('Failed to load map data')
      const result = await res.json()
      setData(result)
    } catch (error) {
      console.error('Map data error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter responses when polygon changes
  useEffect(() => {
    if (!data || !polygonFilter) {
      setFilteredIds([])
      return
    }

    const filtered = data.features.filter(feature => {
      const [lng, lat] = feature.geometry.coordinates
      return isPointInPolygon(lat, lng, polygonFilter.coordinates)
    })

    setFilteredIds(filtered.map(f => f.properties.id))
  }, [data, polygonFilter])

  async function handleExport() {
    if (!mapContainerRef.current) return

    setExporting(true)
    try {
      await exportMapAsImage(mapContainerRef.current, {
        filename: `survey-${surveyId}-map.png`,
        format: 'png',
        scale: 2
      })
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export map. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="h-[600px] w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
        <p className="text-gray-600">Loading map data...</p>
      </div>
    )
  }

  if (!data || data.features.length === 0) {
    return (
      <div className="h-[600px] w-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="mt-2 text-sm text-gray-600">No location data available</p>
          <p className="mt-1 text-xs text-gray-500">Responses with location data will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-[1000]">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="bg-white shadow-md hover:shadow-lg px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          title="Export map as PNG"
        >
          {exporting ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Exporting...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export PNG
            </>
          )}
        </button>
      </div>
      <div ref={mapContainerRef} className="h-[600px] w-full rounded-lg overflow-hidden border">
        <MapComponent
          features={data.features}
          showHeatmap={showHeatmap}
          showClusters={showClusters}
          onFilterChange={setPolygonFilter}
        />
      </div>
      {polygonFilter && filteredIds.length > 0 && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">
                {filteredIds.length} response{filteredIds.length !== 1 ? 's' : ''} in selected area
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Use the polygon or rectangle tool to select responses by location
              </p>
            </div>
            <Link
              href={`/dashboard/surveys/${surveyId}/responses?filter=${encodeURIComponent(JSON.stringify({ location: filteredIds }))}`}
              className="btn btn-sm bg-blue-600 text-white hover:bg-blue-700"
            >
              View Filtered Responses
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
