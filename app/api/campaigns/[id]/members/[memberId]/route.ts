import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { requireCampaignAccess, forbiddenResponse } from '@/lib/campaign-auth'


export const dynamic = 'force-dynamic'

type Params = { params: { id: string; memberId: string } }

const updateSchema = z.object({
  role: z.enum(['admin','collector','viewer'] as const).optional(),
  status: z.string().optional(),
  assignedRegion: z.any().optional()
})

export async function PATCH(req: Request, { params }: Params) {
  const prisma = getDB();
try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasAccess = await requireCampaignAccess(userId, params.id, 'admin')
    if (!hasAccess) return forbiddenResponse('Only campaign admins can edit members')

    const json = await req.json()
    const data = updateSchema.parse(json)
    const updated = await prisma.campaignMember.update({
      where: { id: params.memberId },
      data
    })
    return NextResponse.json(updated)
  } catch (e: any) {
    const status = e instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: e.message }, { status })
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const prisma = getDB();
try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasAccess = await requireCampaignAccess(userId, params.id, 'admin')
    if (!hasAccess) return forbiddenResponse('Only campaign admins can remove members')

    await prisma.campaignMember.delete({ where: { id: params.memberId } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

