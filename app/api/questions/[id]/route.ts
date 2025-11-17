import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { canManageSurvey } from '@/lib/rbac'


export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

const schema = z.object({
  order: z.number().int().min(1).optional(),
  question: z.string().optional(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  validation: z.any().optional(),
  options: z.any().optional(),
  logic: z.any().optional()
})

export async function PATCH(req: Request, { params }: Params) {
  const prisma = getDB();
try {
    // Authentication
    const user = await requireUser()

    // Load question to get surveyId
    const existingQuestion = await prisma.surveyQuestion.findUnique({
      where: { id: params.id },
      select: { surveyId: true }
    })

    if (!existingQuestion) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // Authorization
    const allowed = await canManageSurvey(user.id, existingQuestion.surveyId)
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to modify this question' }, { status: 403 })
    }

    const json = await req.json()
    const data = schema.parse(json)
    const updated = await prisma.surveyQuestion.update({ where: { id: params.id }, data })
    return NextResponse.json(updated)
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const status = e instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: e.message }, { status })
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const prisma = getDB();
try {
    // Authentication
    const user = await requireUser()

    // Load question to get surveyId
    const existingQuestion = await prisma.surveyQuestion.findUnique({
      where: { id: params.id },
      select: { surveyId: true }
    })

    if (!existingQuestion) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // Authorization
    const allowed = await canManageSurvey(user.id, existingQuestion.surveyId)
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to delete this question' }, { status: 403 })
    }

    await prisma.surveyQuestion.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

