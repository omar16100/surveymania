/**
 * Serialize array of choices to JSON string for SQLite storage
 *
 * @param choices Array of choice strings
 * @returns JSON string representation
 *
 * @example
 * const serialized = serializeChoices(['Option A', 'Option B']);
 * // Returns: '["Option A","Option B"]'
 */
export function serializeChoices(choices: string[]): string {
  return JSON.stringify(choices);
}

/**
 * Deserialize JSON string back to array of choices
 * Handles invalid JSON gracefully by returning empty array
 *
 * @param choicesJson JSON string of choices
 * @returns Array of choice strings
 *
 * @example
 * const choices = deserializeChoices('["Option A","Option B"]');
 * // Returns: ['Option A', 'Option B']
 *
 * const empty = deserializeChoices('invalid json');
 * // Returns: []
 */
export function deserializeChoices(choicesJson: string): string[] {
  try {
    const parsed = JSON.parse(choicesJson || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
