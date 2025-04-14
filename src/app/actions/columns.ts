'use server'

import { createClient } from '@/lib/supabase/server'
import { Column } from '@/lib/db/schema'

/**
 * Get all columns for a specific board
 */
export async function getBoardColumns(boardId: string): Promise<Column[]> {
  try {
    const supabase = await createClient()

    // Get the current user's ID
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      console.error('No authenticated user found')
      return []
    }

    // Get columns for this specific board only
    const { data, error } = await supabase
      .from('columns')
      .select()
      .eq('board_id', boardId)
      .order('order', { ascending: true })

    console.log('data', data)
    console.log('boardId', boardId)

    if (error) {
      console.error('Error fetching columns:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getBoardColumns:', error)
    return []
  }
}

/**
 * Create a new column for a board
 */
export async function createColumn(
  boardId: string,
  name: string,
  order: number,
  parentColumnId?: string | null,
  wipLimit?: number | null
): Promise<Column | null> {
  try {
    const supabase = await createClient()

    // Get the current user's ID
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      console.error('No authenticated user found')
      return null
    }

    // Verify the user owns this board
    const { data: board } = await supabase
      .from('boards')
      .select('id')
      .eq('id', boardId)
      .eq('owner_id', session.user.id)
      .single()

    if (!board) {
      console.error('Board not found or not owned by current user')
      return null
    }

    // Create the column
    const { data, error } = await supabase
      .from('columns')
      .insert({
        board_id: boardId,
        name,
        order,
        parent_column_id: parentColumnId || null,
        wip_limit: wipLimit || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating column:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in createColumn:', error)
    return null
  }
}