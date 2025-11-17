import { create } from 'zustand'

export type QuestionType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'single_choice'
  | 'multiple_choice'
  | 'dropdown'
  | 'rating'
  | 'scale'
  | 'date'
  | 'time'
  | 'datetime'
  | 'file_upload'
  | 'location'
  | 'signature'

export type ValidationRule = {
  minLength?: number
  maxLength?: number
  minValue?: number
  maxValue?: number
  regex?: string
  regexMessage?: string
  maxFileSize?: number // in MB
  allowedFileTypes?: string[] // e.g., ['image/jpeg', 'application/pdf']
  scaleMin?: number
  scaleMax?: number
  scaleStep?: number
  scaleMinLabel?: string
  scaleMaxLabel?: string
}

export type BuilderQuestion = {
  id: string
  type: QuestionType
  question: string
  description?: string
  required: boolean
  options?: string[]
  validation?: ValidationRule
  logic?: any // QuestionLogic type from logic-engine (avoiding circular dependency)
}

type SurveyBuilderState = {
  title: string
  description: string
  questions: BuilderQuestion[]
  addQuestion: (q: BuilderQuestion) => void
  removeQuestion: (id: string) => void
  updateQuestion: (id: string, q: Partial<BuilderQuestion>) => void
  reorder: (from: number, to: number) => void
  setMeta: (title: string, description: string) => void
  reset: () => void
}

export const useSurveyBuilder = create<SurveyBuilderState>((set) => ({
  title: '',
  description: '',
  questions: [],
  addQuestion: (q) => set((s) => ({ questions: [...s.questions, q] })),
  removeQuestion: (id) => set((s) => ({ questions: s.questions.filter((q) => q.id !== id) })),
  updateQuestion: (id, q) => set((s) => ({
    questions: s.questions.map((x) => (x.id === id ? { ...x, ...q } : x))
  })),
  reorder: (from, to) => set((s) => {
    const arr = [...s.questions]
    const [moved] = arr.splice(from, 1)
    arr.splice(to, 0, moved)
    return { questions: arr }
  }),
  setMeta: (title, description) => set({ title, description }),
  reset: () => set({ title: '', description: '', questions: [] })
}))

