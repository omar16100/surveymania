import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { reverseGeocode } from '@/lib/geocoding'
import { requireUser } from '@/lib/auth'
import { canReadSurveyInOrg } from '@/lib/rbac'


export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

/**
 * POST /api/responses/:id/geocode
 * Geocode a response's coordinates to address
 */
export async function POST(_: Request, { params }: Params) {
  const prisma = getDB()

  try {
    const user = await requireUser()

    // Fetch response with survey
    const response = await prisma.surveyResponse.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        surveyId: true,
        latitude: true,
        longitude: true,
        address: true
      }
    })

    if (!response) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 })
    }

    // Check authorization
    const allowed = await canReadSurveyInOrg(user.id, response.surveyId)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to access this response' },
        { status: 403 }
      )
    }

    // Check if already geocoded
    if (response.address) {
      return NextResponse.json(
        { error: 'Response already has an address' },
        { status: 400 }
      )
    }

    // Check if has coordinates
    if (response.latitude === null || response.longitude === null) {
      return NextResponse.json(
        { error: 'Response does not have location coordinates' },
        { status: 400 }
      )
    }

    // Perform geocoding
    const result = await reverseGeocode(response.latitude, response.longitude)

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Geocoding failed' },
        { status: 500 }
      )
    }

    // Update response with address
    const updated = await prisma.surveyResponse.update({
      where: { id: params.id },
      data: {
        address: result.data.address,
        city: result.data.city,
        country: result.data.country,
        geocodedAt: new Date()
      },
      select: {
        id: true,
        address: true,
        city: true,
        country: true,
        geocodedAt: true
      }
    })

    return NextResponse.json(updated)
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
