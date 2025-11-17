/**
 * Question Piping Library
 *
 * Allows dynamic insertion of previous answers into question text
 * Syntax: {{question_id}} or {{Q1}}, {{Q2}}, etc.
 *
 * Examples:
 * - "Hi {{Q1}}, what's your favorite color?" -> "Hi John, what's your favorite color?"
 * - "You selected {{previous_question}}. Are you sure?" -> "You selected Pizza. Are you sure?"
 */

export type AnswerValue = string | number | string[] | boolean | null | undefined

export interface PipingContext {
  answers: Record<string, AnswerValue>
  questionOrder?: string[] // Optional: maintain question order for {{Q1}}, {{Q2}} syntax
}

/**
 * Replace piping placeholders in text with actual answer values
 *
 * @param text - Text containing piping placeholders (e.g., "Hi {{name}}")
 * @param context - Context with answers and question order
 * @returns Text with placeholders replaced by actual values
 */
export function applyPiping(text: string, context: PipingContext): string {
  if (!text) return text

  // Replace {{question_id}} or {{Q1}} patterns
  return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim()

    // Handle {{Q1}}, {{Q2}} syntax (1-indexed)
    if (/^Q\d+$/i.test(trimmedKey)) {
      const index = parseInt(trimmedKey.substring(1)) - 1
      if (context.questionOrder && index >= 0 && index < context.questionOrder.length) {
        const questionId = context.questionOrder[index]
        return formatAnswer(context.answers[questionId])
      }
      return match // Keep placeholder if question not found
    }

    // Handle {{question_id}} syntax
    if (trimmedKey in context.answers) {
      return formatAnswer(context.answers[trimmedKey])
    }

    // Placeholder not found, keep original
    return match
  })
}

/**
 * Format answer value for display in piped text
 */
function formatAnswer(value: AnswerValue): string {
  if (value === null || value === undefined || value === '') {
    return '[no answer]'
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '[no answer]'
  }

  if (typeof value === 'number') {
    return value.toString()
  }

  return String(value)
}

/**
 * Check if text contains piping placeholders
 */
export function hasPiping(text: string): boolean {
  return /\{\{[^}]+\}\}/.test(text)
}

/**
 * Extract all placeholder keys from text
 *
 * @param text - Text to analyze
 * @returns Array of placeholder keys (e.g., ["name", "Q1"])
 */
export function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{\{([^}]+)\}\}/g)
  if (!matches) return []

  return matches.map(match => {
    const key = match.slice(2, -2).trim()
    return key
  })
}

/**
 * Validate piping references in a survey
 * Checks for:
 * - Self-references (question piping itself)
 * - Forward references (piping questions that come later)
 * - Circular dependencies
 *
 * @param questions - Array of questions with their text and IDs
 * @returns Validation result with errors
 */
export interface PipingValidationResult {
  valid: boolean
  errors: Array<{
    questionId: string
    questionIndex: number
    error: string
    placeholder: string
  }>
}

export function validatePiping(
  questions: Array<{ id: string; question: string; description?: string }>
): PipingValidationResult {
  const errors: PipingValidationResult['errors'] = []
  const questionIdToIndex = new Map<string, number>()

  // Build index map
  questions.forEach((q, index) => {
    questionIdToIndex.set(q.id, index)
  })

  // Check each question
  questions.forEach((q, index) => {
    const placeholders = [
      ...extractPlaceholders(q.question),
      ...(q.description ? extractPlaceholders(q.description) : [])
    ]

    placeholders.forEach(placeholder => {
      // Check {{Q1}}, {{Q2}} syntax
      if (/^Q\d+$/i.test(placeholder)) {
        const refIndex = parseInt(placeholder.substring(1)) - 1

        // Self-reference
        if (refIndex === index) {
          errors.push({
            questionId: q.id,
            questionIndex: index,
            error: 'Self-reference detected',
            placeholder
          })
        }
        // Forward reference
        else if (refIndex >= index) {
          errors.push({
            questionId: q.id,
            questionIndex: index,
            error: 'Forward reference detected (can only reference previous questions)',
            placeholder
          })
        }
        // Out of bounds
        else if (refIndex < 0 || refIndex >= questions.length) {
          errors.push({
            questionId: q.id,
            questionIndex: index,
            error: 'Referenced question does not exist',
            placeholder
          })
        }
      }
      // Check {{question_id}} syntax
      else {
        const refIndex = questionIdToIndex.get(placeholder)

        // Question not found
        if (refIndex === undefined) {
          errors.push({
            questionId: q.id,
            questionIndex: index,
            error: 'Referenced question does not exist',
            placeholder
          })
        }
        // Self-reference
        else if (refIndex === index) {
          errors.push({
            questionId: q.id,
            questionIndex: index,
            error: 'Self-reference detected',
            placeholder
          })
        }
        // Forward reference
        else if (refIndex > index) {
          errors.push({
            questionId: q.id,
            questionIndex: index,
            error: 'Forward reference detected (can only reference previous questions)',
            placeholder
          })
        }
      }
    })
  })

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Get example text for piping syntax
 */
export function getPipingExamples(): string[] {
  return [
    'Hi {{Q1}}, welcome!',
    'You selected {{previous_answer}}. Is this correct?',
    'Based on your answer to {{question_id}}, we recommend...',
    '{{name}}, your {{favorite_color}} choice is interesting!'
  ]
}

/**
 * Get help text for piping
 */
export function getPipingHelpText(): string {
  return `
Use {{placeholders}} to insert previous answers into questions.

Syntax:
- {{Q1}}, {{Q2}}, etc. - Reference questions by position (1-indexed)
- {{question_id}} - Reference questions by their ID

Examples:
- "Hi {{Q1}}, what's your favorite color?"
- "You chose {{previous_choice}}. Are you sure?"

Notes:
- You can only reference PREVIOUS questions (no forward references)
- Empty answers will show as "[no answer]"
- Arrays will be joined with commas
`.trim()
}
