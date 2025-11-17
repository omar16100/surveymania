"use client"
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui'
import LoadingSpinner from '@/components/LoadingSpinner'
import Link from 'next/link'

type Export = {
  id: string
  format: string
  fileSize: number
  status: string
  createdAt: string
  expiresAt: string
  creator: {
    firstName: string
    lastName: string
    email: string
  }
}

export default function ExportsPage({ params }: { params: { id: string } }) {
  const [exports, setExports] = useState<Export[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadExports()
  }, [params.id])

  async function loadExports() {
    try {
      const res = await fetch(`/api/surveys/${params.id}/exports`)
      const data = await res.json()
      setExports(data.exports || [])
    } catch (error) {
      console.error('Load exports error:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'processing': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading export history..." />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Export History</h1>
          <p className="text-gray-600 text-sm mt-1">Track all data exports for this survey</p>
        </div>
        <Link href={`/dashboard/surveys/${params.id}/responses`}>
          <button className="border rounded px-4 py-2 hover:bg-gray-50">
            Back to Responses
          </button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Exports ({exports.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {exports.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No exports yet. Export data from the responses page to see history here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="p-3">Format</th>
                    <th className="p-3">Size</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Created By</th>
                    <th className="p-3">Created At</th>
                    <th className="p-3">Expires At</th>
                  </tr>
                </thead>
                <tbody>
                  {exports.map((exp) => (
                    <tr key={exp.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <span className="font-mono font-semibold">{exp.format}</span>
                      </td>
                      <td className="p-3 text-gray-600">
                        {formatBytes(exp.fileSize)}
                      </td>
                      <td className="p-3">
                        <Badge className={getStatusColor(exp.status)}>
                          {exp.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {exp.creator.firstName} {exp.creator.lastName}
                      </td>
                      <td className="p-3 text-gray-600">
                        {new Date(exp.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3 text-gray-600">
                        {new Date(exp.expiresAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">About Export History</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Exports are tracked for auditing and compliance purposes</li>
          <li>• Export records expire after 7 days</li>
          <li>• File downloads are immediate and not stored on the server</li>
          <li>• Showing last 50 exports for this survey</li>
        </ul>
      </div>
    </div>
  )
}
