/**
 * Geofence validation library
 * Validates if points are within campaign territory boundaries
 */

import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import circle from '@turf/circle'
import type { Feature, Point, Polygon, MultiPolygon, Position } from 'geojson'

export type GeofenceType = 'polygon' | 'circle'

export interface GeofencePolygon {
  type: 'polygon'
  coordinates: Position[][]
}

export interface GeofenceCircle {
  type: 'circle'
  center: [number, number] // [longitude, latitude]
  radius: number // in kilometers
}

export type Geofence = GeofencePolygon | GeofenceCircle

/**
 * Parse geofence from JSON string stored in database
 */
export function parseGeofence(geofenceJson: string | null): Geofence | null {
  if (!geofenceJson) return null

  try {
    const parsed = JSON.parse(geofenceJson)

    if (!parsed.type) {
      console.error('Geofence missing type field')
      return null
    }

    if (parsed.type === 'circle') {
      if (!parsed.center || !Array.isArray(parsed.center) || parsed.center.length !== 2) {
        console.error('Invalid circle center')
        return null
      }
      if (typeof parsed.radius !== 'number' || parsed.radius <= 0) {
        console.error('Invalid circle radius')
        return null
      }
      return parsed as GeofenceCircle
    }

    if (parsed.type === 'polygon') {
      if (!parsed.coordinates || !Array.isArray(parsed.coordinates)) {
        console.error('Invalid polygon coordinates')
        return null
      }
      return parsed as GeofencePolygon
    }

    console.error('Unknown geofence type:', parsed.type)
    return null
  } catch (error) {
    console.error('Failed to parse geofence JSON:', error)
    return null
  }
}

/**
 * Serialize geofence to JSON string for database storage
 */
export function serializeGeofence(geofence: Geofence): string {
  return JSON.stringify(geofence)
}

/**
 * Check if a point is within the geofence
 * @param latitude - Point latitude
 * @param longitude - Point longitude
 * @param geofence - Geofence to check against
 * @returns true if point is inside geofence, false otherwise
 */
export function isPointInGeofence(
  latitude: number,
  longitude: number,
  geofence: Geofence
): boolean {
  // Validate input
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    console.error('Invalid latitude/longitude values')
    return false
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    console.error('Latitude/longitude out of valid range')
    return false
  }

  const point: Feature<Point> = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Point',
      coordinates: [longitude, latitude]
    }
  }

  try {
    if (geofence.type === 'circle') {
      // Convert circle to polygon using Turf.js
      const circlePolygon = circle(geofence.center, geofence.radius, {
        steps: 64,
        units: 'kilometers'
      })

      return booleanPointInPolygon(point, circlePolygon)
    }

    if (geofence.type === 'polygon') {
      const polygon: Feature<Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: geofence.coordinates
        }
      }

      return booleanPointInPolygon(point, polygon)
    }

    console.error('Unknown geofence type:', (geofence as any).type)
    return false
  } catch (error) {
    console.error('Error checking point in geofence:', error)
    return false
  }
}

/**
 * Validate if response location is within campaign geofence
 * Returns validation result with error message if invalid
 */
export interface GeofenceValidationResult {
  valid: boolean
  error?: string
}

export function validateResponseLocation(
  latitude: number | null,
  longitude: number | null,
  campaignGeofence: string | null
): GeofenceValidationResult {
  // If no geofence is set, allow all locations
  if (!campaignGeofence) {
    return { valid: true }
  }

  // If geofence is set but no location provided
  if (latitude === null || longitude === null) {
    return {
      valid: false,
      error: 'This survey requires location access. Please enable location services.'
    }
  }

  const geofence = parseGeofence(campaignGeofence)
  if (!geofence) {
    console.error('Failed to parse campaign geofence')
    return {
      valid: false,
      error: 'Campaign geofence configuration error'
    }
  }

  const isInside = isPointInGeofence(latitude, longitude, geofence)

  if (!isInside) {
    return {
      valid: false,
      error: 'Your location is outside the allowed survey area. This survey is only available in specific regions.'
    }
  }

  return { valid: true }
}

/**
 * Calculate the center point of a polygon geofence (simple centroid)
 */
export function getGeofenceCenter(geofence: Geofence): [number, number] {
  if (geofence.type === 'circle') {
    return geofence.center
  }

  // Calculate centroid of polygon (simple average of all points)
  const coordinates = geofence.coordinates[0] // Outer ring
  let sumLng = 0
  let sumLat = 0
  let count = coordinates.length - 1 // Last point duplicates first

  for (let i = 0; i < count; i++) {
    sumLng += coordinates[i][0]
    sumLat += coordinates[i][1]
  }

  return [sumLng / count, sumLat / count]
}

/**
 * Get a bounding box for the geofence (for map fitting)
 */
export interface BoundingBox {
  north: number
  south: number
  east: number
  west: number
}

export function getGeofenceBounds(geofence: Geofence): BoundingBox {
  if (geofence.type === 'circle') {
    // Approximate bounding box for circle
    // 1 degree latitude ≈ 111km, longitude varies by latitude
    const [lng, lat] = geofence.center
    const radiusInDegrees = geofence.radius / 111 // Rough approximation

    return {
      north: lat + radiusInDegrees,
      south: lat - radiusInDegrees,
      east: lng + radiusInDegrees / Math.cos((lat * Math.PI) / 180),
      west: lng - radiusInDegrees / Math.cos((lat * Math.PI) / 180)
    }
  }

  // Calculate bounding box from polygon coordinates
  const coordinates = geofence.coordinates[0]
  let minLng = coordinates[0][0]
  let maxLng = coordinates[0][0]
  let minLat = coordinates[0][1]
  let maxLat = coordinates[0][1]

  for (const [lng, lat] of coordinates) {
    minLng = Math.min(minLng, lng)
    maxLng = Math.max(maxLng, lng)
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
  }

  return {
    north: maxLat,
    south: minLat,
    east: maxLng,
    west: minLng
  }
}
