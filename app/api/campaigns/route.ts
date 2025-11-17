import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'


export const dynamic = 'force-dynamic'

const createSchema = z.object({
  surveyId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  targetCount: z.number().int().optional(),
  settings: z.any().default({}),
  geofence: z.string().nullable().optional()
})

export async function GET() {
  const prisma = getDB();
try {
    const list = await prisma.campaign.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json(list)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const prisma = getDB();
try {
    const user = await requireUser()
    const json = await req.json()
    const data = createSchema.parse(json)
    const created = await prisma.campaign.create({
      data: {
        ...data,
        createdBy: user.id,
        settings: JSON.stringify(data.settings || {})
      }
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    const status = e instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: e.message }, { status })
  }
}
