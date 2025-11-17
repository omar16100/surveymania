import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { requireCampaignAccess, forbiddenResponse, notFoundResponse } from '@/lib/campaign-auth'


export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

export async function GET(_: Request, { params }: Params) {
  const prisma = getDB();
try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasAccess = await requireCampaignAccess(userId, params.id, 'viewer')
    if (!hasAccess) return forbiddenResponse()

    const c = await prisma.campaign.findUnique({ where: { id: params.id }, include: { members: true } })
    if (!c) return notFoundResponse()
    return NextResponse.json(c)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

const updateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  targetCount: z.number().int().optional(),
  status: z.enum(['draft','active','paused','completed']).optional(),
  settings: z.any().optional(),
  geofence: z.string().nullable().optional()
})

export async function PATCH(req: Request, { params }: Params) {
  const prisma = getDB();
try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasAccess = await requireCampaignAccess(userId, params.id, 'manage')
    if (!hasAccess) return forbiddenResponse('Only campaign creator, org owner, or org admin can edit campaign')

    const json = await req.json()
    const data = updateSchema.parse(json)
    if (data.settings !== undefined) {
      data.settings = JSON.stringify(data.settings)
    }
    const c = await prisma.campaign.update({ where: { id: params.id }, data })
    return NextResponse.json(c)
  } catch (e: any) {
    const status = e instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: e.message }, { status })
  }
}

