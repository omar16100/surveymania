import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { z } from 'zod'
import { publishToChannel } from '@/lib/sse'
import { requireUser } from '@/lib/auth'
import { canReadSurveyInOrg } from '@/lib/rbac'
import { validateResponseLocation } from '@/lib/geofence'


export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

const submitSchema = z.object({
  respondentId: z.string().optional(),
  sessionId: z.string().min(1),
  answers: z.array(z.object({
    questionId: z.string(),
    answerType: z.enum(['text','number','choice','choices','file','location'] as const),
    answerText: z.string().optional(),
    answerNumber: z.number().optional(),
    answerChoices: z.array(z.string()).optional(),
    answerFile: z.any().optional(),
  })).default([]),
  location: z.object({ latitude: z.number(), longitude: z.number(), accuracy: z.number().optional() }).optional(),
  metadata: z.any().optional(),
  userAgent: z.string().optional()
})

export async function GET(_: Request, { params }: Params) {
  const prisma = getDB();
try {
    // Authentication - only authenticated users can view responses
    const user = await requireUser()

    // Authorization - check if user has access to this survey's organization
    const allowed = await canReadSurveyInOrg(user.id, params.id)
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to view responses for this survey' }, { status: 403 })
    }

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

    return NextResponse.json({
      survey: {
        id: survey.id,
        title: survey.title,
        questions: survey.questions
      },
      responses,
      stats: {
        total: totalResponses,
        completed: completedResponses,
        completionRate: Math.round(completionRate * 10) / 10
      }
    })
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: Params) {
  const prisma = getDB();
try {
    const json = await req.json()
    const data = submitSchema.parse(json)

    // Validate survey is active and fetch questions with validation rules
    const survey = await prisma.survey.findUnique({
      where: { id: params.id },
      select: {
        status: true,
        questions: {
          select: { id: true, type: true, question: true, required: true, options: true, validation: true }
        },
        campaigns: {
          where: { status: 'active' },
          select: { geofence: true }
        }
      }
    })
    if (!survey) return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    if (survey.status !== 'active') return NextResponse.json({ error: 'Survey not accepting responses' }, { status: 400 })

    // Geofence validation if campaign has one
    const activeCampaign = survey.campaigns[0]
    if (activeCampaign?.geofence) {
      const locationValidation = validateResponseLocation(
        data.location?.latitude ?? null,
        data.location?.longitude ?? null,
        activeCampaign.geofence
      )
      if (!locationValidation.valid) {
        return NextResponse.json({ error: locationValidation.error }, { status: 403 })
      }
    }

    // Server-side validation of answers against question rules
    for (const question of survey.questions) {
      const answer = data.answers.find(a => a.questionId === question.id)
      const validation = question.validation as any

      // Required validation
      if (question.required) {
        if (!answer) {
          return NextResponse.json({ error: `Question "${question.question}" is required` }, { status: 400 })
        }
        if (answer.answerType === 'text' && !answer.answerText) {
          return NextResponse.json({ error: `Question "${question.question}" is required` }, { status: 400 })
        }
        if (answer.answerType === 'number' && answer.answerNumber === null) {
          return NextResponse.json({ error: `Question "${question.question}" is required` }, { status: 400 })
        }
        if (answer.answerType === 'choices' && (!answer.answerChoices || answer.answerChoices.length === 0)) {
          return NextResponse.json({ error: `Question "${question.question}" requires at least one selection` }, { status: 400 })
        }
      }

      if (!answer) continue

      // Type-specific validation
      if (['text', 'textarea'].includes(question.type) && answer.answerText && validation) {
        if (validation.minLength && answer.answerText.length < validation.minLength) {
          return NextResponse.json({ error: `"${question.question}" must be at least ${validation.minLength} characters` }, { status: 400 })
        }
        if (validation.maxLength && answer.answerText.length > validation.maxLength) {
          return NextResponse.json({ error: `"${question.question}" must be at most ${validation.maxLength} characters` }, { status: 400 })
        }
        if (validation.regex) {
          const regex = new RegExp(validation.regex)
          if (!regex.test(answer.answerText)) {
            return NextResponse.json({ error: validation.regexMessage || `"${question.question}" has invalid format` }, { status: 400 })
          }
        }
      }

      if (question.type === 'number' && answer.answerNumber !== null && answer.answerNumber !== undefined && validation) {
        if (validation.minValue !== undefined && answer.answerNumber < validation.minValue) {
          return NextResponse.json({ error: `"${question.question}" must be at least ${validation.minValue}` }, { status: 400 })
        }
        if (validation.maxValue !== undefined && answer.answerNumber > validation.maxValue) {
          return NextResponse.json({ error: `"${question.question}" must be at most ${validation.maxValue}` }, { status: 400 })
        }
      }

      if (['single_choice', 'dropdown'].includes(question.type)) {
        const options = question.options as string[] || []
        if (answer.answerText && !options.includes(answer.answerText)) {
          return NextResponse.json({ error: `Invalid option for "${question.question}"` }, { status: 400 })
        }
      }

      if (question.type === 'multiple_choice' && answer.answerChoices) {
        const options = question.options as string[] || []
        const invalid = answer.answerChoices.find(c => !options.includes(c))
        if (invalid) {
          return NextResponse.json({ error: `Invalid option "${invalid}" for "${question.question}"` }, { status: 400 })
        }
      }
    }

    const created = await prisma.surveyResponse.create({
      data: {
        surveyId: params.id,
        respondentId: data.respondentId ?? null,
        sessionId: data.sessionId,
        status: 'completed',
        latitude: data.location?.latitude ?? null,
        longitude: data.location?.longitude ?? null,
        locationAccuracy: data.location?.accuracy ?? null,
        metadata: data.metadata ?? {},
        userAgent: data.userAgent ?? null,
        submittedAt: new Date(),
        completedAt: new Date(),
        answers: {
          create: data.answers.map((a) => ({
            questionId: a.questionId,
            answerType: a.answerType as any,
            answerText: a.answerText,
            answerNumber: (a.answerNumber as any) ?? null,
            answerChoices: a.answerChoices ?? [] ,
            answerFile: a.answerFile ?? null,
          }))
        }
      },
      include: { answers: true }
    })

    // Emit real-time event via SSE
    publishToChannel(`survey.${params.id}`, 'survey:response:new', {
      id: created.id,
      surveyId: params.id,
      sessionId: created.sessionId,
      status: created.status,
      submittedAt: created.submittedAt?.toISOString() || null,
      latitude: created.latitude,
      longitude: created.longitude,
      answers: created.answers.map(a => ({
        questionId: a.questionId,
        answerType: a.answerType,
        answerText: a.answerText,
        answerNumber: a.answerNumber,
        answerChoices: a.answerChoices
      }))
    })

    return NextResponse.json({ id: created.id }, { status: 201 })
  } catch (e: any) {
    const status = e instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: e.message }, { status })
  }
}
