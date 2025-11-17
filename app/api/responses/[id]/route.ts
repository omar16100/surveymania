import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { canManageSurvey } from '@/lib/rbac'


export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

export async function GET(_: Request, { params }: Params) {
  const prisma = getDB();
try {
    const response = await prisma.surveyResponse.findUnique({
      where: { id: params.id },
      include: {
        answers: { include: { question: true } },
        survey: { select: { id: true, title: true } }
      }
    })
    if (!response) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(response)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const prisma = getDB();
try {
    const user = await requireUser()
    const response = await prisma.surveyResponse.findUnique({
      where: { id: params.id },
      select: { surveyId: true }
    })
    if (!response) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const allowed = await canManageSurvey(user.id, response.surveyId)
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await prisma.surveyAnswer.deleteMany({ where: { responseId: params.id } })
    await prisma.surveyResponse.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

