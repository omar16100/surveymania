import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'


export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

export async function GET(_: Request, { params }: Params) {
  const prisma = getDB();
try {
    const r = await prisma.surveyResponse.findUnique({ where: { id: params.id }, select: { latitude: true, longitude: true, locationAccuracy: true } })
    if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(r)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

