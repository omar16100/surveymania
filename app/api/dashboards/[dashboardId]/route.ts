import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { canManageSurvey } from '@/lib/rbac'


export const dynamic = 'force-dynamic'

type Params = { params: { dashboardId: string } }

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  layout: z.string().optional(),
  isPublic: z.boolean().optional(),
  widgets: z.array(z.object({
    id: z.string().optional(),
    type: z.enum(['metric_card', 'chart', 'table', 'map', 'text']),
    config: z.string(),
    gridPosition: z.string(),
    order: z.number().int()
  })).optional()
})

// GET /api/dashboards/[dashboardId] - Get dashboard details
export async function GET(_: Request, { params }: Params) {
  const prisma = getDB()
  try {
    const user = await requireUser()

    const dashboard = await prisma.dashboard.findUnique({
      where: { id: params.dashboardId },
      include: {
        widgets: {
          orderBy: { order: 'asc' }
        },
        survey: {
          select: {
            id: true,
            title: true,
            organizationId: true
          }
        },
        user: {
          select: {
            clerkId: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
    }

    // Authorization - check if user can access this dashboard's survey
    const allowed = await canManageSurvey(user.id, dashboard.surveyId)
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to view this dashboard' }, { status: 403 })
    }

    return NextResponse.json({ dashboard })
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH /api/dashboards/[dashboardId] - Update dashboard
export async function PATCH(req: Request, { params }: Params) {
  const prisma = getDB()
  try {
    const user = await requireUser()

    const dashboard = await prisma.dashboard.findUnique({
      where: { id: params.dashboardId },
      select: { surveyId: true, isPublic: true }
    })

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
    }

    // Authorization
    const allowed = await canManageSurvey(user.id, dashboard.surveyId)
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to update this dashboard' }, { status: 403 })
    }

    const json = await req.json()
    const data = updateSchema.parse(json)

    // Generate public token if making dashboard public
    let publicToken = undefined
    if (data.isPublic && !dashboard.isPublic) {
      publicToken = crypto.randomUUID()
    }

    // Update dashboard
    const updated = await prisma.dashboard.update({
      where: { id: params.dashboardId },
      data: {
        name: data.name,
        description: data.description,
        layout: data.layout,
        isPublic: data.isPublic,
        publicToken: publicToken
      },
      include: {
        widgets: {
          orderBy: { order: 'asc' }
        }
      }
    })

    // Update widgets if provided
    if (data.widgets) {
      // Delete existing widgets
      await prisma.dashboardWidget.deleteMany({
        where: { dashboardId: params.dashboardId }
      })

      // Create new widgets
      await prisma.dashboardWidget.createMany({
        data: data.widgets.map(w => ({
          dashboardId: params.dashboardId,
          type: w.type,
          config: w.config,
          gridPosition: w.gridPosition,
          order: w.order
        }))
      })

      // Refetch with new widgets
      const refetched = await prisma.dashboard.findUnique({
        where: { id: params.dashboardId },
        include: {
          widgets: {
            orderBy: { order: 'asc' }
          }
        }
      })

      return NextResponse.json({ dashboard: refetched })
    }

    return NextResponse.json({ dashboard: updated })
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const status = e instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: e.message }, { status })
  }
}

// DELETE /api/dashboards/[dashboardId] - Delete dashboard
export async function DELETE(_: Request, { params }: Params) {
  const prisma = getDB()
  try {
    const user = await requireUser()

    const dashboard = await prisma.dashboard.findUnique({
      where: { id: params.dashboardId },
      select: { surveyId: true }
    })

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
    }

    // Authorization
    const allowed = await canManageSurvey(user.id, dashboard.surveyId)
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to delete this dashboard' }, { status: 403 })
    }

    await prisma.dashboard.delete({
      where: { id: params.dashboardId }
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
