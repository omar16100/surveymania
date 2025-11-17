import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { requireCampaignAccess, forbiddenResponse } from '@/lib/campaign-auth'


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

    const responses = await prisma.surveyResponse.count({
      where: { survey: { campaigns: { some: { id: params.id } } } }
    })
    return NextResponse.json({ responses })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

