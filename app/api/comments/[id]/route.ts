import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { publishToChannel } from '@/lib/sse'


export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000)
})

// PATCH /api/comments/[id] - Update a comment
export async function PATCH(req: NextRequest, { params }: Params) {
  const prisma = getDB();
try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json()
    const data = updateCommentSchema.parse(json)

    // Verify comment exists and user is author
    const existingComment = await prisma.comment.findUnique({
      where: { id: params.id },
      select: { authorId: true, responseId: true }
    })

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (existingComment.authorId !== userId) {
      return NextResponse.json({ error: 'You can only edit your own comments' }, { status: 403 })
    }

    const comment = await prisma.comment.update({
      where: { id: params.id },
      data: {
        content: data.content,
        updatedAt: new Date()
      },
      include: {
        author: {
          select: {
            clerkId: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    })

    // Emit real-time event via SSE
    publishToChannel(`response.${existingComment.responseId}`, 'comment:updated', {
      id: comment.id,
      responseId: existingComment.responseId,
      content: comment.content,
      updatedAt: comment.updatedAt.toISOString()
    })

    return NextResponse.json({ comment })
  } catch (error: any) {
    console.error('Update comment error:', error)
    const status = error instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

// DELETE /api/comments/[id] - Delete a comment
export async function DELETE(_req: NextRequest, { params }: Params) {
  const prisma = getDB();
try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify comment exists and user is author
    const existingComment = await prisma.comment.findUnique({
      where: { id: params.id },
      select: { authorId: true, responseId: true }
    })

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (existingComment.authorId !== userId) {
      return NextResponse.json({ error: 'You can only delete your own comments' }, { status: 403 })
    }

    // Delete comment (cascades to replies)
    await prisma.comment.delete({
      where: { id: params.id }
    })

    // Emit real-time event via SSE
    publishToChannel(`response.${existingComment.responseId}`, 'comment:deleted', {
      id: params.id,
      responseId: existingComment.responseId
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete comment error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
