import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { canManageSurvey } from '@/lib/rbac'


export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

export async function POST(_: Request, { params }: Params) {
  const prisma = getDB();
try {
    const user = await requireUser()
    const allowed = await canManageSurvey(user.id, params.id)
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const survey = await prisma.survey.update({
      where: { id: params.id },
      data: { status: 'active', publishedAt: new Date() },
      select: { id: true, status: true, publishedAt: true }
    })
    return NextResponse.json(survey)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
