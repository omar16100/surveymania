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
    const src = await prisma.survey.findUnique({ where: { id: params.id }, include: { questions: true } })
    if (!src) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const dup = await prisma.survey.create({
      data: {
        title: src.title + ' (Copy)',
        description: src.description,
        organizationId: src.organizationId,
        createdBy: src.createdBy,
        status: 'draft',
        settings: src.settings,
        questions: { create: src.questions.map(({ order, type, question, description, required, validation, options, logic }) => ({ order, type, question, description: description ?? undefined, required, validation: validation ?? undefined, options: options ?? undefined, logic: logic ?? undefined })) }
      },
      select: { id: true }
    })
    return NextResponse.json(dup)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
