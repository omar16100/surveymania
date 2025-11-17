import { PrismaClient } from '@prisma/client';

/**
 * Calculate great-circle distance between two points using Haversine formula
 *
 * @param lat1 Latitude of point 1 (degrees)
 * @param lon1 Longitude of point 1 (degrees)
 * @param lat2 Latitude of point 2 (degrees)
 * @param lon2 Longitude of point 2 (degrees)
 * @returns Distance in meters
 *
 * @example
 * const distance = haversineDistance(23.8103, 90.4125, 40.7128, -74.0060);
 * console.log(distance); // 12534120 meters (12,534 km from Dhaka to NYC)
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate bounding box for efficient radius search
 * Pre-filters candidates before precise distance calculation
 *
 * @param centerLat Center point latitude (degrees)
 * @param centerLon Center point longitude (degrees)
 * @param radiusMeters Search radius in meters
 * @returns Bounding box { minLat, maxLat, minLon, maxLon }
 *
 * @example
 * const box = getBoundingBox(23.8103, 90.4125, 5000); // 5km radius
 * // Use box.minLat, box.maxLat, etc. in WHERE clause
 */
export function getBoundingBox(
  centerLat: number,
  centerLon: number,
  radiusMeters: number
) {
  // Approximate conversion: 1 degree latitude ≈ 111,320 meters
  const latDelta = radiusMeters / 111320;

  // Longitude degrees vary by latitude (smaller near poles)
  const lonDelta = radiusMeters / (111320 * Math.cos((centerLat * Math.PI) / 180));

  return {
    minLat: centerLat - latDelta,
    maxLat: centerLat + latDelta,
    minLon: centerLon - lonDelta,
    maxLon: centerLon + lonDelta,
  };
}

/**
 * Find responses within radius of a point
 * Uses bounding box pre-filtering + Haversine for accuracy
 *
 * @param prisma Prisma client instance
 * @param surveyId Survey ID to search within
 * @param centerLat Center point latitude
 * @param centerLon Center point longitude
 * @param radiusMeters Search radius in meters
 * @returns Array of responses within radius
 *
 * @example
 * const prisma = getDB();
 * const nearby = await findResponsesNearby(
 *   prisma,
 *   'survey-123',
 *   23.8103, 90.4125,
 *   5000  // 5km radius
 * );
 * console.log(`Found ${nearby.length} responses within 5km`);
 */
export async function findResponsesNearby(
  prisma: PrismaClient,
  surveyId: string,
  centerLat: number,
  centerLon: number,
  radiusMeters: number
) {
  // Step 1: Calculate bounding box (fast, uses index)
  const box = getBoundingBox(centerLat, centerLon, radiusMeters);

  // Step 2: Query database with bounding box filter
  const candidates = await prisma.surveyResponse.findMany({
    where: {
      surveyId,
      latitude: {
        gte: box.minLat,
        lte: box.maxLat
      },
      longitude: {
        gte: box.minLon,
        lte: box.maxLon
      },
    },
  });

  // Step 3: Filter with precise distance calculation (in-memory)
  return candidates.filter(
    (r) =>
      r.latitude &&
      r.longitude &&
      haversineDistance(centerLat, centerLon, r.latitude, r.longitude) <= radiusMeters
  );
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 *
 * @param point [longitude, latitude] of point to test
 * @param polygon Array of [longitude, latitude] coordinates forming polygon
 * @returns true if point is inside polygon
 *
 * @example
 * const dhaka = [90.4125, 23.8103];
 * const dhakaPolygon = [
 *   [90.35, 23.75], [90.50, 23.75],
 *   [90.50, 23.85], [90.35, 23.85],
 *   [90.35, 23.75]  // Close polygon
 * ];
 * const isInside = pointInPolygon(dhaka, dhakaPolygon); // true
 */
export function pointInPolygon(
  point: [number, number],
  polygon: Array<[number, number]>
): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}
