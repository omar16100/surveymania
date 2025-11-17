import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'


export const dynamic = 'force-dynamic'

type Params = { params: { token: string } }

// POST /api/invites/[token]/accept - Accept invite
export async function POST(_req: NextRequest, { params }: Params) {
  const prisma = getDB();
try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { email: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find invite by token
    const invite = await prisma.invite.findUnique({
      where: { token: params.token },
      include: {
        organization: {
          select: { id: true, name: true }
        }
      }
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invite token' }, { status: 404 })
    }

    // Check if invite is pending
    if (invite.status !== 'pending') {
      return NextResponse.json({ error: `Invite is ${invite.status}` }, { status: 400 })
    }

    // Check if invite is expired
    if (new Date() > new Date(invite.expiresAt)) {
      await prisma.invite.update({
        where: { id: invite.id },
        data: { status: 'expired' }
      })
      return NextResponse.json({ error: 'Invite has expired' }, { status: 400 })
    }

    // Check if email matches
    if (invite.email !== user.email) {
      return NextResponse.json({ error: 'This invite was sent to a different email address' }, { status: 400 })
    }

    // Check if user is already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        uniq_org_member: {
          organizationId: invite.organizationId,
          userId
        }
      }
    })

    if (existingMember) {
      return NextResponse.json({ error: 'You are already a member of this organization' }, { status: 400 })
    }

    // Create organization membership
    const member = await prisma.organizationMember.create({
      data: {
        organizationId: invite.organizationId,
        userId,
        role: invite.role
      }
    })

    // Update invite status
    await prisma.invite.update({
      where: { id: invite.id },
      data: {
        status: 'accepted',
        acceptedAt: new Date()
      }
    })

    // Update user's current organization if they don't have one
    const currentUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true }
    })

    if (!currentUser?.organizationId) {
      await prisma.user.update({
        where: { clerkId: userId },
        data: { organizationId: invite.organizationId }
      })
    }

    return NextResponse.json({
      success: true,
      organization: invite.organization,
      member
    })
  } catch (error: any) {
    console.error('Accept invite error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET /api/invites/[token]/accept - Get invite details (for acceptance page)
export async function GET(_req: NextRequest, { params }: Params) {
  const prisma = getDB();
try {
    const invite = await prisma.invite.findUnique({
      where: { token: params.token },
      include: {
        organization: {
          select: { id: true, name: true }
        },
        invitedBy: {
          select: { firstName: true, lastName: true }
        }
      }
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invite token' }, { status: 404 })
    }

    // Check if expired
    const isExpired = new Date() > new Date(invite.expiresAt)

    return NextResponse.json({
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        status: isExpired ? 'expired' : invite.status,
        expiresAt: invite.expiresAt,
        organization: invite.organization,
        invitedBy: invite.invitedBy,
        createdAt: invite.createdAt
      }
    })
  } catch (error: any) {
    console.error('Get invite error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
