import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { Dashboard } from '@/stores/dashboardStore'

export interface ExportOptions {
  fileName?: string
  includeHeader?: boolean
  scale?: number
  maxWidgetsPerPage?: number
}

interface WidgetCapture {
  id: string
  canvas: HTMLCanvasElement
  width: number
  height: number
  order: number
}

/**
 * Capture dashboard widgets as images
 */
async function captureWidgets(
  widgetElements: HTMLElement[],
  scale: number = 2
): Promise<WidgetCapture[]> {
  const captures: WidgetCapture[] = []

  for (let i = 0; i < widgetElements.length; i++) {
    const element = widgetElements[i]
    const widgetId = element.getAttribute('data-widget-id')

    if (!widgetId) continue

    try {
      const canvas = await html2canvas(element, {
        scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })

      captures.push({
        id: widgetId,
        canvas,
        width: canvas.width,
        height: canvas.height,
        order: i
      })
    } catch (error) {
      console.error(`Failed to capture widget ${widgetId}:`, error)
    }
  }

  return captures
}

/**
 * Generate PDF header with dashboard metadata
 */
function addPDFHeader(
  pdf: jsPDF,
  dashboard: Dashboard,
  pageNumber: number,
  totalPages: number
) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = 15

  // Title
  pdf.setFontSize(18)
  pdf.setFont('helvetica', 'bold')
  pdf.text(dashboard.name, margin, 20)

  // Description
  if (dashboard.description) {
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(100, 100, 100)
    const descLines = pdf.splitTextToSize(dashboard.description, pageWidth - 2 * margin)
    pdf.text(descLines, margin, 28)
  }

  // Date and page number
  pdf.setFontSize(9)
  pdf.setTextColor(120, 120, 120)
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  pdf.text(date, margin, pdf.internal.pageSize.getHeight() - 10)
  pdf.text(
    `Page ${pageNumber} of ${totalPages}`,
    pageWidth - margin - 40,
    pdf.internal.pageSize.getHeight() - 10
  )

  // Reset colors
  pdf.setTextColor(0, 0, 0)
}

/**
 * Calculate layout for widgets in PDF
 */
function calculatePDFLayout(
  captures: WidgetCapture[],
  pageWidth: number,
  pageHeight: number,
  headerHeight: number,
  margin: number
): Array<{ capture: WidgetCapture; x: number; y: number; width: number; height: number; page: number }> {
  const maxContentWidth = pageWidth - 2 * margin
  const maxContentHeight = pageHeight - headerHeight - 2 * margin

  const layout: Array<{ capture: WidgetCapture; x: number; y: number; width: number; height: number; page: number }> = []

  let currentPage = 1
  let currentY = headerHeight + margin

  for (const capture of captures) {
    // Calculate scaled dimensions to fit width
    const aspectRatio = capture.height / capture.width
    let targetWidth = maxContentWidth
    let targetHeight = targetWidth * aspectRatio

    // If too tall, scale to fit height
    if (targetHeight > maxContentHeight) {
      targetHeight = maxContentHeight
      targetWidth = targetHeight / aspectRatio
    }

    // Check if widget fits on current page
    if (currentY + targetHeight > pageHeight - margin) {
      // Move to next page
      currentPage++
      currentY = headerHeight + margin
    }

    layout.push({
      capture,
      x: margin,
      y: currentY,
      width: targetWidth,
      height: targetHeight,
      page: currentPage
    })

    currentY += targetHeight + 10 // Add spacing between widgets
  }

  return layout
}

/**
 * Export dashboard to PDF
 */
export async function exportDashboardToPDF(
  dashboard: Dashboard,
  options: ExportOptions = {}
): Promise<void> {
  const {
    fileName = `${dashboard.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`,
    includeHeader = true,
    scale = 2,
    maxWidgetsPerPage = 10
  } = options

  try {
    // Find all widget elements
    const widgetElements = Array.from(
      document.querySelectorAll('[data-widget-id]')
    ) as HTMLElement[]

    if (widgetElements.length === 0) {
      throw new Error('No widgets found to export')
    }

    // Capture widgets as images
    const captures = await captureWidgets(widgetElements, scale)

    if (captures.length === 0) {
      throw new Error('Failed to capture any widgets')
    }

    // Sort by order
    captures.sort((a, b) => a.order - b.order)

    // Initialize PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 15
    const headerHeight = includeHeader ? 45 : 10

    // Calculate layout
    const layout = calculatePDFLayout(captures, pageWidth, pageHeight, headerHeight, margin)
    const totalPages = Math.max(...layout.map(l => l.page))

    let currentPage = 0

    for (const item of layout) {
      // Add new page if needed
      if (item.page > currentPage) {
        if (currentPage > 0) {
          pdf.addPage()
        }
        currentPage = item.page

        // Add header
        if (includeHeader) {
          addPDFHeader(pdf, dashboard, currentPage, totalPages)
        }
      }

      // Add widget image
      const imgData = item.capture.canvas.toDataURL('image/png')
      pdf.addImage(imgData, 'PNG', item.x, item.y, item.width, item.height)
    }

    // Save PDF
    pdf.save(fileName)
  } catch (error) {
    console.error('Failed to export dashboard:', error)
    throw error
  }
}

/**
 * Export single widget to PNG
 */
export async function exportWidgetToPNG(
  widgetElement: HTMLElement,
  fileName: string = `widget_${Date.now()}.png`,
  scale: number = 2
): Promise<void> {
  try {
    const canvas = await html2canvas(widgetElement, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    })

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Failed to create image blob')
      }

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.click()
      URL.revokeObjectURL(url)
    })
  } catch (error) {
    console.error('Failed to export widget:', error)
    throw error
  }
}
