/**
 * Geocoding service library
 * Supports reverse geocoding (coordinates to address) and forward geocoding (address to coordinates)
 * Uses Nominatim as the primary provider (free, open-source)
 */

export interface GeocodedAddress {
  address: string
  city?: string
  country?: string
  latitude: number
  longitude: number
}

export interface ReverseGeocodeResult {
  success: boolean
  data?: GeocodedAddress
  error?: string
}

export interface ForwardGeocodeResult {
  success: boolean
  data?: Array<{
    address: string
    latitude: number
    longitude: number
    displayName: string
  }>
  error?: string
}

/**
 * Reverse geocode: Convert coordinates to human-readable address
 * Uses Nominatim API (free, no API key required)
 * Rate limit: 1 request per second
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult> {
  // Validate input
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return {
      success: false,
      error: 'Invalid latitude/longitude values'
    }
  }

  try {
    // Nominatim API endpoint
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SurveyMania/1.0' // Required by Nominatim
      }
    })

    if (!response.ok) {
      console.error('Nominatim API error:', response.status, response.statusText)
      return {
        success: false,
        error: `Geocoding service error: ${response.status}`
      }
    }

    const data = await response.json()

    if (data.error) {
      console.error('Nominatim returned error:', data.error)
      return {
        success: false,
        error: 'Unable to find address for these coordinates'
      }
    }

    // Extract address components
    const address = data.address || {}
    const displayName = data.display_name || ''

    // Build readable address
    const addressParts: string[] = []
    if (address.road) addressParts.push(address.road)
    if (address.neighbourhood) addressParts.push(address.neighbourhood)
    if (address.suburb) addressParts.push(address.suburb)
    if (address.city) addressParts.push(address.city)
    if (address.state) addressParts.push(address.state)
    if (address.postcode) addressParts.push(address.postcode)

    const formattedAddress = addressParts.length > 0 ? addressParts.join(', ') : displayName

    return {
      success: true,
      data: {
        address: formattedAddress,
        city: address.city || address.town || address.village || address.municipality || undefined,
        country: address.country || undefined,
        latitude,
        longitude
      }
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown geocoding error'
    }
  }
}

/**
 * Forward geocode: Convert address to coordinates
 * Uses Nominatim API (free, no API key required)
 * Rate limit: 1 request per second
 */
export async function forwardGeocode(
  address: string,
  limit: number = 5
): Promise<ForwardGeocodeResult> {
  // Validate input
  if (!address || typeof address !== 'string' || address.trim().length === 0) {
    return {
      success: false,
      error: 'Invalid address string'
    }
  }

  try {
    // Nominatim API endpoint
    const encodedAddress = encodeURIComponent(address.trim())
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=${limit}&addressdetails=1`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SurveyMania/1.0' // Required by Nominatim
      }
    })

    if (!response.ok) {
      console.error('Nominatim API error:', response.status, response.statusText)
      return {
        success: false,
        error: `Geocoding service error: ${response.status}`
      }
    }

    const data = await response.json()

    if (!Array.isArray(data) || data.length === 0) {
      return {
        success: false,
        error: 'No results found for this address'
      }
    }

    // Map results to our format
    const results = data.map((item: any) => {
      const addr = item.address || {}
      const addressParts: string[] = []
      if (addr.road) addressParts.push(addr.road)
      if (addr.city) addressParts.push(addr.city)
      if (addr.state) addressParts.push(addr.state)
      if (addr.postcode) addressParts.push(addr.postcode)

      return {
        address: addressParts.length > 0 ? addressParts.join(', ') : item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        displayName: item.display_name
      }
    })

    return {
      success: true,
      data: results
    }
  } catch (error) {
    console.error('Forward geocoding error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown geocoding error'
    }
  }
}

/**
 * Batch reverse geocode multiple coordinates
 * Adds delays between requests to respect Nominatim rate limits
 */
export async function batchReverseGeocode(
  coordinates: Array<{ latitude: number; longitude: number; id: string }>,
  onProgress?: (processed: number, total: number) => void
): Promise<Map<string, GeocodedAddress | null>> {
  const results = new Map<string, GeocodedAddress | null>()
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  for (let i = 0; i < coordinates.length; i++) {
    const coord = coordinates[i]
    const result = await reverseGeocode(coord.latitude, coord.longitude)

    if (result.success && result.data) {
      results.set(coord.id, result.data)
    } else {
      results.set(coord.id, null)
      console.error(`Failed to geocode ${coord.id}:`, result.error)
    }

    // Report progress
    if (onProgress) {
      onProgress(i + 1, coordinates.length)
    }

    // Respect Nominatim rate limit (1 req/sec)
    if (i < coordinates.length - 1) {
      await delay(1100) // 1.1 seconds to be safe
    }
  }

  return results
}

/**
 * Get coordinates from browser geolocation API (client-side only)
 * This is a helper type definition - actual implementation should be in client component
 */
export interface GeolocationPosition {
  latitude: number
  longitude: number
  accuracy: number
}

export interface GeolocationError {
  code: number
  message: string
}

/**
 * Validate if geocoding is needed for a response
 */
export function shouldGeocode(
  latitude: number | null,
  longitude: number | null,
  existingAddress: string | null
): boolean {
  // Already geocoded
  if (existingAddress) return false

  // No coordinates to geocode
  if (latitude === null || longitude === null) return false

  // Invalid coordinates
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return false

  return true
}
