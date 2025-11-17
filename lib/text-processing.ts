/**
 * Text processing utilities for word cloud generation
 */

// Common English stop words to filter out
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but',
  'by', 'can', 'did', 'do', 'does', 'doing', 'don', 'down', 'during', 'each', 'few', 'for',
  'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself',
  'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just',
  'me', 'might', 'more', 'most', 'must', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off',
  'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same',
  'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them',
  'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while',
  'who', 'whom', 'why', 'will', 'with', 'you', 'your', 'yours', 'yourself', 'yourselves',
  // Additional common words
  'would', 'could', 'also', 'like', 'get', 'got', 'one', 'two', 'see', 'go', 'going', 'get',
  'make', 'made', 'take', 'taken', 'know', 'think', 'come', 'came', 'give', 'gave', 'want',
  'wanted', 'use', 'used', 'find', 'found', 'tell', 'told', 'ask', 'asked', 'work', 'worked',
  'seem', 'seemed', 'feel', 'felt', 'try', 'tried', 'leave', 'left', 'call', 'called'
])

export interface WordFrequency {
  text: string
  value: number
}

/**
 * Process text responses into word frequencies for word cloud
 *
 * @param texts - Array of text responses
 * @param options - Processing options
 * @returns Array of word frequencies sorted by count
 */
export function processTextForWordCloud(
  texts: string[],
  options: {
    minWordLength?: number
    maxWords?: number
    caseSensitive?: boolean
    includeStopWords?: boolean
    customStopWords?: string[]
  } = {}
): WordFrequency[] {
  const {
    minWordLength = 3,
    maxWords = 100,
    caseSensitive = false,
    includeStopWords = false,
    customStopWords = []
  } = options

  // Combine default and custom stop words
  const stopWords = new Set([
    ...STOP_WORDS,
    ...customStopWords.map(w => w.toLowerCase())
  ])

  // Word frequency map
  const wordCounts = new Map<string, number>()

  // Process each text
  texts.forEach(text => {
    if (!text || typeof text !== 'string') return

    // Tokenize: split on non-word characters, filter empty strings
    const words = text
      .split(/\W+/)
      .filter(word => word.length >= minWordLength)

    words.forEach(word => {
      // Normalize case unless case-sensitive
      const normalized = caseSensitive ? word : word.toLowerCase()

      // Skip stop words unless explicitly included
      if (!includeStopWords && stopWords.has(normalized.toLowerCase())) {
        return
      }

      // Skip numbers
      if (/^\d+$/.test(normalized)) {
        return
      }

      // Increment count
      const currentCount = wordCounts.get(normalized) || 0
      wordCounts.set(normalized, currentCount + 1)
    })
  })

  // Convert to array and sort by frequency
  const wordFrequencies: WordFrequency[] = Array.from(wordCounts.entries())
    .map(([text, value]) => ({ text, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, maxWords)

  return wordFrequencies
}

/**
 * Extract text answers from survey responses for a specific question
 *
 * @param responses - Survey responses
 * @param questionId - ID of the question to extract
 * @returns Array of text answers
 */
export function extractTextAnswers(
  responses: Array<{
    answers: Array<{
      questionId: string
      answerText: string | null
    }>
  }>,
  questionId: string
): string[] {
  const texts: string[] = []

  responses.forEach(response => {
    const answer = response.answers?.find(a => a.questionId === questionId)
    if (answer?.answerText && answer.answerText.trim()) {
      texts.push(answer.answerText.trim())
    }
  })

  return texts
}

/**
 * Get default stop words list
 */
export function getStopWords(): string[] {
  return Array.from(STOP_WORDS).sort()
}

/**
 * Calculate basic text statistics
 */
export interface TextStatistics {
  totalResponses: number
  totalWords: number
  uniqueWords: number
  averageWordCount: number
  averageCharCount: number
  mostFrequentWord: { text: string; count: number } | null
}

export function calculateTextStatistics(texts: string[]): TextStatistics {
  const nonEmptyTexts = texts.filter(t => t && t.trim())

  if (nonEmptyTexts.length === 0) {
    return {
      totalResponses: 0,
      totalWords: 0,
      uniqueWords: 0,
      averageWordCount: 0,
      averageCharCount: 0,
      mostFrequentWord: null
    }
  }

  const wordFrequencies = processTextForWordCloud(nonEmptyTexts, {
    includeStopWords: true,
    minWordLength: 1
  })

  const totalWords = wordFrequencies.reduce((sum, wf) => sum + wf.value, 0)
  const totalChars = nonEmptyTexts.reduce((sum, text) => sum + text.length, 0)

  return {
    totalResponses: nonEmptyTexts.length,
    totalWords,
    uniqueWords: wordFrequencies.length,
    averageWordCount: Math.round(totalWords / nonEmptyTexts.length),
    averageCharCount: Math.round(totalChars / nonEmptyTexts.length),
    mostFrequentWord: wordFrequencies[0]
      ? { text: wordFrequencies[0].text, count: wordFrequencies[0].value }
      : null
  }
}
