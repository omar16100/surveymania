"use client"
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import 'leaflet-draw'
import { Button } from '@/components/ui'
import type { Geofence } from '@/lib/geofence'

// Fix default icon paths for Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
})

interface Props {
  value: Geofence | null
  onChange: (geofence: Geofence | null) => void
  height?: string
}

export default function GeofenceDrawer({ value, onChange, height = '500px' }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null)
  const [drawingType, setDrawingType] = useState<'polygon' | 'circle'>('polygon')

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Initialize map
    const map = L.map(mapRef.current).setView([1.3521, 103.8198], 11) // Singapore default

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map)

    // Initialize FeatureGroup for drawn items
    const drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)
    drawnItemsRef.current = drawnItems

    // Add draw control
    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          shapeOptions: {
            color: '#673ab7',
            weight: 2,
            fillOpacity: 0.2
          }
        },
        circle: {
          shapeOptions: {
            color: '#673ab7',
            weight: 2,
            fillOpacity: 0.2
          }
        },
        polyline: false,
        marker: false,
        rectangle: false,
        circlemarker: false
      },
      edit: {
        featureGroup: drawnItems,
        remove: true
      }
    })
    map.addControl(drawControl)

    // Handle draw creation
    map.on(L.Draw.Event.CREATED, (event: any) => {
      const layer = event.layer
      const type = event.layerType

      // Clear existing geofence
      drawnItems.clearLayers()

      // Add new layer
      drawnItems.addLayer(layer)

      // Convert to Geofence format
      if (type === 'polygon') {
        const latLngs = layer.getLatLngs()[0]
        const coordinates = latLngs.map((latLng: L.LatLng) => [
          latLng.lng,
          latLng.lat
        ])
        // Close the polygon
        coordinates.push(coordinates[0])

        onChange({
          type: 'polygon',
          coordinates: [coordinates]
        })
      } else if (type === 'circle') {
        const center = layer.getLatLng()
        const radius = layer.getRadius() / 1000 // Convert meters to km

        onChange({
          type: 'circle',
          center: [center.lng, center.lat],
          radius
        })
      }
    })

    // Handle edit
    map.on(L.Draw.Event.EDITED, (event: any) => {
      const layers = event.layers
      layers.eachLayer((layer: any) => {
        if (layer instanceof L.Polygon && !(layer instanceof L.Circle)) {
          const latLngs = layer.getLatLngs()[0]
          const coordinates = latLngs.map((latLng: L.LatLng) => [
            latLng.lng,
            latLng.lat
          ])
          coordinates.push(coordinates[0])

          onChange({
            type: 'polygon',
            coordinates: [coordinates]
          })
        } else if (layer instanceof L.Circle) {
          const center = layer.getLatLng()
          const radius = layer.getRadius() / 1000

          onChange({
            type: 'circle',
            center: [center.lng, center.lat],
            radius
          })
        }
      })
    })

    // Handle delete
    map.on(L.Draw.Event.DELETED, () => {
      onChange(null)
    })

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Load existing geofence
  useEffect(() => {
    if (!value || !drawnItemsRef.current || !mapInstanceRef.current) return

    const drawnItems = drawnItemsRef.current
    const map = mapInstanceRef.current

    // Clear existing layers
    drawnItems.clearLayers()

    try {
      if (value.type === 'polygon') {
        const latLngs = value.coordinates[0].map(([lng, lat]) => L.latLng(lat, lng))
        const polygon = L.polygon(latLngs, {
          color: '#673ab7',
          weight: 2,
          fillOpacity: 0.2
        })
        drawnItems.addLayer(polygon)

        // Fit bounds
        map.fitBounds(polygon.getBounds(), { padding: [50, 50] })
      } else if (value.type === 'circle') {
        const [lng, lat] = value.center
        const circle = L.circle([lat, lng], {
          radius: value.radius * 1000, // km to meters
          color: '#673ab7',
          weight: 2,
          fillOpacity: 0.2
        })
        drawnItems.addLayer(circle)

        // Fit bounds
        map.fitBounds(circle.getBounds(), { padding: [50, 50] })
      }
    } catch (error) {
      console.error('Error loading geofence:', error)
    }
  }, [value])

  function clearGeofence() {
    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers()
    }
    onChange(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {value ? (
            <span className="font-medium text-purple">
              Geofence active: {value.type === 'circle' ? `Circle (${value.radius.toFixed(1)}km radius)` : 'Polygon'}
            </span>
          ) : (
            <span>No geofence set - responses allowed from anywhere</span>
          )}
        </div>
        {value && (
          <Button variant="outline" size="sm" onClick={clearGeofence}>
            Clear
          </Button>
        )}
      </div>

      <div
        ref={mapRef}
        style={{ height, width: '100%' }}
        className="rounded-lg border border-gray-300 overflow-hidden"
      />

      <div className="text-xs text-gray-500 space-y-1">
        <p className="font-semibold">How to use:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Use the drawing tools on the map to define your survey area</li>
          <li>Draw a polygon for complex shapes or a circle for simple radius-based areas</li>
          <li>Survey responses outside this area will be rejected</li>
          <li>You can edit or delete the geofence at any time</li>
          <li>Leave empty to allow responses from any location</li>
        </ul>
      </div>
    </div>
  )
}
