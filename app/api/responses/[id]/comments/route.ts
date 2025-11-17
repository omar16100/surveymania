import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { publishToChannel } from '@/lib/sse'


export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  parentId: z.string().optional(),
  mentions: z.array(z.string()).optional()
})

// GET /api/responses/[id]/comments - Get all comments for a response
export async function GET(_req: NextRequest, { params }: Params) {
  const prisma = getDB();
try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const comments = await prisma.comment.findMany({
      where: { responseId: params.id },
      include: {
        author: {
          select: {
            clerkId: true,
            email: true,
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
        },
        replies: {
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
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      where: {
        responseId: params.id,
        parentId: null // Only get top-level comments, replies are included
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ comments })
  } catch (error: any) {
    console.error('Get comments error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/responses/[id]/comments - Create a comment
export async function POST(req: NextRequest, { params }: Params) {
  const prisma = getDB();
try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json()
    const data = createCommentSchema.parse(json)

    // Verify response exists
    const response = await prisma.surveyResponse.findUnique({
      where: { id: params.id },
      select: { id: true, surveyId: true }
    })

    if (!response) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 })
    }

    // If parentId provided, verify parent comment exists
    if (data.parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: data.parentId }
      })

      if (!parentComment) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 })
      }

      if (parentComment.responseId !== params.id) {
        return NextResponse.json({ error: 'Parent comment does not belong to this response' }, { status: 400 })
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content: data.content,
        responseId: params.id,
        authorId: userId,
        parentId: data.parentId || null,
        mentions: data.mentions || []
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
    publishToChannel(`response.${params.id}`, 'comment:new', {
      id: comment.id,
      responseId: params.id,
      surveyId: response.surveyId,
      content: comment.content,
      parentId: comment.parentId,
      author: {
        clerkId: comment.author.clerkId,
        firstName: comment.author.firstName,
        lastName: comment.author.lastName,
        avatar: comment.author.avatar
      },
      mentions: comment.mentions,
      createdAt: comment.createdAt.toISOString()
    })

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error: any) {
    console.error('Create comment error:', error)
    const status = error instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
