import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { assertCanManageSurvey } from '@/lib/rbac'


export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

const schema = z.object({
  order: z.number().int().min(1),
  type: z.enum([
    'text','textarea','number','email','phone','single_choice','multiple_choice','dropdown','rating','scale','date','time','datetime','file_upload','location','signature'
  ] as const),
  question: z.string().min(1),
  description: z.string().optional(),
  required: z.boolean().default(false),
  validation: z.any().optional(),
  options: z.any().optional(),
  logic: z.any().optional()
})

export async function POST(req: Request, { params }: Params) {
  const prisma = getDB();
try {
    // Authentication
    const user = await requireUser()

    // Authorization - ensure user can manage this survey
    await assertCanManageSurvey(user, params.id)

    const json = await req.json()
    const data = schema.parse(json)
    const created = await prisma.surveyQuestion.create({
      data: { surveyId: params.id, ...data }
    })
    return NextResponse.json(created, { status: 201 })
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

