import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { canReadSurveyInOrg } from '@/lib/rbac'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

const schema = z.object({
  format: z.enum(['csv', 'xlsx']),
  scope: z.enum(['all', 'filtered', 'selected']),
  columns: z.array(z.string()).min(1),
  filters: z.array(z.object({
    id: z.string(),
    value: z.any()
  })).optional(),
  rowIds: z.array(z.string()).optional()
})

export async function POST(req: NextRequest, { params }: Params) {
  const prisma = getDB()

  try {
    const user = await requireUser()
    const allowed = await canReadSurveyInOrg(user.id, params.id)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to export this survey' },
        { status: 403 }
      )
    }

    const json = await req.json()
    const data = schema.parse(json)

    // Fetch survey with questions
    const survey = await prisma.survey.findUnique({
      where: { id: params.id },
      include: {
        questions: {
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    // Build where clause based on scope
    let where: any = { surveyId: params.id }

    if (data.scope === 'selected' && data.rowIds) {
      where.id = { in: data.rowIds }
    }

    // Fetch responses
    let responses = await prisma.surveyResponse.findMany({
      where,
      include: {
        answers: true
      },
      orderBy: { submittedAt: 'desc' }
    })

    // Apply client-side filters if scope is 'filtered'
    if (data.scope === 'filtered' && data.filters && data.filters.length > 0) {
      responses = responses.filter(response => {
        return data.filters!.every(filter => {
          const { id, value } = filter

          // Handle base columns
          if (id === 'submittedAt') {
            if (!response.submittedAt) return false
            const ts = new Date(response.submittedAt).getTime()
            const from = value?.from ? new Date(value.from).getTime() : -Infinity
            const to = value?.to ? new Date(value.to).getTime() : Infinity
            return ts >= from && ts <= to
          }

          if (id === 'status') {
            if (!value) return true
            return response.status === value
          }

          // Handle question columns (format: q_{questionId})
          if (id.startsWith('q_')) {
            const questionId = id.substring(2)
            const answer = response.answers.find(a => a.questionId === questionId)
            if (!answer) return false

            const answerText = getAnswerText(answer)
            const needle = String(value ?? '').toLowerCase()
            return answerText.toLowerCase().includes(needle)
          }

          return true
        })
      })
    }

    // Format data for export
    const headers: string[] = []
    const rows: string[][] = []

    // Build headers from selected columns
    data.columns.forEach(colId => {
      if (colId === 'submittedAt') {
        headers.push('Submitted At')
      } else if (colId === 'status') {
        headers.push('Status')
      } else if (colId === 'location') {
        headers.push('Location')
      } else if (colId.startsWith('q_')) {
        const questionId = colId.substring(2)
        const question = survey.questions.find(q => q.id === questionId)
        headers.push(question?.question || colId)
      }
    })

    // Build rows
    responses.forEach(response => {
      const row: string[] = []

      data.columns.forEach(colId => {
        if (colId === 'submittedAt') {
          row.push(response.submittedAt
            ? new Date(response.submittedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : 'N/A'
          )
        } else if (colId === 'status') {
          row.push(response.status)
        } else if (colId === 'location') {
          if (response.address) {
            row.push(response.address)
          } else if (response.latitude && response.longitude) {
            row.push(`${response.latitude.toFixed(4)}, ${response.longitude.toFixed(4)}`)
          } else {
            row.push('N/A')
          }
        } else if (colId.startsWith('q_')) {
          const questionId = colId.substring(2)
          const answer = response.answers.find(a => a.questionId === questionId)
          row.push(answer ? getAnswerText(answer) : '')
        } else {
          row.push('')
        }
      })

      rows.push(row)
    })

    // Generate file based on format
    if (data.format === 'csv') {
      const csv = generateCSV(headers, rows)
      const filename = `${survey.title.replace(/[^a-z0-9]/gi, '_')}_export_${Date.now()}.csv`

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      })
    } else {
      // XLSX format
      const ExcelJS = require('exceljs')
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Responses')

      // Add headers
      worksheet.addRow(headers)

      // Style headers
      const headerRow = worksheet.getRow(1)
      headerRow.font = { bold: true }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      }

      // Add data rows
      rows.forEach(row => {
        worksheet.addRow(row)
      })

      // Auto-size columns
      worksheet.columns.forEach((column: any) => {
        let maxLength = 0
        column.eachCell?.({ includeEmpty: true }, (cell: any) => {
          const columnLength = cell.value ? cell.value.toString().length : 10
          if (columnLength > maxLength) {
            maxLength = columnLength
          }
        })
        column.width = Math.min(maxLength + 2, 50)
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const filename = `${survey.title.replace(/[^a-z0-9]/gi, '_')}_export_${Date.now()}.xlsx`

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      })
    }
  } catch (e: any) {
    console.error('Export filtered error:', e)
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const status = e instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: e.message }, { status })
  }
}

function getAnswerText(answer: any): string {
  switch (answer.answerType) {
    case 'text':
      return answer.answerText || ''
    case 'number':
      return answer.answerNumber?.toString() || ''
    case 'choice':
      return answer.answerText || ''
    case 'choices':
      return answer.answerChoices.join(', ')
    default:
      return answer.answerText || ''
  }
}

function generateCSV(headers: string[], rows: string[][]): string {
  const escapeCsvValue = (value: string) => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  const csvRows = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map(row => row.map(escapeCsvValue).join(','))
  ]

  return csvRows.join('\n')
}
