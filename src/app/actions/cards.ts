'use server'

import { createClient } from '@/lib/supabase/server'
import { Card } from '@/lib/db/schema'

/**
 * Get all cards for a specific column
 */
export async function getColumnCards(columnId: string): Promise<Card[]> {
  try {
    const supabase = await createClient()

    // Get the current user's ID
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      console.error('No authenticated user found')
      return []
    }

    // Get the column and verify its board belongs to the user
    const { data: columnData } = await supabase
      .from('columns')
      .select('board_id')
      .eq('id', columnId)
      .single()

    if (!columnData) {
      console.error('Column not found')
      return []
    }

    // Verify the user owns the board this column belongs to
    const { data: board } = await supabase
      .from('boards')
      .select('id')
      .eq('id', columnData.board_id)
      .eq('owner_id', session.user.id)
      .single()

    if (!board) {
      console.error('Board not found or not owned by current user')
      return []
    }

    // Get cards for this specific column only
    const { data, error } = await supabase
      .from('cards')
      .select()
      .eq('column_id', columnId)
      .order('order', { ascending: true })

    if (error) {
      console.error('Error fetching cards:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getColumnCards:', error)
    return []
  }
}

/**
 * Create a new card in a column
 */
export async function createCard(
  columnId: string,
  title: string,
  description?: string | null,
  order?: number,
  assigneeId?: string | null,
  metadata?: Record<string, unknown>
): Promise<Card | null> {
  try {
    const supabase = await createClient()

    // Get the current user's ID
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      console.error('No authenticated user found')
      return null
    }

    // Get the column and its board
    const { data: columnData } = await supabase
      .from('columns')
      .select('board_id')
      .eq('id', columnId)
      .single()

    if (!columnData) {
      console.error('Column not found')
      return null
    }

    // Verify the user owns the board this column belongs to
    const { data: board } = await supabase
      .from('boards')
      .select('id')
      .eq('id', columnData.board_id)
      .eq('owner_id', session.user.id)
      .single()

    if (!board) {
      console.error('Board not found or not owned by current user')
      return null
    }

    // If order isn't provided, get the max order in the column and add 1
    if (order === undefined) {
      const { data: maxOrderData } = await supabase
        .from('cards')
        .select('order')
        .eq('column_id', columnId)
        .order('order', { ascending: false })
        .limit(1)
        .single()

      order = maxOrderData ? maxOrderData.order + 1 : 0
    }

    // Create the card
    const { data, error } = await supabase
      .from('cards')
      .insert({
        column_id: columnId,
        title,
        description: description || null,
        order,
        assignee_id: assigneeId || null,
        metadata: metadata || {}
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating card:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in createCard:', error)
    return null
  }
}