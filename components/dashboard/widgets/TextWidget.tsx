'use client'

import { Card } from '@/components/ui'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface TextWidgetProps {
  config: {
    content?: string
    alignment?: 'left' | 'center' | 'right'
    title?: string
  }
  isEditMode?: boolean
  onUpdate?: (config: Partial<TextWidgetProps['config']>) => void
}

export default function TextWidget({ config, isEditMode = false, onUpdate }: TextWidgetProps) {
  const alignmentClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  }[config.alignment || 'left']

  if (isEditMode && onUpdate) {
    return (
      <Card className="h-full p-4">
        <div className="h-full flex flex-col gap-2">
          <input
            type="text"
            className="input text-sm"
            placeholder="Widget Title (optional)"
            value={config.title || ''}
            onChange={(e) => onUpdate({ title: e.target.value })}
          />
          <textarea
            className="input flex-1 resize-none font-mono text-sm"
            placeholder="Enter markdown text...&#10;&#10;# Heading&#10;**Bold** and *italic*&#10;- List item&#10;[Link](https://example.com)"
            value={config.content || ''}
            onChange={(e) => onUpdate({ content: e.target.value })}
          />
          <div className="flex gap-2 text-xs text-gray-600">
            <button
              onClick={() => onUpdate({ alignment: 'left' })}
              className={`px-2 py-1 rounded ${config.alignment === 'left' ? 'bg-purple-100' : 'hover:bg-gray-100'}`}
            >
              Left
            </button>
            <button
              onClick={() => onUpdate({ alignment: 'center' })}
              className={`px-2 py-1 rounded ${config.alignment === 'center' ? 'bg-purple-100' : 'hover:bg-gray-100'}`}
            >
              Center
            </button>
            <button
              onClick={() => onUpdate({ alignment: 'right' })}
              className={`px-2 py-1 rounded ${config.alignment === 'right' ? 'bg-purple-100' : 'hover:bg-gray-100'}`}
            >
              Right
            </button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="h-full p-4 overflow-auto">
      {config.title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-3">{config.title}</h3>
      )}
      <div className={alignmentClass}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          className="prose prose-sm prose-purple max-w-none"
          components={{
            // Style links
            a: ({ node, ...props }) => (
              <a {...props} className="text-purple-600 hover:text-purple-700 underline" target="_blank" rel="noopener noreferrer" />
            ),
            // Style headings
            h1: ({ node, ...props }) => (
              <h1 {...props} className="text-2xl font-bold text-gray-900 mb-3" />
            ),
            h2: ({ node, ...props }) => (
              <h2 {...props} className="text-xl font-bold text-gray-900 mb-2" />
            ),
            h3: ({ node, ...props }) => (
              <h3 {...props} className="text-lg font-bold text-gray-900 mb-2" />
            ),
          }}
        >
          {config.content || '*Empty text widget*'}
        </ReactMarkdown>
      </div>
    </Card>
  )
}
