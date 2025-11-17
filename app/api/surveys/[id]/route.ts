import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { canManageSurvey } from '@/lib/rbac'


export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

export async function GET(_: Request, { params }: Params) {
  const prisma = getDB();
try {
    const survey = await prisma.survey.findUnique({
      where: { id: params.id },
      include: { questions: { orderBy: { order: 'asc' } } }
    })
    if (!survey) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(survey)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

const updateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['draft','active','paused','closed']).optional(),
  settings: z.any().optional()
})

export async function PATCH(req: Request, { params }: Params) {
  const prisma = getDB();
try {
    const user = await requireUser()
    const json = await req.json()
    const data = updateSchema.parse(json)
    const allowed = await canManageSurvey(user.id, params.id)
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const survey = await prisma.survey.update({ where: { id: params.id }, data })
    return NextResponse.json(survey)
  } catch (e: any) {
    const status = e instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: e.message }, { status })
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const prisma = getDB();
try {
    const user = await requireUser()
    const allowed = await canManageSurvey(user.id, params.id)
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await prisma.survey.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
