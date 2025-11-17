import { NextResponse } from 'next/server'
import { z } from 'zod'


export const dynamic = 'force-dynamic'

const schema = z.object({
  point: z.object({ latitude: z.number(), longitude: z.number() }),
  polygon: z.object({ type: z.literal('Polygon'), coordinates: z.array(z.array(z.array(z.number()))) })
})

// Simple point-in-polygon using ray casting for the first ring
function pointInPolygon(point: [number, number], polygon: [number, number][]) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1]
    const xj = polygon[j][0], yj = polygon[j][1]
    const intersect = ((yi > point[1]) !== (yj > point[1])) && (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi + 0.0000001) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const data = schema.parse(json)
    const ring = data.polygon.coordinates[0] as [number, number][]
    const allowed = pointInPolygon([data.point.longitude, data.point.latitude], ring)
    return NextResponse.json({ allowed })
  } catch (e: any) {
    const status = e instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: e.message }, { status })
  }
}

