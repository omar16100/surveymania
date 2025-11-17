"use client"
import { useState } from 'react'
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import type {
  LogicRule,
  SimpleCondition,
  CompoundCondition,
  ComparisonOperator,
  ActionType,
  QuestionLogic
} from '@/lib/logic-engine'

type Question = {
  id: string
  type: string
  question: string
}

type Props = {
  questionId: string
  questions: Question[]
  logic: QuestionLogic | null
  onChange: (logic: QuestionLogic | null) => void
}

const OPERATORS: { value: ComparisonOperator; label: string }[] = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'greater_than', label: 'is greater than' },
  { value: 'less_than', label: 'is less than' },
  { value: 'greater_than_or_equal', label: 'is greater than or equal to' },
  { value: 'less_than_or_equal', label: 'is less than or equal to' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' }
]

export default function LogicBuilder({ questionId, questions, logic, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  // Filter out current question (can't reference itself)
  const availableQuestions = questions.filter(q => q.id !== questionId)

  function addRule() {
    const newRule: LogicRule = {
      id: crypto.randomUUID(),
      condition: {
        questionId: availableQuestions[0]?.id || '',
        operator: 'equals',
        value: ''
      },
      action: {
        type: 'hide'
      }
    }

    const updated: QuestionLogic = {
      rules: [...(logic?.rules || []), newRule]
    }
    onChange(updated)
  }

  function updateRule(ruleId: string, updates: Partial<LogicRule>) {
    if (!logic) return

    const updated: QuestionLogic = {
      rules: logic.rules.map(r => (r.id === ruleId ? { ...r, ...updates } : r))
    }
    onChange(updated)
  }

  function deleteRule(ruleId: string) {
    if (!logic) return

    const updated: QuestionLogic = {
      rules: logic.rules.filter(r => r.id !== ruleId)
    }

    if (updated.rules.length === 0) {
      onChange(null)
    } else {
      onChange(updated)
    }
  }

  function updateCondition(
    ruleId: string,
    updates: Partial<SimpleCondition>
  ) {
    if (!logic) return

    const updated: QuestionLogic = {
      rules: logic.rules.map(r => {
        if (r.id === ruleId) {
          return {
            ...r,
            condition: {
              ...(r.condition as SimpleCondition),
              ...updates
            }
          }
        }
        return r
      })
    }
    onChange(updated)
  }

  const hasRules = logic && logic.rules.length > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Conditional Logic</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? 'Close' : hasRules ? `${logic.rules.length} rule(s)` : 'Add Logic'}
        </Button>
      </div>

      {isOpen && (
        <div className="space-y-3 rounded-lg border p-4 bg-purple-50">
          {!hasRules && (
            <p className="text-sm text-gray-600">
              No logic rules yet. Click "Add Rule" to create conditional logic for this question.
            </p>
          )}

          {logic?.rules.map((rule) => {
            const condition = rule.condition as SimpleCondition

            return (
              <div key={rule.id} className="space-y-3 rounded border bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">Rule</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteRule(rule.id)}
                  >
                    Delete
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">IF question</Label>
                  <Select
                    value={condition.questionId}
                    onValueChange={(value) =>
                      updateCondition(rule.id, { questionId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableQuestions.map((q) => (
                        <SelectItem key={q.id} value={q.id}>
                          {q.question || 'Untitled Question'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Operator</Label>
                  <Select
                    value={condition.operator}
                    onValueChange={(value) =>
                      updateCondition(rule.id, { operator: value as ComparisonOperator })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!['is_empty', 'is_not_empty'].includes(condition.operator) && (
                  <div className="space-y-2">
                    <Label className="text-xs">Value</Label>
                    <Input
                      value={condition.value ?? ''}
                      onChange={(e) =>
                        updateCondition(rule.id, { value: e.target.value })
                      }
                      placeholder="Enter comparison value"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs">THEN action</Label>
                  <Select
                    value={rule.action.type}
                    onValueChange={(value) =>
                      updateRule(rule.id, {
                        action: { ...rule.action, type: value as ActionType }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="show">Show this question</SelectItem>
                      <SelectItem value="hide">Hide this question</SelectItem>
                      <SelectItem value="jump">Jump to question</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {rule.action.type === 'jump' && (
                  <div className="space-y-2">
                    <Label className="text-xs">Jump to</Label>
                    <Select
                      value={rule.action.targetQuestionId || ''}
                      onValueChange={(value) =>
                        updateRule(rule.id, {
                          action: { ...rule.action, targetQuestionId: value }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableQuestions.map((q) => (
                          <SelectItem key={q.id} value={q.id}>
                            {q.question || 'Untitled Question'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )
          })}

          <Button onClick={addRule} variant="outline" className="w-full">
            + Add Rule
          </Button>

          <div className="text-xs text-gray-500">
            <p className="font-semibold mb-1">How logic works:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Rules are evaluated in order from top to bottom</li>
              <li>The first matching rule's action is applied</li>
              <li>"Show" makes the question visible when condition is met</li>
              <li>"Hide" hides the question when condition is met</li>
              <li>"Jump" skips to a specific question (branching)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
