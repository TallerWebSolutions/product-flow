import { createClient } from "@/lib/supabase/client";
import { Status, Transition, StatusColumn } from '@/types/status';

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