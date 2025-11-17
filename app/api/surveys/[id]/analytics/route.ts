import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'


export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

export async function GET(req: NextRequest, { params }: Params) {
  const prisma = getDB();
try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const range = searchParams.get('range') || '30d'

    // Calculate date filter
    let dateFilter: Date | undefined
    if (range === '7d') {
      dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    } else if (range === '30d') {
      dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }

    // Fetch survey with questions
    const survey = await prisma.survey.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        description: true,
        questions: {
          select: {
            id: true,
            type: true,
            question: true,
            order: true,
            options: true
          },
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    // Fetch responses
    const responses = await prisma.surveyResponse.findMany({
      where: {
        surveyId: params.id,
        ...(dateFilter ? { submittedAt: { gte: dateFilter } } : {})
      },
      include: {
        answers: {
          include: {
            question: {
              select: { id: true, type: true, order: true }
            }
          }
        }
      },
      orderBy: { submittedAt: 'asc' }
    })

    // Calculate metrics
    const totalResponses = responses.length
    const completedResponses = responses.filter(r => r.status === 'completed').length
    const completionRate = totalResponses > 0 ? (completedResponses / totalResponses) * 100 : 0
    const responsesWithLocation = responses.filter(r => r.latitude !== null && r.longitude !== null).length

    // Calculate average completion time
    const completionTimes = responses
      .filter(r => r.completedAt && r.startedAt)
      .map(r => {
        const completed = new Date(r.completedAt!).getTime()
        const started = new Date(r.startedAt).getTime()
        return (completed - started) / 1000 // seconds
      })

    const averageTimeSeconds = completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : undefined

    // Generate time series data
    const timeSeries = generateTimeSeries(responses, range)

    // Analyze each question
    const questionAnalytics = survey.questions.map(question => {
      const questionAnswers = responses.flatMap(r =>
        r.answers.filter(a => a.questionId === question.id)
      )

      const analytics: any = {
        id: question.id,
        type: question.type,
        question: question.question,
        order: question.order,
        responseCount: questionAnswers.length
      }

      // Choice-based questions: distribution
      if (['single_choice', 'dropdown'].includes(question.type)) {
        const distribution: Record<string, number> = {}
        questionAnswers.forEach(a => {
          if (a.answerText) {
            distribution[a.answerText] = (distribution[a.answerText] || 0) + 1
          }
        })
        analytics.distribution = distribution
      }

      // Multiple choice: distribution
      if (question.type === 'multiple_choice') {
        const distribution: Record<string, number> = {}
        questionAnswers.forEach(a => {
          a.answerChoices.forEach(choice => {
            distribution[choice] = (distribution[choice] || 0) + 1
          })
        })
        analytics.distribution = distribution
      }

      // Numeric questions: average, min, max
      if (['number', 'rating', 'scale'].includes(question.type)) {
        const numbers = questionAnswers
          .map(a => a.answerNumber)
          .filter((n): n is number => n !== null && n !== undefined)
          .map(n => Number(n))

        if (numbers.length > 0) {
          analytics.average = numbers.reduce((a, b) => a + b, 0) / numbers.length
          analytics.min = Math.min(...numbers)
          analytics.max = Math.max(...numbers)

          // Also create distribution for rating/scale
          if (['rating', 'scale'].includes(question.type)) {
            const distribution: Record<string, number> = {}
            numbers.forEach(n => {
              const key = n.toString()
              distribution[key] = (distribution[key] || 0) + 1
            })
            analytics.distribution = distribution
          }
        }
      }

      // Text questions: collect text responses for word cloud
      if (['text', 'textarea', 'email'].includes(question.type)) {
        const textResponses = questionAnswers
          .map(a => a.answerText)
          .filter((t): t is string => t !== null && t !== undefined && t.trim().length > 0)

        if (textResponses.length > 0) {
          analytics.textResponses = textResponses
        }
      }

      return analytics
    })

    return NextResponse.json({
      survey: {
        id: survey.id,
        title: survey.title,
        description: survey.description
      },
      metrics: {
        totalResponses,
        completedResponses,
        completionRate: Math.round(completionRate * 10) / 10,
        averageTimeSeconds,
        responsesWithLocation
      },
      questions: questionAnalytics,
      timeSeries
    })
  } catch (error: any) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function generateTimeSeries(
  responses: any[],
  range: string
): Array<{ date: string; count: number }> {
  if (responses.length === 0) return []

  // Group responses by date
  const dateMap = new Map<string, number>()

  responses.forEach(r => {
    if (!r.submittedAt) return
    const date = new Date(r.submittedAt)
    const dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD
    dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1)
  })

  // Convert to array and sort
  const timeSeries = Array.from(dateMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Fill gaps for last 7 or 30 days
  if (range === '7d' || range === '30d') {
    const days = range === '7d' ? 7 : 30
    const filled: Array<{ date: string; count: number }> = []

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dateKey = date.toISOString().split('T')[0]
      const existing = timeSeries.find(t => t.date === dateKey)
      filled.push({
        date: dateKey,
        count: existing ? existing.count : 0
      })
    }

    return filled
  }

  return timeSeries
}
