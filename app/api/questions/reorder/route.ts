import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { assertCanManageSurvey } from '@/lib/rbac'


export const dynamic = 'force-dynamic'

const schema = z.object({
  surveyId: z.string(),
  orders: z.array(z.object({ id: z.string(), order: z.number().int().min(1) }))
})

export async function POST(req: Request) {
  const prisma = getDB();
try {
    // Authentication
    const user = await requireUser()

    const json = await req.json()
    const data = schema.parse(json)

    // Authorization
    await assertCanManageSurvey(user, data.surveyId)

    // Validate all questions belong to the survey
    const questions = await prisma.surveyQuestion.findMany({
      where: { id: { in: data.orders.map(o => o.id) } },
      select: { id: true, surveyId: true }
    })

    // Check if any question IDs are invalid
    if (questions.length !== data.orders.length) {
      return NextResponse.json({ error: 'Invalid question IDs' }, { status: 400 })
    }

    // Check if all questions belong to the specified survey
    const invalidQuestions = questions.filter(q => q.surveyId !== data.surveyId)
    if (invalidQuestions.length > 0) {
      return NextResponse.json({ error: 'Cannot reorder questions from different surveys' }, { status: 400 })
    }

    // Perform reorder in transaction
    await prisma.$transaction(
      data.orders.map(({ id, order }) => prisma.surveyQuestion.update({ where: { id }, data: { order } }))
    )

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (e.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: e.message }, { status: 403 })
    }
    const status = e instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: e.message }, { status })
  }
}

