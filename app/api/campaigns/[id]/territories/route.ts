import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

const createSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  boundary: z.string(), // GeoJSON polygon
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  assignedToId: z.string().optional()
})

// GET /api/campaigns/[id]/territories - List all territories for a campaign
export async function GET(_: NextRequest, { params }: Params) {
  const prisma = getDB()
  try {
    const user = await requireUser()

    // Check if campaign exists and user has access
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      select: { id: true, surveyId: true }
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Get territories with assigned user info
    const territories = await prisma.territory.findMany({
      where: { campaignId: params.id },
      include: {
        assignedTo: {
          select: {
            clerkId: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        },
        createdBy: {
          select: {
            clerkId: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ territories })
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST /api/campaigns/[id]/territories - Create a new territory
export async function POST(req: NextRequest, { params }: Params) {
  const prisma = getDB()
  try {
    const user = await requireUser()

    // Check if campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      select: { id: true, surveyId: true }
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const json = await req.json()
    const data = createSchema.parse(json)

    // Validate boundary is valid GeoJSON
    try {
      JSON.parse(data.boundary)
    } catch {
      return NextResponse.json(
        { error: 'Invalid boundary format. Must be valid GeoJSON.' },
        { status: 400 }
      )
    }

    // Create territory
    const territory = await prisma.territory.create({
      data: {
        campaignId: params.id,
        name: data.name,
        description: data.description || null,
        boundary: data.boundary,
        color: data.color || '#673ab7',
        assignedToId: data.assignedToId || null,
        createdById: user.id
      },
      include: {
        assignedTo: {
          select: {
            clerkId: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        }
      }
    })

    return NextResponse.json({ territory }, { status: 201 })
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const status = e instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: e.message }, { status })
  }
}
