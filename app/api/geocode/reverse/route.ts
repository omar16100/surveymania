import { NextResponse } from 'next/server'
import { z } from 'zod'
import { reverseGeocode } from '@/lib/geocoding'


export const dynamic = 'force-dynamic'

const schema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
})

/**
 * POST /api/geocode/reverse
 * Convert coordinates to address
 */
export async function POST(req: Request) {
  try {
    const json = await req.json()
    const data = schema.parse(json)

    const result = await reverseGeocode(data.latitude, data.longitude)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result.data)
  } catch (e: any) {
    const status = e instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: e.message }, { status })
  }
}
