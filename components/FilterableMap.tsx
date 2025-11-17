'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import 'leaflet-draw'
import { GeoFilter, LatLng, filterResponsesByPolygon, formatArea, getPolygonArea } from '@/lib/map-filter'

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface FilterableMapProps {
  responses: Array<{
    id: string
    latitude: number | null
    longitude: number | null
    submittedAt: string
    [key: string]: any
  }>
  onFilterChange?: (filter: GeoFilter | null, filteredIds: string[]) => void
  height?: string
}

export default function FilterableMap({
  responses,
  onFilterChange,
  height = '500px'
}: FilterableMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null)
  const [filter, setFilter] = useState<GeoFilter | null>(null)
  const [filteredCount, setFilteredCount] = useState(0)
  const [polygonInfo, setPolygonInfo] = useState<string>('')

  // Filter responses with location data
  const responsesWithLocation = responses.filter(
    r => r.latitude !== null && r.longitude !== null
  )

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    if (responsesWithLocation.length === 0) return

    // Calculate center
    const lats = responsesWithLocation.map(r => r.latitude!)
    const lngs = responsesWithLocation.map(r => r.longitude!)
    const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length
    const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length

    // Initialize map
    const map = L.map(containerRef.current).setView([centerLat, centerLng], 10)
    mapRef.current = map

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map)

    // Fit bounds to all markers
    if (responsesWithLocation.length > 1) {
      const bounds = L.latLngBounds(
        responsesWithLocation.map(r => [r.latitude!, r.longitude!])
      )
      map.fitBounds(bounds, { padding: [50, 50] })
    }

    // Add response markers
    responsesWithLocation.forEach(response => {
      const marker = L.circleMarker([response.latitude!, response.longitude!], {
        radius: 6,
        fillColor: '#673ab7',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.7
      })

      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif;">
          <div style="font-weight: 600; font-size: 13px;">Response</div>
          <div style="font-size: 11px; color: #666; margin-top: 4px;">
            ${new Date(response.submittedAt).toLocaleString()}
          </div>
        </div>
      `)

      marker.addTo(map)
    })

    // Initialize drawing controls
    const drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)
    drawnItemsRef.current = drawnItems

    const drawControl = new (L.Control as any).Draw({
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          shapeOptions: {
            color: '#673ab7',
            fillOpacity: 0.2,
            weight: 2
          }
        },
        rectangle: {
          shapeOptions: {
            color: '#673ab7',
            fillOpacity: 0.2,
            weight: 2
          }
        },
        circle: false,
        marker: false,
        circlemarker: false,
        polyline: false
      },
      edit: {
        featureGroup: drawnItems,
        remove: true
      }
    })
    map.addControl(drawControl)

    // Handle drawn shapes
    map.on((L as any).Draw.Event.CREATED, (e: any) => {
      const layer = e.layer
      drawnItems.clearLayers() // Only allow one filter at a time
      drawnItems.addLayer(layer)

      // Extract coordinates
      const latLngs: LatLng[] = layer.getLatLngs()[0].map((ll: any) => ({
        lat: ll.lat,
        lng: ll.lng
      }))

      const newFilter: GeoFilter = {
        type: 'polygon',
        coordinates: latLngs
      }

      setFilter(newFilter)

      // Calculate area
      const area = getPolygonArea(latLngs)
      setPolygonInfo(`Area: ${formatArea(area)}`)

      // Apply filter
      const filtered = filterResponsesByPolygon(responsesWithLocation, newFilter)
      setFilteredCount(filtered.length)
      onFilterChange?.(newFilter, filtered.map(r => r.id))
    })

    map.on((L as any).Draw.Event.DELETED, () => {
      setFilter(null)
      setFilteredCount(0)
      setPolygonInfo('')
      onFilterChange?.(null, [])
    })

    map.on((L as any).Draw.Event.EDITED, (e: any) => {
      const layers = e.layers
      layers.eachLayer((layer: any) => {
        const latLngs: LatLng[] = layer.getLatLngs()[0].map((ll: any) => ({
          lat: ll.lat,
          lng: ll.lng
        }))

        const newFilter: GeoFilter = {
          type: 'polygon',
          coordinates: latLngs
        }

        setFilter(newFilter)

        const area = getPolygonArea(latLngs)
        setPolygonInfo(`Area: ${formatArea(area)}`)

        const filtered = filterResponsesByPolygon(responsesWithLocation, newFilter)
        setFilteredCount(filtered.length)
        onFilterChange?.(newFilter, filtered.map(r => r.id))
      })
    })

    // Cleanup
    return () => {
      map.remove()
      mapRef.current = null
      drawnItemsRef.current = null
    }
  }, [responsesWithLocation.length]) // Only recreate if response count changes

  if (responsesWithLocation.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
        style={{ height }}
      >
        <p className="text-gray-500">No location data available</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <div ref={containerRef} style={{ height, width: '100%' }} className="rounded-lg overflow-hidden border" />

      {/* Filter info */}
      {filter && (
        <div className="absolute bottom-4 left-4 bg-white shadow-lg rounded-lg p-3 z-[1000] max-w-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
            <span className="font-semibold text-sm">Geographic Filter Active</span>
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>{polygonInfo}</div>
            <div className="font-semibold text-purple-600">
              {filteredCount} of {responsesWithLocation.length} responses selected
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Use the edit/delete tools in the top-right to modify
          </div>
        </div>
      )}

      {/* Instructions */}
      {!filter && (
        <div className="absolute top-4 left-4 bg-white shadow-md rounded-lg p-3 z-[1000] max-w-xs">
          <div className="text-xs text-gray-600">
            <div className="font-semibold mb-1">Draw to Filter</div>
            <div>Use the polygon or rectangle tool (top-right) to filter responses by geographic area</div>
          </div>
        </div>
      )}
    </div>
  )
}
