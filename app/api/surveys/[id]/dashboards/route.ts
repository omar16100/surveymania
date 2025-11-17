import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { canReadSurveyInOrg, assertCanManageSurvey } from '@/lib/rbac'


export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

const createSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  layout: z.string().optional(),
  widgets: z.array(z.object({
    type: z.enum(['metric_card', 'chart', 'table', 'map', 'text']),
    config: z.string(),
    gridPosition: z.string(),
    order: z.number().int()
  })).optional()
})

// GET /api/surveys/[id]/dashboards - List all dashboards for a survey
export async function GET(_: Request, { params }: Params) {
  const prisma = getDB()
  try {
    const user = await requireUser()

    // Authorization - check if user has access to this survey
    const allowed = await canReadSurveyInOrg(user.id, params.id)
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to view dashboards for this survey' }, { status: 403 })
    }

    const dashboards = await prisma.dashboard.findMany({
      where: { surveyId: params.id },
      include: {
        widgets: {
          orderBy: { order: 'asc' }
        },
        user: {
          select: {
            clerkId: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ dashboards })
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST /api/surveys/[id]/dashboards - Create a new dashboard
export async function POST(req: Request, { params }: Params) {
  const prisma = getDB()
  try {
    const user = await requireUser()

    // Authorization - check if user can manage this survey
    await assertCanManageSurvey(user, params.id)

    const json = await req.json()
    const data = createSchema.parse(json)

    // Get survey to check organization
    const survey = await prisma.survey.findUnique({
      where: { id: params.id },
      select: { organizationId: true }
    })

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    // Create dashboard with widgets
    const dashboard = await prisma.dashboard.create({
      data: {
        surveyId: params.id,
        userId: user.id,
        organizationId: survey.organizationId,
        name: data.name,
        description: data.description ?? null,
        layout: data.layout ?? '{}',
        widgets: data.widgets ? {
          create: data.widgets.map(w => ({
            type: w.type,
            config: w.config,
            gridPosition: w.gridPosition,
            order: w.order
          }))
        } : undefined
      },
      include: {
        widgets: {
          orderBy: { order: 'asc' }
        }
      }
    })

    return NextResponse.json({ dashboard }, { status: 201 })
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
