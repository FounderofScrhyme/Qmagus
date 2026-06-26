import { api } from '@/lib/api'
import type { SavedItemCreate, SavedItemRead } from '@/types/savedItems'

export async function listSavedItems(limit = 50, offset = 0): Promise<SavedItemRead[]> {
  const { data } = await api.get<SavedItemRead[]>('/api/saved-items', {
    params: { limit, offset },
  })
  return data
}

export async function createSavedItem(body: SavedItemCreate): Promise<SavedItemRead> {
  const { data } = await api.post<SavedItemRead>('/api/saved-items', body)
  return data
}

export async function createSavedItemsBatch(
  items: SavedItemCreate[],
): Promise<SavedItemRead[]> {
  const { data } = await api.post<SavedItemRead[]>('/api/saved-items/batch', { items })
  return data
}

export async function deleteSavedItem(itemId: string): Promise<void> {
  await api.delete(`/api/saved-items/${itemId}`)
}
