'use server'

import { createClient } from '@/lib/supabase/server'
import { Board } from '@/lib/db/schema'

/**
 * Get all boards for the current user
 */
export async function getUserBoards(): Promise<Board[]> {
  try {
    const supabase = await createClient()

    // Get the current user's ID
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      console.error('No authenticated user found')
      return []
    }

    const { data, error } = await supabase
      .from('boards')
      .select()
      .eq('owner_id', session.user.id) // Only fetch boards for current user
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching boards:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getUserBoards:', error)
    return []
  }
}

/**
 * Create a new board
 */
export async function createBoard(name: string, description?: string): Promise<Board | null> {
  try {
    const supabase = await createClient()

    // Get the current user's ID
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      console.error('No authenticated user found')
      return null
    }

    const { data, error } = await supabase
      .from('boards')
      .insert({
        name,
        description: description || null,
        owner_id: session.user.id, // Associate board with current user
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating board:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in createBoard:', error)
    return null
  }
}

/**
 * Get a board by ID
 */
export async function getBoard(id: string): Promise<Board | null> {
  try {
    const supabase = await createClient()

    // Get the current user's ID
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      console.error('No authenticated user found')
      return null
    }

    const { data, error } = await supabase
      .from('boards')
      .select()
      .eq('id', id)
      .eq('owner_id', session.user.id) // Only fetch board if it belongs to current user
      .single()

    if (error) {
      console.error('Error fetching board:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getBoard:', error)
    return null
  }
}

/**
 * Delete a board
 */
export async function deleteBoard(id: string): Promise<boolean> {
  try {
    const supabase = await createClient()

    // Get the current user's ID
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      console.error('No authenticated user found')
      return false
    }

    // First check if board belongs to current user
    const { data: board } = await supabase
      .from('boards')
      .select('id')
      .eq('id', id)
      .eq('owner_id', session.user.id)
      .single()

    if (!board) {
      console.error('Board not found or not owned by current user')
      return false
    }

    const { error } = await supabase
      .from('boards')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting board:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in deleteBoard:', error)
    return false
  }
}

/**
 * Update a board
 */
export async function updateBoard(id: string, updates: Partial<Board>): Promise<Board | null> {
  try {
    const supabase = await createClient()

    // Get the current user's ID
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      console.error('No authenticated user found')
      return null
    }

    // First check if board belongs to current user
    const { data: board } = await supabase
      .from('boards')
      .select('id')
      .eq('id', id)
      .eq('owner_id', session.user.id)
      .single()

    if (!board) {
      console.error('Board not found or not owned by current user')
      return null
    }

    const { data, error } = await supabase
      .from('boards')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating board:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in updateBoard:', error)
    return null
  }
}