"use client"
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import 'leaflet.markercluster'
import 'leaflet.heat'
import 'leaflet-draw'
import type { LatLng } from '@/lib/map-filter'

// Fix for default marker icons in webpack
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
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

type Props = {
  features: Feature[]
  showHeatmap: boolean
  showClusters: boolean
  onFilterChange?: (filter: { type: 'polygon'; coordinates: LatLng[] } | null) => void
}

export default function MapInner({ features, showHeatmap, showClusters, onFilterChange }: Props) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    // Calculate center and bounds
    const lats = features.map(f => f.geometry.coordinates[1])
    const lngs = features.map(f => f.geometry.coordinates[0])
    const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length
    const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length

    // Initialize map
    const map = L.map(containerRef.current).setView([centerLat, centerLng], 10)
    mapRef.current = map

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map)

    // Fit bounds to show all markers
    if (features.length > 1) {
      const bounds = L.latLngBounds(features.map(f => [f.geometry.coordinates[1], f.geometry.coordinates[0]]))
      map.fitBounds(bounds, { padding: [50, 50] })
    }

    // Add markers
    if (showClusters) {
      // Marker clustering
      const markers = (L as any).markerClusterGroup({
        maxClusterRadius: 80,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true
      })

      features.forEach(feature => {
        const [lng, lat] = feature.geometry.coordinates
        const marker = L.marker([lat, lng])

        // Create popup content
        const popupContent = createPopupContent(feature)
        marker.bindPopup(popupContent, { maxWidth: 300 })

        markers.addLayer(marker)
      })

      map.addLayer(markers)
    } else {
      // Regular markers without clustering
      features.forEach(feature => {
        const [lng, lat] = feature.geometry.coordinates
        const marker = L.marker([lat, lng])

        const popupContent = createPopupContent(feature)
        marker.bindPopup(popupContent, { maxWidth: 300 })

        marker.addTo(map)
      })
    }

    // Add heat map layer
    if (showHeatmap && (L as any).heatLayer) {
      const heatData = features.map(f => [
        f.geometry.coordinates[1],
        f.geometry.coordinates[0],
        0.5 // intensity
      ])

      const heat = (L as any).heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        max: 1.0,
        gradient: {
          0.0: 'blue',
          0.5: 'yellow',
          1.0: 'red'
        }
      })
      heat.addTo(map)
    }

    // Add draw control for lasso selection
    if (onFilterChange) {
      const drawnItems = new L.FeatureGroup()
      drawnItemsRef.current = drawnItems
      map.addLayer(drawnItems)

      const drawControl = new (L.Control as any).Draw({
        draw: {
          polygon: {
            allowIntersection: false,
            shapeOptions: {
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.2,
              weight: 2
            }
          },
          polyline: false,
          circle: false,
          rectangle: {
            shapeOptions: {
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.2,
              weight: 2
            }
          },
          marker: false,
          circlemarker: false
        },
        edit: {
          featureGroup: drawnItems,
          remove: true
        }
      })
      map.addControl(drawControl)

      // Handle polygon drawn
      map.on((L.Draw as any).Event.CREATED, (e: any) => {
        const layer = e.layer
        drawnItems.clearLayers()
        drawnItems.addLayer(layer)

        const latlngs = layer.getLatLngs()[0] as L.LatLng[]
        const coordinates: LatLng[] = latlngs.map((ll: L.LatLng) => ({
          lat: ll.lat,
          lng: ll.lng
        }))

        onFilterChange({ type: 'polygon', coordinates })
      })

      // Handle polygon deleted
      map.on((L.Draw as any).Event.DELETED, () => {
        onFilterChange(null)
      })
    }

    // Cleanup
    return () => {
      map.remove()
      mapRef.current = null
      drawnItemsRef.current = null
    }
  }, [features, showHeatmap, showClusters, onFilterChange])

  return <div ref={containerRef} className="h-full w-full" />
}

function createPopupContent(feature: Feature): string {
  const { properties } = feature
  const date = new Date(properties.submittedAt).toLocaleString()

  // Format answers
  const answersHtml = properties.answers.slice(0, 5).map(a => {
    let value = ''
    if (a.answerType === 'text' || a.answerType === 'choice') {
      value = a.answerText || ''
    } else if (a.answerType === 'number') {
      value = a.answerNumber?.toString() || ''
    } else if (a.answerType === 'choices') {
      value = a.answerChoices.join(', ')
    }

    return `
      <div style="margin-bottom: 8px;">
        <strong style="font-size: 12px; color: #666;">${escapeHtml(a.question)}</strong>
        <div style="font-size: 13px;">${escapeHtml(value)}</div>
      </div>
    `
  }).join('')

  const moreAnswers = properties.answers.length > 5
    ? `<div style="font-size: 11px; color: #999; margin-top: 8px;">+${properties.answers.length - 5} more answers</div>`
    : ''

  return `
    <div style="font-family: system-ui, sans-serif;">
      <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;">
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">Response ${properties.sessionId.substring(0, 8)}</div>
        <div style="font-size: 11px; color: #6b7280;">${date}</div>
        ${properties.accuracy ? `<div style="font-size: 11px; color: #6b7280;">Accuracy: ${Math.round(properties.accuracy)}m</div>` : ''}
      </div>
      <div style="max-height: 250px; overflow-y: auto;">
        ${answersHtml}
      </div>
      ${moreAnswers}
    </div>
  `
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
