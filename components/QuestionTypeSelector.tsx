'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/lib/components/ui/dialog'
import { Button } from '@/components/ui'
import { Card } from '@/lib/components/ui/card'
import { cn } from '@/lib/utils'
import {
  Type,
  AlignLeft,
  Hash,
  Mail,
  Phone,
  CheckCircle,
  CheckSquare,
  ChevronDown,
  Star,
  Gauge,
  Calendar,
  Clock,
  CalendarClock,
  Upload,
  MapPin,
  PenTool,
  Plus
} from 'lucide-react'
import type { QuestionType } from '@/stores/surveyBuilder'

const QUESTION_TYPES = [
  {
    group: 'Text Input',
    types: [
      { label: 'Short Text', value: 'text' as QuestionType, icon: Type, description: 'Single line text input' },
      { label: 'Long Text', value: 'textarea' as QuestionType, icon: AlignLeft, description: 'Multi-line textarea' },
      { label: 'Number', value: 'number' as QuestionType, icon: Hash, description: 'Numeric input' },
      { label: 'Email', value: 'email' as QuestionType, icon: Mail, description: 'Email address' },
      { label: 'Phone', value: 'phone' as QuestionType, icon: Phone, description: 'Phone number' }
    ]
  },
  {
    group: 'Choice',
    types: [
      { label: 'Single Choice', value: 'single_choice' as QuestionType, icon: CheckCircle, description: 'Select one option' },
      { label: 'Multiple Choice', value: 'multiple_choice' as QuestionType, icon: CheckSquare, description: 'Select multiple' },
      { label: 'Dropdown', value: 'dropdown' as QuestionType, icon: ChevronDown, description: 'Dropdown select' }
    ]
  },
  {
    group: 'Rating & Scale',
    types: [
      { label: 'Rating', value: 'rating' as QuestionType, icon: Star, description: '1-5 star rating' },
      { label: 'Scale', value: 'scale' as QuestionType, icon: Gauge, description: 'Slider scale' }
    ]
  },
  {
    group: 'Date & Time',
    types: [
      { label: 'Date', value: 'date' as QuestionType, icon: Calendar, description: 'Date picker' },
      { label: 'Time', value: 'time' as QuestionType, icon: Clock, description: 'Time picker' },
      { label: 'Date & Time', value: 'datetime' as QuestionType, icon: CalendarClock, description: 'Date and time' }
    ]
  },
  {
    group: 'Special',
    types: [
      { label: 'File Upload', value: 'file_upload' as QuestionType, icon: Upload, description: 'Upload files' },
      { label: 'Location', value: 'location' as QuestionType, icon: MapPin, description: 'GPS coordinates' },
      { label: 'Signature', value: 'signature' as QuestionType, icon: PenTool, description: 'Digital signature' }
    ]
  }
]

interface QuestionTypeSelectorProps {
  onSelect: (type: QuestionType) => void
}

export function QuestionTypeSelector({ onSelect }: QuestionTypeSelectorProps) {
  const [open, setOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<QuestionType | null>(null)

  function handleSelect(type: QuestionType) {
    setSelectedType(type)
    onSelect(type)
    // Brief delay to show selection before closing
    setTimeout(() => {
      setOpen(false)
      setSelectedType(null)
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Question
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-bold">
            Choose Question Type
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8 py-4">
          {QUESTION_TYPES.map((group) => (
            <div key={group.group} className="space-y-4">
              {/* Group Header */}
              <h3 className="text-sm font-semibold text-[var(--gform-color-text-secondary)] uppercase tracking-wide">
                {group.group}
              </h3>

              {/* Question Type Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.types.map((type) => {
                  const Icon = type.icon
                  const isSelected = selectedType === type.value

                  return (
                    <Card
                      key={type.value}
                      className={cn(
                        'cursor-pointer transition-all duration-200 hover:shadow-elevation-2 hover:border-purple-200',
                        isSelected && 'border-purple bg-purple-5 shadow-elevation-2'
                      )}
                      onClick={() => handleSelect(type.value)}
                    >
                      <div className="p-6 space-y-3">
                        {/* Icon */}
                        <div className="flex items-center justify-between">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-control flex items-center justify-center transition-colors duration-200',
                              isSelected ? 'bg-purple text-white' : 'bg-purple-5 text-purple'
                            )}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          {isSelected && (
                            <div className="w-6 h-6 rounded-full bg-purple flex items-center justify-center animate-in zoom-in duration-200">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Label & Description */}
                        <div className="space-y-1">
                          <h4 className="font-semibold text-[var(--gform-color-text)]">
                            {type.label}
                          </h4>
                          <p className="text-xs text-[var(--gform-color-text-secondary)] leading-relaxed">
                            {type.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
