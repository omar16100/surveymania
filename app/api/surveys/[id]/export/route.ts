import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { generateXLSX, generateJSON, generatePDF, generateGeoJSON, generateKML } from '@/lib/exports'
import { canReadSurveyInOrg } from '@/lib/rbac'


export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

// GET /api/surveys/[id]/export?format=xlsx|json|pdf|geojson|kml
export async function GET(req: NextRequest, { params }: Params) {
  const prisma = getDB();
try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Authorization - check if user has access to this survey
    const allowed = await canReadSurveyInOrg(userId, params.id)
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to export this survey' }, { status: 403 })
    }

    const searchParams = req.nextUrl.searchParams
    const format = searchParams.get('format') || 'csv'

    // Fetch survey with questions
    const survey = await prisma.survey.findUnique({
      where: { id: params.id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          select: { id: true, question: true, type: true, order: true }
        }
      }
    })

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    // Fetch responses with answers
    const responses = await prisma.surveyResponse.findMany({
      where: { surveyId: params.id },
      include: {
        answers: {
          include: {
            question: {
              select: { id: true, question: true, order: true }
            }
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    })

    // Calculate stats
    const totalResponses = responses.length
    const completedResponses = responses.filter(r => r.status === 'completed').length
    const completionRate = totalResponses > 0 ? (completedResponses / totalResponses) * 100 : 0

    const data = {
      survey: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        questions: survey.questions
      },
      responses: responses.map(r => ({
        id: r.id,
        sessionId: r.sessionId,
        status: r.status,
        latitude: r.latitude ? parseFloat(r.latitude.toString()) : null,
        longitude: r.longitude ? parseFloat(r.longitude.toString()) : null,
        submittedAt: r.submittedAt?.toISOString() || null,
        answers: r.answers.map(a => ({
          questionId: a.questionId,
          answerType: a.answerType,
          answerText: a.answerText,
          answerNumber: a.answerNumber ? parseFloat(a.answerNumber.toString()) : null,
          answerChoices: a.answerChoices,
          question: {
            question: a.question.question,
            order: a.question.order
          }
        }))
      })),
      stats: {
        total: totalResponses,
        completed: completedResponses,
        completionRate: Math.round(completionRate * 10) / 10
      }
    }

    let buffer: Buffer
    let contentType: string
    let filename: string

    switch (format.toLowerCase()) {
      case 'xlsx':
        buffer = generateXLSX(data)
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        filename = `${survey.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.xlsx`
        break

      case 'json':
        buffer = Buffer.from(generateJSON(data))
        contentType = 'application/json'
        filename = `${survey.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`
        break

      case 'pdf':
        buffer = generatePDF(data)
        contentType = 'application/pdf'
        filename = `${survey.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`
        break

      case 'geojson':
        buffer = Buffer.from(generateGeoJSON(data))
        contentType = 'application/geo+json'
        filename = `${survey.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.geojson`
        break

      case 'kml':
        buffer = Buffer.from(generateKML(data))
        contentType = 'application/vnd.google-earth.kml+xml'
        filename = `${survey.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.kml`
        break

      default:
        return NextResponse.json({ error: 'Unsupported format' }, { status: 400 })
    }

    // Track export in database (async, non-blocking)
    prisma.export.create({
      data: {
        surveyId: params.id,
        format: format.toUpperCase() as any,
        filters: {},
        fileUrl: '', // Would be S3 URL in production
        fileSize: buffer.length,
        status: 'completed',
        createdBy: userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    }).catch(err => console.error('Export tracking error:', err))

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString()
      }
    })
  } catch (error: any) {
    console.error('Export error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

