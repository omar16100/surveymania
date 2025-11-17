"use client"
import { useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { showToast } from '@/components/Toast'

type ExportFormat = 'csv' | 'xlsx' | 'json' | 'pdf' | 'geojson' | 'kml'

type Props = {
  surveyId: string
  surveyTitle: string
}

export default function ExportMenu({ surveyId, surveyTitle }: Props) {
  const [exporting, setExporting] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('xlsx')

  const formats: Array<{ value: ExportFormat; label: string; description: string; icon: string }> = [
    {
      value: 'csv',
      label: 'CSV',
      description: 'Basic spreadsheet format',
      icon: '📄'
    },
    {
      value: 'xlsx',
      label: 'Excel (XLSX)',
      description: 'Excel with multiple sheets and formatting',
      icon: '📊'
    },
    {
      value: 'json',
      label: 'JSON',
      description: 'Nested data structure for developers',
      icon: '🔧'
    },
    {
      value: 'pdf',
      label: 'PDF Report',
      description: 'Formatted report with summary and charts',
      icon: '📑'
    },
    {
      value: 'geojson',
      label: 'GeoJSON',
      description: 'Geographic data for mapping applications',
      icon: '🗺️'
    },
    {
      value: 'kml',
      label: 'KML',
      description: 'Google Earth compatible format',
      icon: '🌍'
    }
  ]

  async function handleExport(format: ExportFormat) {
    setExporting(true)
    try {
      const url = format === 'csv'
        ? `/api/surveys/${surveyId}/export-csv`
        : `/api/surveys/${surveyId}/export?format=${format}`

      const response = await fetch(url)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export failed')
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `${surveyTitle.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${format}`

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      // Download the file
      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)

      showToast(`Exported as ${format.toUpperCase()}`, 'success')
    } catch (error: any) {
      showToast(error.message, 'error')
      console.error('Export error:', error)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {formats.map((format) => (
            <button
              key={format.value}
              onClick={() => setSelectedFormat(format.value)}
              className={`
                p-4 rounded-lg border-2 text-left transition-all
                ${selectedFormat === format.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{format.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{format.label}</div>
                  <div className="text-xs text-gray-600 mt-1">{format.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="pt-2">
          <Button
            onClick={() => handleExport(selectedFormat)}
            disabled={exporting}
            size="lg"
            className="w-full"
          >
            {exporting ? 'Exporting...' : `Export as ${selectedFormat.toUpperCase()}`}
          </Button>
        </div>

        <div className="text-xs text-gray-500 mt-2">
          <p><strong>Note:</strong> Exports are tracked for 7 days. GeoJSON and KML exports only include responses with location data.</p>
        </div>
      </CardContent>
    </Card>
  )
}
