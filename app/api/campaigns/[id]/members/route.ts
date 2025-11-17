import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { requireCampaignAccess, forbiddenResponse } from '@/lib/campaign-auth'


export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

const schema = z.object({
  userId: z.string(),
  role: z.enum(['admin','collector','viewer'] as const),
  assignedRegion: z.any().optional(),
  permissions: z.any().default({}),
  invitedBy: z.string()
})

export async function GET(_: Request, { params }: Params) {
  const prisma = getDB();
try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasAccess = await requireCampaignAccess(userId, params.id, 'viewer')
    if (!hasAccess) return forbiddenResponse()

    const members = await prisma.campaignMember.findMany({
      where: { campaignId: params.id },
      include: { user: { select: { clerkId: true, email: true, fullName: true } } }
    })
    return NextResponse.json(members)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: Params) {
  const prisma = getDB();
try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasAccess = await requireCampaignAccess(userId, params.id, 'admin')
    if (!hasAccess) return forbiddenResponse('Only campaign admins can add members')

    const json = await req.json()
    const data = schema.parse(json)
    const created = await prisma.campaignMember.create({ data: {
      campaignId: params.id,
      userId: data.userId,
      role: data.role,
      assignedRegion: data.assignedRegion ?? null,
      permissions: data.permissions,
      invitedBy: data.invitedBy,
      status: 'invited'
    } })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    const status = e instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: e.message }, { status })
  }
}

