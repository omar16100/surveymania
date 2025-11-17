'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import 'leaflet-draw'
import { Card, CardContent, CardHeader, CardTitle } from './ui'
import { formatArea, getPolygonArea, leafletToGeoJSON } from '@/lib/map-filter'

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface Territory {
  id: string
  name: string
  description?: string | null
  boundary: string // GeoJSON string
  color: string
  assignedToId?: string | null
  assignedTo?: {
    clerkId: string
    firstName: string
    lastName: string
    email: string
  } | null
  createdAt: string
}

interface CampaignMember {
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

interface TerritoryAssignerProps {
  campaignId: string
  members: CampaignMember[]
  onTerritoryCreated?: (territory: Territory) => void
  onTerritoryUpdated?: (territory: Territory) => void
  onTerritoryDeleted?: (territoryId: string) => void
}

const PRESET_COLORS = [
  '#673ab7', // Purple
  '#3f51b5', // Indigo
  '#2196f3', // Blue
  '#009688', // Teal
  '#4caf50', // Green
  '#ff9800', // Orange
  '#f44336', // Red
  '#e91e63'  // Pink
]

export default function TerritoryAssigner({
  campaignId,
  members,
  onTerritoryCreated,
  onTerritoryUpdated,
  onTerritoryDeleted
}: TerritoryAssignerProps) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null)
  const layersMapRef = useRef<Map<string, L.Layer>>(new Map())

  const [territories, setTerritories] = useState<Territory[]>([])
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state for new/edit territory
  const [territoryName, setTerritoryName] = useState('')
  const [territoryDescription, setTerritoryDescription] = useState('')
  const [territoryColor, setTerritoryColor] = useState(PRESET_COLORS[0])
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)

  // Load territories
  useEffect(() => {
    loadTerritories()
  }, [campaignId])

  async function loadTerritories() {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/territories`)
      if (!res.ok) throw new Error('Failed to load territories')
      const data = await res.json()
      setTerritories(data.territories || [])
    } catch (error) {
      console.error('Load territories error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current).setView([0, 0], 2)
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map)

    const drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)
    drawnItemsRef.current = drawnItems

    const drawControl = new (L.Control as any).Draw({
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          shapeOptions: {
            color: territoryColor,
            fillOpacity: 0.3,
            weight: 2
          }
        },
        rectangle: {
          shapeOptions: {
            color: territoryColor,
            fillOpacity: 0.3,
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
        remove: false // We'll handle delete via UI
      }
    })
    map.addControl(drawControl)

    // Handle new drawings
    map.on((L as any).Draw.Event.CREATED, handleDrawCreated)
    map.on((L as any).Draw.Event.EDITED, handleDrawEdited)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Render existing territories on map
  useEffect(() => {
    if (!mapRef.current || !drawnItemsRef.current) return

    // Clear existing layers
    drawnItemsRef.current.clearLayers()
    layersMapRef.current.clear()

    // Add each territory
    territories.forEach(territory => {
      try {
        const coords = JSON.parse(territory.boundary)
        const latLngs = coords[0].map((c: number[]) => [c[1], c[0]]) // GeoJSON to Leaflet

        const polygon = L.polygon(latLngs, {
          color: territory.color,
          fillOpacity: 0.3,
          weight: 2
        })

        polygon.bindPopup(`
          <div style="font-family: system-ui, sans-serif;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${territory.name}</div>
            ${territory.description ? `<div style="font-size: 12px; color: #666; margin-bottom: 8px;">${territory.description}</div>` : ''}
            ${territory.assignedTo ? `<div style="font-size: 12px;">Assigned to: <strong>${territory.assignedTo.firstName} ${territory.assignedTo.lastName}</strong></div>` : '<div style="font-size: 12px; color: #999;">Unassigned</div>'}
          </div>
        `)

        polygon.on('click', () => {
          setSelectedTerritory(territory)
          setTerritoryName(territory.name)
          setTerritoryDescription(territory.description || '')
          setTerritoryColor(territory.color)
          setAssignedTo(territory.assignedToId || '')
          setIsEditing(true)
        })

        drawnItemsRef.current!.addLayer(polygon)
        layersMapRef.current.set(territory.id, polygon)
      } catch (error) {
        console.error('Error rendering territory:', territory.id, error)
      }
    })

    // Fit bounds if territories exist
    if (territories.length > 0 && drawnItemsRef.current.getLayers().length > 0) {
      mapRef.current.fitBounds(drawnItemsRef.current.getBounds(), { padding: [50, 50] })
    }
  }, [territories])

  function handleDrawCreated(e: any) {
    const layer = e.layer
    const latLngs = layer.getLatLngs()[0]

    // Convert to GeoJSON format
    const coords = latLngs.map((ll: any) => [ll.lng, ll.lat])
    coords.push([coords[0][0], coords[0][1]]) // Close polygon
    const boundary = JSON.stringify([coords])

    // Calculate area for display
    const areaMeters = getPolygonArea(latLngs.map((ll: any) => ({ lat: ll.lat, lng: ll.lng })))

    // Set form to create mode
    setSelectedTerritory(null)
    setTerritoryName(`Territory ${territories.length + 1}`)
    setTerritoryDescription(`Area: ${formatArea(areaMeters)}`)
    setTerritoryColor(PRESET_COLORS[territories.length % PRESET_COLORS.length])
    setAssignedTo('')
    setIsEditing(false)

    // Store boundary temporarily
    ;(layer as any)._tempBoundary = boundary

    // Add to map temporarily
    layer.setStyle({ color: territoryColor, fillOpacity: 0.3 })
    drawnItemsRef.current!.addLayer(layer)
  }

  function handleDrawEdited(e: any) {
    if (!selectedTerritory) return

    const layers = e.layers
    layers.eachLayer(async (layer: any) => {
      const latLngs = layer.getLatLngs()[0]
      const coords = latLngs.map((ll: any) => [ll.lng, ll.lat])
      coords.push([coords[0][0], coords[0][1]])
      const boundary = JSON.stringify([coords])

      // Update territory boundary
      await updateTerritory(selectedTerritory.id, { boundary })
    })
  }

  async function saveTerritory() {
    if (!territoryName.trim()) {
      alert('Please enter a territory name')
      return
    }

    // Find the temporary layer
    const layers = drawnItemsRef.current!.getLayers()
    const tempLayer = layers.find((l: any) => l._tempBoundary) as any

    if (!tempLayer && !selectedTerritory) {
      alert('Please draw a territory on the map first')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: territoryName,
        description: territoryDescription || undefined,
        color: territoryColor,
        assignedToId: assignedTo || undefined,
        boundary: tempLayer?._tempBoundary || selectedTerritory?.boundary
      }

      if (selectedTerritory) {
        // Update existing
        const res = await fetch(`/api/territories/${selectedTerritory.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (!res.ok) throw new Error('Failed to update territory')
        const data = await res.json()

        setTerritories(prev => prev.map(t => t.id === selectedTerritory.id ? data.territory : t))
        onTerritoryUpdated?.(data.territory)
      } else {
        // Create new
        const res = await fetch(`/api/campaigns/${campaignId}/territories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (!res.ok) throw new Error('Failed to create territory')
        const data = await res.json()

        setTerritories(prev => [...prev, data.territory])
        onTerritoryCreated?.(data.territory)

        // Remove temp layer
        if (tempLayer) {
          delete tempLayer._tempBoundary
        }
      }

      // Reset form
      resetForm()
    } catch (error) {
      console.error('Save territory error:', error)
      alert('Failed to save territory. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function updateTerritory(id: string, updates: Partial<Territory>) {
    try {
      const res = await fetch(`/api/territories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!res.ok) throw new Error('Failed to update territory')
      const data = await res.json()

      setTerritories(prev => prev.map(t => t.id === id ? data.territory : t))
      onTerritoryUpdated?.(data.territory)
    } catch (error) {
      console.error('Update territory error:', error)
    }
  }

  async function deleteTerritory(id: string) {
    if (!confirm('Are you sure you want to delete this territory?')) return

    try {
      const res = await fetch(`/api/territories/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to delete territory')

      setTerritories(prev => prev.filter(t => t.id !== id))
      onTerritoryDeleted?.(id)

      // Remove from map
      const layer = layersMapRef.current.get(id)
      if (layer) {
        drawnItemsRef.current!.removeLayer(layer)
        layersMapRef.current.delete(id)
      }

      if (selectedTerritory?.id === id) {
        resetForm()
      }
    } catch (error) {
      console.error('Delete territory error:', error)
      alert('Failed to delete territory. Please try again.')
    }
  }

  function resetForm() {
    setSelectedTerritory(null)
    setTerritoryName('')
    setTerritoryDescription('')
    setTerritoryColor(PRESET_COLORS[0])
    setAssignedTo('')
    setIsEditing(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Map */}
      <div className="lg:col-span-2">
        <Card className="h-[600px]">
          <CardContent className="p-0 h-full">
            <div ref={containerRef} className="h-full w-full" />
          </CardContent>
        </Card>

        {/* Territory Form */}
        {(territoryName || isEditing) && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">
                {isEditing ? 'Edit Territory' : 'New Territory'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Territory Name
                </label>
                <input
                  type="text"
                  className="input w-full"
                  value={territoryName}
                  onChange={(e) => setTerritoryName(e.target.value)}
                  placeholder="e.g., North District"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  className="input w-full"
                  rows={2}
                  value={territoryDescription}
                  onChange={(e) => setTerritoryDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setTerritoryColor(color)}
                      className={`w-8 h-8 rounded border-2 ${
                        territoryColor === color ? 'border-gray-900' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign To
                </label>
                <select
                  className="input w-full"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {members.map(member => (
                    <option key={member.userId} value={member.userId}>
                      {member.user.firstName} {member.user.lastName} ({member.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveTerritory}
                  disabled={saving}
                  className="btn btn-primary flex-1"
                >
                  {saving ? 'Saving...' : isEditing ? 'Update Territory' : 'Create Territory'}
                </button>
                <button
                  onClick={resetForm}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                {isEditing && selectedTerritory && (
                  <button
                    onClick={() => deleteTerritory(selectedTerritory.id)}
                    className="btn bg-red-500 hover:bg-red-600 text-white"
                  >
                    Delete
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Territories List */}
      <div>
        <Card className="h-[600px] overflow-auto">
          <CardHeader>
            <CardTitle className="text-lg">
              Territories ({territories.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-gray-500">Loading territories...</p>
            ) : territories.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 mb-2">No territories yet</p>
                <p className="text-xs text-gray-400">
                  Use the polygon or rectangle tool on the map to draw a territory
                </p>
              </div>
            ) : (
              territories.map(territory => (
                <div
                  key={territory.id}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedTerritory?.id === territory.id
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                  onClick={() => {
                    setSelectedTerritory(territory)
                    setTerritoryName(territory.name)
                    setTerritoryDescription(territory.description || '')
                    setTerritoryColor(territory.color)
                    setAssignedTo(territory.assignedToId || '')
                    setIsEditing(true)

                    // Zoom to territory
                    const layer = layersMapRef.current.get(territory.id)
                    if (layer && mapRef.current) {
                      mapRef.current.fitBounds((layer as any).getBounds(), { padding: [50, 50] })
                    }
                  }}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className="w-4 h-4 rounded mt-0.5 flex-shrink-0"
                      style={{ backgroundColor: territory.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{territory.name}</div>
                      {territory.description && (
                        <div className="text-xs text-gray-600 mt-0.5 truncate">
                          {territory.description}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {territory.assignedTo ? (
                          <span className="text-purple-600 font-medium">
                            {territory.assignedTo.firstName} {territory.assignedTo.lastName}
                          </span>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
