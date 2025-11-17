import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'


export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

// DELETE /api/invites/[id] - Revoke invite
export async function DELETE(_req: NextRequest, { params }: Params) {
  const prisma = getDB();
try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get invite
    const invite = await prisma.invite.findUnique({
      where: { id: params.id },
      include: {
        organization: {
          select: { ownerId: true }
        }
      }
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    // Check if user has permission (owner, admin, or the person who sent the invite)
    const isOwner = invite.organization.ownerId === userId
    const isSender = invite.invitedById === userId

    if (!isOwner && !isSender) {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          uniq_org_member: {
            organizationId: invite.organizationId,
            userId
          }
        }
      })

      if (membership?.role !== 'admin') {
        return NextResponse.json({ error: 'Not authorized to revoke this invite' }, { status: 403 })
      }
    }

    // Update invite status to revoked
    await prisma.invite.update({
      where: { id: params.id },
      data: { status: 'revoked' }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Revoke invite error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
