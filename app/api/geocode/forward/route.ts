import { NextResponse } from 'next/server'
import { z } from 'zod'
import { forwardGeocode } from '@/lib/geocoding'


export const dynamic = 'force-dynamic'

const schema = z.object({
  address: z.string().min(1),
  limit: z.number().int().min(1).max(10).optional().default(5)
})

/**
 * POST /api/geocode/forward
 * Convert address to coordinates
 */
export async function POST(req: Request) {
  try {
    const json = await req.json()
    const data = schema.parse(json)

    const result = await forwardGeocode(data.address, data.limit)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result.data)
  } catch (e: any) {
    const status = e instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: e.message }, { status })
  }
}
