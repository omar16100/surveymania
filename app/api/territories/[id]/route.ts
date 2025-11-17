import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  boundary: z.string().optional(), // GeoJSON polygon
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  assignedToId: z.string().nullable().optional()
})

// GET /api/territories/[id] - Get territory details
export async function GET(_: NextRequest, { params }: Params) {
  const prisma = getDB()
  try {
    const user = await requireUser()

    const territory = await prisma.territory.findUnique({
      where: { id: params.id },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            surveyId: true
          }
        },
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
      }
    })

    if (!territory) {
      return NextResponse.json({ error: 'Territory not found' }, { status: 404 })
    }

    return NextResponse.json({ territory })
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH /api/territories/[id] - Update territory
export async function PATCH(req: NextRequest, { params }: Params) {
  const prisma = getDB()
  try {
    const user = await requireUser()

    const territory = await prisma.territory.findUnique({
      where: { id: params.id },
      select: { id: true, campaignId: true }
    })

    if (!territory) {
      return NextResponse.json({ error: 'Territory not found' }, { status: 404 })
    }

    const json = await req.json()
    const data = updateSchema.parse(json)

    // Validate boundary if provided
    if (data.boundary) {
      try {
        JSON.parse(data.boundary)
      } catch {
        return NextResponse.json(
          { error: 'Invalid boundary format. Must be valid GeoJSON.' },
          { status: 400 }
        )
      }
    }

    // Update territory
    const updated = await prisma.territory.update({
      where: { id: params.id },
      data: {
        name: data.name,
        description: data.description,
        boundary: data.boundary,
        color: data.color,
        assignedToId: data.assignedToId
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

    return NextResponse.json({ territory: updated })
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const status = e instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: e.message }, { status })
  }
}

// DELETE /api/territories/[id] - Delete territory
export async function DELETE(_: NextRequest, { params }: Params) {
  const prisma = getDB()
  try {
    const user = await requireUser()

    const territory = await prisma.territory.findUnique({
      where: { id: params.id },
      select: { id: true, campaignId: true }
    })

    if (!territory) {
      return NextResponse.json({ error: 'Territory not found' }, { status: 404 })
    }

    await prisma.territory.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
