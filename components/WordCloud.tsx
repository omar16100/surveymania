'use client'

import { useEffect, useRef, useState } from 'react'
import cloud from 'd3-cloud'
import { WordFrequency } from '@/lib/text-processing'

interface WordCloudProps {
  words: WordFrequency[]
  width?: number
  height?: number
  fontFamily?: string
  colors?: string[]
  minFontSize?: number
  maxFontSize?: number
  onWordClick?: (word: string) => void
}

export default function WordCloud({
  words,
  width = 800,
  height = 400,
  fontFamily = 'Inter, system-ui, sans-serif',
  colors = ['#673ab7', '#9575cd', '#512da8', '#7e57c2', '#9c27b0', '#ba68c8'],
  minFontSize = 12,
  maxFontSize = 72,
  onWordClick
}: WordCloudProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [cloudWords, setCloudWords] = useState<any[]>([])

  useEffect(() => {
    if (!words || words.length === 0) return

    // Calculate font size scale
    const maxValue = Math.max(...words.map(w => w.value))
    const minValue = Math.min(...words.map(w => w.value))
    const valueRange = maxValue - minValue || 1

    // Generate word cloud layout
    const layout = cloud()
      .size([width, height])
      .words(
        words.map(word => ({
          text: word.text,
          size: minFontSize + ((word.value - minValue) / valueRange) * (maxFontSize - minFontSize),
          value: word.value
        }))
      )
      .padding(5)
      .rotate(() => (Math.random() > 0.5 ? 0 : 90))
      .font(fontFamily)
      .fontSize(d => d.size!)
      .spiral('archimedean')
      .on('end', (computedWords) => {
        setCloudWords(computedWords)
      })

    layout.start()
  }, [words, width, height, fontFamily, minFontSize, maxFontSize])

  if (!words || words.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
        style={{ width, height }}
      >
        <p className="text-gray-500 text-sm">No text data available</p>
      </div>
    )
  }

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="word-cloud"
      style={{ userSelect: 'none' }}
    >
      <g transform={`translate(${width / 2}, ${height / 2})`}>
        {cloudWords.map((word, index) => {
          const color = colors[index % colors.length]
          return (
            <text
              key={`${word.text}-${index}`}
              style={{
                fontSize: `${word.size}px`,
                fontFamily: word.font,
                fill: color,
                cursor: onWordClick ? 'pointer' : 'default',
                transition: 'opacity 0.2s ease'
              }}
              textAnchor="middle"
              transform={`translate(${word.x}, ${word.y}) rotate(${word.rotate})`}
              onClick={() => onWordClick?.(word.text)}
              onMouseEnter={(e) => {
                if (onWordClick) {
                  e.currentTarget.style.opacity = '0.7'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1'
              }}
              title={`${word.text} (${word.value} occurrences)`}
            >
              {word.text}
            </text>
          )
        })}
      </g>
    </svg>
  )
}
