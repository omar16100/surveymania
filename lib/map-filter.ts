import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point, polygon, Feature, Polygon, Point } from '@turf/helpers'

/**
 * Map filtering utilities for geographic data
 */

export interface LatLng {
  lat: number
  lng: number
}

export interface GeoFilter {
  type: 'polygon' | 'circle'
  coordinates: LatLng[]
  radius?: number // meters, for circle type
}

export interface FilterableResponse {
  id: string
  latitude: number | null
  longitude: number | null
  [key: string]: any
}

/**
 * Convert Leaflet LatLng array to GeoJSON polygon coordinates
 */
export function leafletToGeoJSON(latLngs: LatLng[]): number[][][] {
  // GeoJSON expects [lng, lat] (reverse of Leaflet)
  // Also need to close the polygon (first point === last point)
  const coords = latLngs.map(ll => [ll.lng, ll.lat])

  // Close polygon if not already closed
  const first = coords[0]
  const last = coords[coords.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) {
    coords.push([...first])
  }

  return [coords] // Polygon coordinates are nested
}

/**
 * Check if a point is within a polygon
 *
 * @param lat - Latitude of point
 * @param lng - Longitude of point
 * @param polygon - Polygon coordinates (Leaflet format)
 * @returns true if point is inside polygon
 */
export function isPointInPolygon(
  lat: number,
  lng: number,
  polygonCoords: LatLng[]
): boolean {
  try {
    const pt = point([lng, lat]) // GeoJSON uses [lng, lat]
    const poly = polygon(leafletToGeoJSON(polygonCoords))
    return booleanPointInPolygon(pt, poly)
  } catch (error) {
    console.error('Point-in-polygon error:', error)
    return false
  }
}

/**
 * Filter responses by polygon boundary
 *
 * @param responses - Array of responses with lat/lng
 * @param filter - Geographic filter (polygon or circle)
 * @returns Filtered responses that fall within the boundary
 */
export function filterResponsesByPolygon<T extends FilterableResponse>(
  responses: T[],
  filter: GeoFilter
): T[] {
  if (!filter || !filter.coordinates || filter.coordinates.length < 3) {
    return responses // Invalid filter, return all
  }

  return responses.filter(response => {
    if (response.latitude === null || response.longitude === null) {
      return false // No location data
    }

    return isPointInPolygon(
      response.latitude,
      response.longitude,
      filter.coordinates
    )
  })
}

/**
 * Calculate bounding box for a set of coordinates
 */
export function getBounds(coords: LatLng[]): {
  north: number
  south: number
  east: number
  west: number
} {
  if (coords.length === 0) {
    return { north: 0, south: 0, east: 0, west: 0 }
  }

  let north = coords[0].lat
  let south = coords[0].lat
  let east = coords[0].lng
  let west = coords[0].lng

  coords.forEach(coord => {
    if (coord.lat > north) north = coord.lat
    if (coord.lat < south) south = coord.lat
    if (coord.lng > east) east = coord.lng
    if (coord.lng < west) west = coord.lng
  })

  return { north, south, east, west }
}

/**
 * Calculate center point of a polygon
 */
export function getPolygonCenter(coords: LatLng[]): LatLng | null {
  if (coords.length === 0) return null

  const bounds = getBounds(coords)
  return {
    lat: (bounds.north + bounds.south) / 2,
    lng: (east + bounds.west) / 2
  }
}

/**
 * Calculate approximate area of polygon in square meters
 * Uses simple approximation - for precise calculation use @turf/area
 */
export function getPolygonArea(coords: LatLng[]): number {
  if (coords.length < 3) return 0

  // Convert to radians
  const toRad = (deg: number) => deg * (Math.PI / 180)

  // Earth radius in meters
  const R = 6371000

  let area = 0
  const coords2 = [...coords, coords[0]] // Close the polygon

  for (let i = 0; i < coords2.length - 1; i++) {
    const p1 = coords2[i]
    const p2 = coords2[i + 1]

    area += toRad(p2.lng - p1.lng) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)))
  }

  area = (area * R * R) / 2
  return Math.abs(area)
}

/**
 * Format area for display
 */
export function formatArea(areaMeters: number): string {
  if (areaMeters < 1000000) {
    // Less than 1 km² - show in m²
    return `${Math.round(areaMeters).toLocaleString()} m²`
  } else {
    // Show in km²
    const km2 = areaMeters / 1000000
    return `${km2.toFixed(2)} km²`
  }
}

/**
 * Serialize filter for storage/URL
 */
export function serializeFilter(filter: GeoFilter): string {
  return JSON.stringify(filter)
}

/**
 * Deserialize filter from storage/URL
 */
export function deserializeFilter(filterStr: string): GeoFilter | null {
  try {
    const filter = JSON.parse(filterStr) as GeoFilter
    if (!filter.type || !filter.coordinates) return null
    return filter
  } catch {
    return null
  }
}

/**
 * Check if two filters are equal
 */
export function filtersEqual(a: GeoFilter | null, b: GeoFilter | null): boolean {
  if (!a && !b) return true
  if (!a || !b) return false

  return (
    a.type === b.type &&
    a.coordinates.length === b.coordinates.length &&
    a.coordinates.every((coord, i) =>
      coord.lat === b.coordinates[i].lat && coord.lng === b.coordinates[i].lng
    )
  )
}
