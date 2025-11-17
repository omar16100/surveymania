import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { FeatureCollection, Point } from 'geojson'

type SurveyData = {
  survey: {
    id: string
    title: string
    description: string
    questions: Array<{
      id: string
      question: string
      type: string
      order: number
    }>
  }
  responses: Array<{
    id: string
    sessionId: string
    status: string
    latitude: number | null
    longitude: number | null
    submittedAt: string | null
    answers: Array<{
      questionId: string
      answerType: string
      answerText: string | null
      answerNumber: number | null
      answerChoices: string[]
      question: {
        question: string
        order: number
      }
    }>
  }>
  stats: {
    total: number
    completed: number
    completionRate: number
  }
}

// XLSX Export with multiple sheets
export function generateXLSX(data: SurveyData): Buffer {
  const workbook = XLSX.utils.book_new()

  // Sheet 1: Responses
  const responsesData = data.responses.map(r => {
    const row: any = {
      'Response ID': r.id,
      'Session ID': r.sessionId,
      'Status': r.status,
      'Submitted At': r.submittedAt || 'N/A',
      'Latitude': r.latitude || '',
      'Longitude': r.longitude || ''
    }

    // Add answers
    r.answers.sort((a, b) => a.question.order - b.question.order).forEach(a => {
      let value = ''
      if (a.answerType === 'choices') {
        value = a.answerChoices.join(', ')
      } else if (a.answerType === 'number') {
        value = a.answerNumber?.toString() || ''
      } else {
        value = a.answerText || ''
      }
      row[a.question.question] = value
    })

    return row
  })

  const responsesSheet = XLSX.utils.json_to_sheet(responsesData)

  // Auto-size columns
  const maxWidth = 50
  const colWidths = Object.keys(responsesData[0] || {}).map(key => ({
    wch: Math.min(Math.max(key.length, 10), maxWidth)
  }))
  responsesSheet['!cols'] = colWidths

  XLSX.utils.book_append_sheet(workbook, responsesSheet, 'Responses')

  // Sheet 2: Summary
  const summaryData = [
    { Metric: 'Survey Title', Value: data.survey.title },
    { Metric: 'Survey Description', Value: data.survey.description },
    { Metric: 'Total Responses', Value: data.stats.total },
    { Metric: 'Completed Responses', Value: data.stats.completed },
    { Metric: 'Completion Rate', Value: `${data.stats.completionRate}%` },
    { Metric: 'Questions', Value: data.survey.questions.length },
    { Metric: 'Exported At', Value: new Date().toISOString() }
  ]
  const summarySheet = XLSX.utils.json_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

  // Sheet 3: Questions
  const questionsData = data.survey.questions
    .sort((a, b) => a.order - b.order)
    .map(q => ({
      'Order': q.order,
      'Question': q.question,
      'Type': q.type,
      'ID': q.id
    }))
  const questionsSheet = XLSX.utils.json_to_sheet(questionsData)
  XLSX.utils.book_append_sheet(workbook, questionsSheet, 'Questions')

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  return buffer
}

// JSON Export with nested structure
export function generateJSON(data: SurveyData): string {
  const exportData = {
    survey: {
      id: data.survey.id,
      title: data.survey.title,
      description: data.survey.description,
      questions: data.survey.questions.sort((a, b) => a.order - b.order)
    },
    stats: data.stats,
    responses: data.responses.map(r => ({
      id: r.id,
      sessionId: r.sessionId,
      status: r.status,
      location: r.latitude && r.longitude ? {
        latitude: r.latitude,
        longitude: r.longitude
      } : null,
      submittedAt: r.submittedAt,
      answers: r.answers
        .sort((a, b) => a.question.order - b.question.order)
        .map(a => ({
          questionId: a.questionId,
          question: a.question.question,
          type: a.answerType,
          value: a.answerType === 'choices' ? a.answerChoices :
                 a.answerType === 'number' ? a.answerNumber :
                 a.answerText
        }))
    })),
    exportedAt: new Date().toISOString()
  }

  return JSON.stringify(exportData, null, 2)
}

// PDF Export with formatting
export function generatePDF(data: SurveyData): Buffer {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  // Title
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(data.survey.title, pageWidth / 2, 20, { align: 'center' })

  // Description
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const descLines = doc.splitTextToSize(data.survey.description, pageWidth - 40)
  doc.text(descLines, 20, 30)

  let yPos = 30 + (descLines.length * 5) + 10

  // Summary Stats
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Summary Statistics', 20, yPos)
  yPos += 10

  const statsData = [
    ['Total Responses', data.stats.total.toString()],
    ['Completed', data.stats.completed.toString()],
    ['Completion Rate', `${data.stats.completionRate}%`],
    ['Total Questions', data.survey.questions.length.toString()]
  ]

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: statsData,
    theme: 'grid',
    headStyles: { fillColor: [102, 126, 234] },
    margin: { left: 20, right: 20 }
  })

  yPos = (doc as any).lastAutoTable.finalY + 15

  // Questions
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Questions', 20, yPos)
  yPos += 10

  const questionsData = data.survey.questions
    .sort((a, b) => a.order - b.order)
    .map(q => [q.order.toString(), q.question, q.type])

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Question', 'Type']],
    body: questionsData,
    theme: 'grid',
    headStyles: { fillColor: [102, 126, 234] },
    margin: { left: 20, right: 20 }
  })

  // Responses (first 20 for PDF size)
  doc.addPage()
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Responses (First 20)', 20, 20)

  const responsesData = data.responses.slice(0, 20).map(r => [
    r.sessionId.substring(0, 12) + '...',
    r.status,
    r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : 'N/A',
    r.answers.length.toString()
  ])

  autoTable(doc, {
    startY: 30,
    head: [['Session ID', 'Status', 'Submitted', 'Answers']],
    body: responsesData,
    theme: 'grid',
    headStyles: { fillColor: [102, 126, 234] },
    margin: { left: 20, right: 20 }
  })

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Page ${i} of ${pageCount} | Exported ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }

  return Buffer.from(doc.output('arraybuffer'))
}

// GeoJSON Export
export function generateGeoJSON(data: SurveyData): string {
  const features = data.responses
    .filter(r => r.latitude !== null && r.longitude !== null)
    .map(r => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [r.longitude!, r.latitude!]
      },
      properties: {
        responseId: r.id,
        sessionId: r.sessionId,
        status: r.status,
        submittedAt: r.submittedAt,
        answers: r.answers.reduce((acc, a) => {
          acc[a.question.question] = a.answerType === 'choices' ? a.answerChoices :
                                     a.answerType === 'number' ? a.answerNumber :
                                     a.answerText
          return acc
        }, {} as any)
      }
    }))

  const geoJSON: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features
  }

  return JSON.stringify(geoJSON, null, 2)
}

// KML Export
export function generateKML(data: SurveyData): string {
  const placemarks = data.responses
    .filter(r => r.latitude !== null && r.longitude !== null)
    .map(r => {
      const answers = r.answers
        .sort((a, b) => a.question.order - b.question.order)
        .map(a => {
          const value = a.answerType === 'choices' ? a.answerChoices.join(', ') :
                       a.answerType === 'number' ? a.answerNumber :
                       a.answerText
          return `<b>${a.question.question}:</b> ${value || 'N/A'}`
        })
        .join('<br/>')

      return `
    <Placemark>
      <name>Response ${r.sessionId.substring(0, 8)}</name>
      <description><![CDATA[
        <h3>Survey: ${data.survey.title}</h3>
        <p><b>Status:</b> ${r.status}</p>
        <p><b>Submitted:</b> ${r.submittedAt || 'N/A'}</p>
        <hr/>
        ${answers}
      ]]></description>
      <Point>
        <coordinates>${r.longitude},${r.latitude},0</coordinates>
      </Point>
    </Placemark>`
    }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${data.survey.title}</name>
    <description>${data.survey.description}</description>
    ${placemarks}
  </Document>
</kml>`
}
