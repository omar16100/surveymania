// Conditional Logic Engine for Survey Questions

export type ComparisonOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'is_empty'
  | 'is_not_empty'
  | 'in_list'
  | 'not_in_list'

export type LogicalOperator = 'and' | 'or'

export type SimpleCondition = {
  questionId: string
  operator: ComparisonOperator
  value?: any // Value to compare against (not needed for is_empty/is_not_empty)
}

export type CompoundCondition = {
  type: LogicalOperator
  conditions: (SimpleCondition | CompoundCondition)[]
}

export type Condition = SimpleCondition | CompoundCondition

export type ActionType = 'show' | 'hide' | 'jump'

export type LogicAction = {
  type: ActionType
  targetQuestionId?: string // Required for 'jump' action
}

export type LogicRule = {
  id: string
  condition: Condition
  action: LogicAction
}

export type QuestionLogic = {
  rules: LogicRule[]
}

// Response values map (questionId -> answer value)
export type ResponseValues = Record<string, any>

/**
 * Evaluates a simple condition against response values
 */
function evaluateSimpleCondition(
  condition: SimpleCondition,
  values: ResponseValues
): boolean {
  const answerValue = values[condition.questionId]

  switch (condition.operator) {
    case 'equals':
      return answerValue === condition.value

    case 'not_equals':
      return answerValue !== condition.value

    case 'contains':
      if (typeof answerValue === 'string') {
        return answerValue.includes(String(condition.value))
      }
      if (Array.isArray(answerValue)) {
        return answerValue.includes(condition.value)
      }
      return false

    case 'not_contains':
      if (typeof answerValue === 'string') {
        return !answerValue.includes(String(condition.value))
      }
      if (Array.isArray(answerValue)) {
        return !answerValue.includes(condition.value)
      }
      return true

    case 'greater_than':
      return Number(answerValue) > Number(condition.value)

    case 'less_than':
      return Number(answerValue) < Number(condition.value)

    case 'greater_than_or_equal':
      return Number(answerValue) >= Number(condition.value)

    case 'less_than_or_equal':
      return Number(answerValue) <= Number(condition.value)

    case 'is_empty':
      return (
        answerValue === null ||
        answerValue === undefined ||
        answerValue === '' ||
        (Array.isArray(answerValue) && answerValue.length === 0)
      )

    case 'is_not_empty':
      return !(
        answerValue === null ||
        answerValue === undefined ||
        answerValue === '' ||
        (Array.isArray(answerValue) && answerValue.length === 0)
      )

    case 'in_list':
      if (!Array.isArray(condition.value)) return false
      return condition.value.includes(answerValue)

    case 'not_in_list':
      if (!Array.isArray(condition.value)) return true
      return !condition.value.includes(answerValue)

    default:
      return false
  }
}

/**
 * Checks if a condition is compound (has nested conditions)
 */
function isCompoundCondition(
  condition: Condition
): condition is CompoundCondition {
  return 'type' in condition && 'conditions' in condition
}

/**
 * Recursively evaluates a condition (simple or compound)
 */
export function evaluateCondition(
  condition: Condition,
  values: ResponseValues
): boolean {
  if (isCompoundCondition(condition)) {
    // Compound condition: AND or OR
    const results = condition.conditions.map((c) =>
      evaluateCondition(c, values)
    )

    if (condition.type === 'and') {
      return results.every((r) => r === true)
    } else {
      // OR
      return results.some((r) => r === true)
    }
  } else {
    // Simple condition
    return evaluateSimpleCondition(condition, values)
  }
}

/**
 * Evaluates all logic rules for a question and returns the action to take
 */
export function evaluateQuestionLogic(
  questionLogic: QuestionLogic | null | undefined,
  values: ResponseValues
): LogicAction | null {
  if (!questionLogic || !questionLogic.rules || questionLogic.rules.length === 0) {
    return null
  }

  // Evaluate rules in order, return first matching action
  for (const rule of questionLogic.rules) {
    if (evaluateCondition(rule.condition, values)) {
      return rule.action
    }
  }

  return null
}

/**
 * Determines if a question should be visible based on its logic rules
 */
export function isQuestionVisible(
  questionLogic: QuestionLogic | null | undefined,
  values: ResponseValues
): boolean {
  const action = evaluateQuestionLogic(questionLogic, values)

  if (!action) {
    // No logic rules, question is visible by default
    return true
  }

  if (action.type === 'hide') {
    return false
  }

  if (action.type === 'show') {
    return true
  }

  // For 'jump' action, the question is still visible
  // (jump happens on submit, not visibility)
  return true
}

/**
 * Detects circular dependencies in logic rules
 * Returns array of questionIds involved in circular dependency, or empty array if no cycles
 */
export function detectCircularDependencies(
  questions: Array<{ id: string; logic?: QuestionLogic | null }>
): string[] {
  const graph = new Map<string, Set<string>>()

  // Build dependency graph
  questions.forEach((q) => {
    if (!q.logic || !q.logic.rules) return

    const dependencies = new Set<string>()
    q.logic.rules.forEach((rule) => {
      extractDependencies(rule.condition, dependencies)
    })

    graph.set(q.id, dependencies)
  })

  // DFS to detect cycles
  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  const cycleNodes: string[] = []

  function dfs(nodeId: string): boolean {
    visited.add(nodeId)
    recursionStack.add(nodeId)

    const dependencies = graph.get(nodeId) || new Set()
    for (const depId of dependencies) {
      if (!visited.has(depId)) {
        if (dfs(depId)) {
          cycleNodes.push(nodeId)
          return true
        }
      } else if (recursionStack.has(depId)) {
        cycleNodes.push(nodeId, depId)
        return true
      }
    }

    recursionStack.delete(nodeId)
    return false
  }

  for (const q of questions) {
    if (!visited.has(q.id)) {
      if (dfs(q.id)) {
        return cycleNodes
      }
    }
  }

  return []
}

/**
 * Extracts all questionIds referenced in a condition
 */
function extractDependencies(
  condition: Condition,
  dependencies: Set<string>
): void {
  if (isCompoundCondition(condition)) {
    condition.conditions.forEach((c) => extractDependencies(c, dependencies))
  } else {
    dependencies.add(condition.questionId)
  }
}
