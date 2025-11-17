import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'


export const dynamic = 'force-dynamic'

type Params = { params: { token: string } }

// GET /api/dashboards/public/[token] - Get public dashboard (no auth required)
export async function GET(_: Request, { params }: Params) {
  const prisma = getDB()
  try {
    const dashboard = await prisma.dashboard.findFirst({
      where: {
        publicToken: params.token,
        isPublic: true
      },
      include: {
        widgets: {
          orderBy: { order: 'asc' }
        },
        survey: {
          select: {
            id: true,
            title: true,
            description: true
          }
        },
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found or not public' }, { status: 404 })
    }

    // Don't expose sensitive fields
    const { userId, organizationId, ...publicDashboard } = dashboard

    return NextResponse.json({ dashboard: publicDashboard })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
