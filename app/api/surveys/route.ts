import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'


export const dynamic = 'force-dynamic'

const settingsSchema = z.object({
  isPublic: z.boolean().default(true),
  requireAuth: z.boolean().default(false),
  allowAnonymous: z.boolean().default(true),
  multipleResponses: z.boolean().default(false),
  locationRequired: z.boolean().default(false),
  locationAccuracy: z.number().default(0)
})

const createSurveySchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  organizationId: z.string().optional(), // will use a dummy org for now
  settings: settingsSchema,
  questions: z.array(z.object({
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
  })).default([])
})

export async function GET() {
  const prisma = getDB();
  try {
    const user = await requireUser()
    const me = await prisma.user.findUnique({ where: { clerkId: user.id }, select: { organizationId: true } })
    const surveys = await prisma.survey.findMany({
      where: me?.organizationId ? { organizationId: me.organizationId } : undefined,
      include: {
        _count: {
          select: {
            questions: true,
            responses: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(surveys)
  } catch (e: any) {
    const status = e.message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: e.message }, { status })
  }
}

export async function POST(req: Request) {
  const prisma = getDB();
  try {
    const user = await requireUser()
    const json = await req.json()
    const body = createSurveySchema.parse(json)

    // Ensure an organization exists or fallback to a single org per dev
    let organizationId = body.organizationId
    if (!organizationId) {
      const me = await prisma.user.findUnique({ where: { clerkId: user.id }, select: { organizationId: true } })
      if (!me?.organizationId) {
        const devOrg = await prisma.organization.create({ data: { slug: `dev-org-${user.id}`.slice(0, 48), name: 'Dev Org', ownerId: user.id, settings: '{}' } })
        await prisma.user.update({ where: { clerkId: user.id }, data: { organizationId: devOrg.id } })
        organizationId = devOrg.id
      } else {
        organizationId = me.organizationId
      }
    }

    const created = await prisma.survey.create({
      data: {
        title: body.title,
        description: body.description,
        organizationId,
        createdBy: user.id,
        status: 'draft',
        settings: JSON.stringify(body.settings),
        questions: {
          create: body.questions.map((q) => ({
            order: q.order,
            type: q.type as any,
            question: q.question,
            description: q.description,
            required: q.required,
            validation: q.validation,
            options: q.options,
            logic: q.logic
          }))
        }
      },
      select: { id: true }
    })

    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    const status = e instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: e.message }, { status })
  }
}
