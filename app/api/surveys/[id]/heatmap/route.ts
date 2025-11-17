import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'


export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

export async function GET(_: Request, { params }: Params) {
  const prisma = getDB();
try {
    const points = await prisma.surveyResponse.findMany({
      where: { surveyId: params.id, latitude: { not: null }, longitude: { not: null } },
      select: { latitude: true, longitude: true }
    })
    const features = points.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [Number(p.longitude), Number(p.latitude)] },
      properties: {}
    }))
    return NextResponse.json({ type: 'FeatureCollection', features })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

