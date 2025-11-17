import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { publishToChannel } from '@/lib/sse'


export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

const resolveCommentSchema = z.object({
  isResolved: z.boolean()
})

// PATCH /api/comments/[id]/resolve - Resolve or unresolve a comment
export async function PATCH(req: NextRequest, { params }: Params) {
  const prisma = getDB();
try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json()
    const data = resolveCommentSchema.parse(json)

    // Verify comment exists
    const existingComment = await prisma.comment.findUnique({
      where: { id: params.id },
      select: { id: true, responseId: true }
    })

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Update comment resolution status
    const comment = await prisma.comment.update({
      where: { id: params.id },
      data: {
        isResolved: data.isResolved,
        resolvedAt: data.isResolved ? new Date() : null,
        resolvedById: data.isResolved ? userId : null
      },
      include: {
        author: {
          select: {
            clerkId: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        resolvedBy: {
          select: {
            clerkId: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Emit real-time event via SSE
    publishToChannel(`response.${existingComment.responseId}`, 'comment:resolved', {
      id: comment.id,
      responseId: existingComment.responseId,
      isResolved: comment.isResolved,
      resolvedAt: comment.resolvedAt?.toISOString() || null,
      resolvedBy: comment.resolvedBy ? {
        clerkId: comment.resolvedBy.clerkId,
        firstName: comment.resolvedBy.firstName,
        lastName: comment.resolvedBy.lastName
      } : null
    })

    return NextResponse.json({ comment })
  } catch (error: any) {
    console.error('Resolve comment error:', error)
    const status = error instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
