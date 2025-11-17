import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'


export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

function escapeCsv(value: any): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export async function GET(_: Request, { params }: Params) {
  const prisma = getDB();
try {
    const survey = await prisma.survey.findUnique({
      where: { id: params.id },
      select: { id: true, title: true, questions: { select: { id: true, question: true, type: true, order: true }, orderBy: { order: 'asc' } } }
    })
    if (!survey) return NextResponse.json({ error: 'Survey not found' }, { status: 404 })

    const responses = await prisma.surveyResponse.findMany({
      where: { surveyId: params.id },
      include: { answers: true },
      orderBy: { submittedAt: 'desc' }
    })

    const questionHeaders = survey.questions.map((q) => q.question)
    const headers = ['Submitted', 'Status', ...questionHeaders]
    const lines: string[] = []
    lines.push(headers.map(escapeCsv).join(','))

    function formatAnswer(ans: any) {
      if (!ans) return ''
      switch (ans.answerType) {
        case 'text':
          return ans.answerText || ''
        case 'number':
          return ans.answerNumber ?? ''
        case 'choice':
          return ans.answerText || ''
        case 'choices':
          return Array.isArray(ans.answerChoices) ? ans.answerChoices.join('; ') : ''
        default:
          return ans.answerText || ''
      }
    }

    for (const r of responses) {
      const submitted = r.submittedAt ? new Date(r.submittedAt).toISOString() : ''
      const row = [submitted, r.status]
      for (const q of survey.questions) {
        const ans = r.answers.find((a) => a.questionId === q.id)
        row.push(formatAnswer(ans))
      }
      lines.push(row.map(escapeCsv).join(','))
    }

    const csv = '\uFEFF' + lines.join('\n')
    const filename = `survey-${survey.title.replace(/[^a-z0-9\-_]+/gi, '_')}-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`
    const res = new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
    return res
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

