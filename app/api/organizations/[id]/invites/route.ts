import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { sendInviteEmail } from '@/lib/email'
import crypto from 'crypto'

// Note: Edge runtime disabled due to email dependencies
// export const runtime = 'edge'
export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer'])
})

// GET /api/organizations/[id]/invites - List organization invites
export async function GET(_req: NextRequest, { params }: Params) {
  const prisma = getDB();
try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is org member
    const membership = await prisma.organizationMember.findUnique({
      where: {
        uniq_org_member: {
          organizationId: params.id,
          userId
        }
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 })
    }

    const invites = await prisma.invite.findMany({
      where: { organizationId: params.id },
      include: {
        invitedBy: {
          select: {
            clerkId: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ invites })
  } catch (error: any) {
    console.error('List invites error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/organizations/[id]/invites - Create invite
export async function POST(req: NextRequest, { params }: Params) {
  const prisma = getDB();
try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json()
    const data = createInviteSchema.parse(json)

    // Verify user is admin or owner
    const org = await prisma.organization.findUnique({
      where: { id: params.id },
      select: { ownerId: true, name: true }
    })

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        uniq_org_member: {
          organizationId: params.id,
          userId
        }
      }
    })

    const isOwner = org.ownerId === userId
    const isAdmin = membership?.role === 'admin'

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Only admins can invite members' }, { status: 403 })
    }

    // Check if user is already a member
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: params.id,
        user: { email: data.email }
      }
    })

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 400 })
    }

    // Check for pending invite
    const existingInvite = await prisma.invite.findFirst({
      where: {
        organizationId: params.id,
        email: data.email,
        status: 'pending'
      }
    })

    if (existingInvite) {
      return NextResponse.json({ error: 'Invite already sent to this email' }, { status: 400 })
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex')

    // Create invite (expires in 7 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invite = await prisma.invite.create({
      data: {
        email: data.email,
        token,
        organizationId: params.id,
        role: data.role,
        invitedById: userId,
        expiresAt
      },
      include: {
        invitedBy: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Send invitation email (non-blocking)
    sendInviteEmail({
      to: data.email,
      organizationName: org.name,
      inviterName: `${invite.invitedBy.firstName} ${invite.invitedBy.lastName}`,
      inviteToken: token,
      role: data.role
    }).catch(err => console.error('Email send error:', err))

    return NextResponse.json({ invite }, { status: 201 })
  } catch (error: any) {
    console.error('Create invite error:', error)
    const status = error instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
