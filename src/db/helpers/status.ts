import { createClient } from "@/lib/supabase/client";
import { Status, Transition, StatusColumn } from '@/types/status';
import { Card } from '@/types/card';

// Get all statuses
export async function getStatuses(): Promise<Status[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('statuses')
    .select('*')
    .order('order');

  if (error) {
    console.error('Error fetching statuses:', error);
    throw error;
  }

  return (data || []).map((status: any) => ({
    id: status.id,
    name: status.name,
    color: status.color,
    order: status.order,
    transitionId: status.transition_id,
    createdAt: status.created_at,
    updatedAt: status.updated_at
  }));
}

// Get transitions for a status
export async function getTransitions(statusId: string): Promise<Transition[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('transitions')
    .select('*')
    .or(`from_status_id.eq.${statusId},to_status_id.eq.${statusId}`);

  if (error) {
    console.error('Error fetching transitions:', error);
    throw error;
  }

  return (data || []).map((transition: any) => ({
    id: transition.id,
    name: transition.name,
    fromStatus: transition.from_status_id,
    toStatus: transition.to_status_id,
    userId: transition.user_id,
    createdAt: transition.created_at,
    updatedAt: transition.updated_at
  }));
}

// Get status-column mappings
export async function getStatusColumns(): Promise<StatusColumn[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('status_columns')
    .select('*');

  if (error) {
    console.error('Error fetching status columns:', error);
    throw error;
  }

  return (data || []).map((statusColumn: any) => ({
    id: statusColumn.id,
    statusId: statusColumn.status_id,
    columnId: statusColumn.column_id,
    createdAt: statusColumn.created_at,
    updatedAt: statusColumn.updated_at
  }));
}

// Get status-column mappings for a specific board
export async function getStatusColumnsForBoard(boardId: string): Promise<StatusColumn[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('status_columns')
    .select(`
      *,
      columns!inner(*)
    `)
    .eq('columns.board_id', boardId);

  if (error) {
    console.error('Error fetching status columns for board:', error);
    throw error;
  }

  return (data || []).map((statusColumn: any) => ({
    id: statusColumn.id,
    statusId: statusColumn.status_id,
    columnId: statusColumn.columns.id,
    createdAt: statusColumn.created_at,
    updatedAt: statusColumn.updated_at
  }));
}

// Create a new status
export async function createStatus(status: Omit<Status, 'id' | 'createdAt' | 'updatedAt'>): Promise<Status> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('statuses')
    .insert({
      name: status.name,
      color: status.color,
      order: status.order || 0,
      transition_id: status.transitionId
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating status:', error);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    color: data.color,
    order: data.order,
    transitionId: data.transition_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

// Map a status to a column
export async function mapStatusToColumn(statusId: string, columnId: string): Promise<StatusColumn> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('status_columns')
    .insert({
      status_id: statusId,
      column_id: columnId
    })
    .select()
    .single();

  if (error) {
    console.error('Error mapping status to column:', error);
    throw error;
  }

  return {
    id: data.id,
    statusId: data.status_id,
    columnId: data.column_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

// Get cards by status
export async function getCardsByStatus(statusId: string): Promise<Card[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('cards')
    .select(`
      *,
      assignee:assignee_id(id, email, user_metadata)
    `)
    .eq('status_id', statusId)
    .order('order');

  if (error) {
    console.error('Error fetching cards by status:', error);
    throw error;
  }

  // Transform the data to match our frontend model
  return (data || []).map((card: any) => ({
    id: card.id,
    title: card.title,
    description: card.description || undefined,
    order: card.order,
    columnId: card.column_id, // Still keeping for backward compatibility
    statusId: card.status_id,
    boardId: card.board_id,
    createdAt: card.created_at,
    updatedAt: card.updated_at,
    // Handle assignee
    assigneeId: card.assignee_id,
    assignee: card.assignee ? {
      id: card.assignee.id,
      name: card.assignee.email,
      avatarUrl: card.assignee.user_metadata?.avatar_url
    } : undefined,
    // Ensure labels are available
    labels: card.metadata?.labels || [],
    // Extract other metadata fields
    cardType: card.metadata?.cardType,
    priority: card.metadata?.priority,
    dueDate: card.metadata?.dueDate,
    blocked: card.metadata?.blocked,
    blockReason: card.metadata?.blockReason,
    // Preserve all metadata
    metadata: card.metadata || {}
  }));
}

// Update a card's status
export async function updateCardStatus(cardId: string, statusId: string): Promise<Card> {
  const supabase = createClient();
  
  // Get the next order number for this status
  const { data: existingCards } = await supabase
    .from('cards')
    .select('order')
    .eq('status_id', statusId)
    .order('order', { ascending: false })
    .limit(1);
  
  const nextOrder = existingCards && existingCards.length > 0 
    ? existingCards[0].order + 1 
    : 1;

  // Update the card
  const { data, error } = await supabase
    .from('cards')
    .update({ 
      status_id: statusId,
      order: nextOrder
    })
    .eq('id', cardId)
    .select(`
      *,
      assignee:assignee_id(id, email, user_metadata)
    `)
    .single();

  if (error) {
    console.error('Error updating card status:', error);
    throw error;
  }

  // Transform to our app model
  return {
    id: data.id,
    title: data.title,
    description: data.description || undefined,
    order: data.order,
    columnId: data.column_id, // Still keeping for backward compatibility
    statusId: data.status_id,
    boardId: data.board_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    // Handle assignee
    assigneeId: data.assignee_id,
    assignee: data.assignee ? {
      id: data.assignee.id,
      name: data.assignee.email,
      avatarUrl: data.assignee.user_metadata?.avatar_url
    } : undefined,
    // Extract metadata fields
    labels: data.metadata?.labels || [],
    cardType: data.metadata?.cardType,
    priority: data.metadata?.priority,
    dueDate: data.metadata?.dueDate,
    blocked: data.metadata?.blocked,
    blockReason: data.metadata?.blockReason,
    // Preserve all metadata
    metadata: data.metadata || {}
  };
} 