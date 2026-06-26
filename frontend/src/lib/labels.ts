import type { FeedbackType } from '@/types/feedback'

export const FEEDBACK_TYPE_LABEL: Record<FeedbackType, string> = {
  grammar: '文法',
  vocabulary: '語彙',
  naturalness: '自然さ',
  pronunciation: '発音',
}

export const FEEDBACK_TYPES: FeedbackType[] = [
  'grammar',
  'vocabulary',
  'naturalness',
  'pronunciation',
]
