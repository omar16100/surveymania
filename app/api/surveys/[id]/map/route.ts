import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'


export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const prisma = getDB();
try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch responses with location data
    const responses = await prisma.surveyResponse.findMany({
      where: {
        surveyId: params.id,
        latitude: { not: null },
        longitude: { not: null }
      },
      select: {
        id: true,
        sessionId: true,
        latitude: true,
        longitude: true,
        locationAccuracy: true,
        submittedAt: true,
        status: true,
        answers: {
          include: {
            question: {
              select: {
                id: true,
                question: true,
                type: true,
                order: true
              }
            }
          },
          orderBy: {
            question: {
              order: 'asc'
            }
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    })

    // Convert to GeoJSON features
    const features = responses.map(r => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [Number(r.longitude), Number(r.latitude)]
      },
      properties: {
        id: r.id,
        sessionId: r.sessionId,
        accuracy: r.locationAccuracy ? Number(r.locationAccuracy) : null,
        submittedAt: r.submittedAt?.toISOString(),
        status: r.status,
        answers: r.answers.map(a => ({
          questionId: a.questionId,
          question: a.question.question,
          type: a.question.type,
          order: a.question.order,
          answerType: a.answerType,
          answerText: a.answerText,
          answerNumber: a.answerNumber ? Number(a.answerNumber) : null,
          answerChoices: a.answerChoices
        }))
      }
    }))

    return NextResponse.json({
      type: 'FeatureCollection',
      features
    })
  } catch (error: any) {
    console.error('Map data error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
