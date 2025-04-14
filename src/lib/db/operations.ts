import { createClient } from '@/lib/supabase/server';
import {
  Board,
  Card,
  Column,
  Metric,
  EventType
} from './schema';

// Board operations
export const boardOperations = {
  /**
   * Create a new board
   */
  createBoard: async (name: string, description?: string): Promise<Board | null> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('boards')
      .insert({
        name,
        description: description || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating board:', error);
      return null;
    }

    return data;
  },

  /**
   * Get a board by ID
   */
  getBoard: async (id: string): Promise<Board | null> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('boards')
      .select()
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching board:', error);
      return null;
    }

    return data;
  },

  /**
   * Get all boards for the current user
   */
  getUserBoards: async (): Promise<Board[]> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('boards')
      .select()
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching boards:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Update a board
   */
  updateBoard: async (id: string, updates: Partial<Board>): Promise<Board | null> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('boards')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating board:', error);
      return null;
    }

    return data;
  },

  /**
   * Delete a board
   */
  deleteBoard: async (id: string): Promise<boolean> => {
    const supabase = await createClient();

    const { error } = await supabase
      .from('boards')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting board:', error);
      return false;
    }

    return true;
  }
};

// Column operations
export const columnOperations = {
  /**
   * Create a new column
   */
  createColumn: async (
    boardId: string,
    name: string,
    order: number,
    parentColumnId?: string | null,
    wipLimit?: number | null
  ): Promise<Column | null> => {
    const supabase = await createClient();

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
      .single();

    if (error) {
      console.error('Error creating column:', error);
      return null;
    }

    return data;
  },

  /**
   * Get all columns for a board
   */
  getBoardColumns: async (boardId: string): Promise<Column[]> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('columns')
      .select()
      .eq('board_id', boardId)
      .order('order', { ascending: true });

    if (error) {
      console.error('Error fetching columns:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Update a column
   */
  updateColumn: async (id: string, updates: Partial<Column>): Promise<Column | null> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('columns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating column:', error);
      return null;
    }

    return data;
  },

  /**
   * Delete a column
   */
  deleteColumn: async (id: string): Promise<boolean> => {
    const supabase = await createClient();

    const { error } = await supabase
      .from('columns')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting column:', error);
      return false;
    }

    return true;
  }
};

// Card operations
export const cardOperations = {
  /**
   * Create a new card
   */
  createCard: async (
    columnId: string,
    title: string,
    description?: string | null,
    order?: number,
    assigneeId?: string | null,
    metadata?: Record<string, unknown>
  ): Promise<Card | null> => {
    const supabase = await createClient();

    // If order isn't provided, get the max order in the column and add 1
    if (order === undefined) {
      const { data: maxOrderData } = await supabase
        .from('cards')
        .select('order')
        .eq('column_id', columnId)
        .order('order', { ascending: false })
        .limit(1)
        .single();

      order = maxOrderData ? maxOrderData.order + 1 : 0;
    }

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
      .single();

    if (error) {
      console.error('Error creating card:', error);
      return null;
    }

    // Log a metric for card creation
    await logMetric('card_created', data.id, { columnId });

    return data;
  },

  /**
   * Get all cards for a column
   */
  getColumnCards: async (columnId: string): Promise<Card[]> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('cards')
      .select()
      .eq('column_id', columnId)
      .order('order', { ascending: true });

    if (error) {
      console.error('Error fetching cards:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get a card by ID
   */
  getCard: async (id: string): Promise<Card | null> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('cards')
      .select()
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching card:', error);
      return null;
    }

    return data;
  },

  /**
   * Update a card
   */
  updateCard: async (id: string, updates: Partial<Card>): Promise<Card | null> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('cards')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating card:', error);
      return null;
    }

    // Log a metric for card update
    await logMetric('card_updated', id, updates);

    return data;
  },

  /**
   * Move a card to a different column
   */
  moveCard: async (
    cardId: string,
    newColumnId: string,
    newOrder: number
  ): Promise<Card | null> => {
    const supabase = await createClient();

    const { data: card } = await supabase
      .from('cards')
      .select('column_id, order')
      .eq('id', cardId)
      .single();

    if (!card) {
      console.error('Card not found');
      return null;
    }

    const oldColumnId = card.column_id;
    const oldOrder = card.order;

    const { data, error } = await supabase
      .from('cards')
      .update({
        column_id: newColumnId,
        order: newOrder
      })
      .eq('id', cardId)
      .select()
      .single();

    if (error) {
      console.error('Error moving card:', error);
      return null;
    }

    // Log a metric for card movement
    await logMetric('card_moved', cardId, {
      oldColumnId,
      newColumnId,
      oldOrder,
      newOrder
    });

    return data;
  },

  /**
   * Delete a card
   */
  deleteCard: async (id: string): Promise<boolean> => {
    const supabase = await createClient();

    // Get the card first to log a metric
    const { data: card } = await supabase
      .from('cards')
      .select()
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting card:', error);
      return false;
    }

    // Log a metric for card deletion
    if (card) {
      await logMetric('card_deleted', id, card);
    }

    return true;
  }
};

// Metrics operations
export const metricsOperations = {
  /**
   * Get metrics for a board within a date range
   */
  getBoardMetrics: async (
    boardId: string,
    startDate?: Date,
    endDate?: Date,
    eventTypes?: EventType[]
  ): Promise<Metric[]> => {
    const supabase = await createClient();

    let query = supabase
      .from('metrics')
      .select()
      .eq('board_id', boardId);

    if (startDate) {
      query = query.gte('timestamp', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('timestamp', endDate.toISOString());
    }

    if (eventTypes && eventTypes.length > 0) {
      query = query.in('event_type', eventTypes);
    }

    query = query.order('timestamp', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching metrics:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get metrics for a specific card
   */
  getCardMetrics: async (
    cardId: string,
    eventTypes?: EventType[]
  ): Promise<Metric[]> => {
    const supabase = await createClient();

    let query = supabase
      .from('metrics')
      .select()
      .eq('card_id', cardId);

    if (eventTypes && eventTypes.length > 0) {
      query = query.in('event_type', eventTypes);
    }

    query = query.order('timestamp', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching card metrics:', error);
      return [];
    }

    return data || [];
  }
};

/**
 * Log a metric to track events in the system
 */
export async function logMetric(
  eventType: EventType,
  cardId: string | null = null,
  data: Record<string, unknown> = {}
): Promise<Metric | null> {
  const supabase = await createClient();

  // If there's a cardId, we need to get the board_id
  let boardId: string | null = null;

  if (cardId) {
    const { data: card } = await supabase
      .from('cards')
      .select('column_id')
      .eq('id', cardId)
      .single();

    if (card) {
      const { data: column } = await supabase
        .from('columns')
        .select('board_id')
        .eq('id', card.column_id)
        .single();

      if (column) {
        boardId = column.board_id;
      }
    }
  }

  if (!boardId && data && typeof data === 'object' && 'boardId' in data) {
    boardId = (data.boardId as string);
  }

  if (!boardId) {
    console.error('Cannot log metric without board_id');
    return null;
  }

  const { data: metricData, error } = await supabase
    .from('metrics')
    .insert({
      board_id: boardId,
      card_id: cardId,
      event_type: eventType,
      data
    })
    .select()
    .single();

  if (error) {
    console.error('Error logging metric:', error);
    return null;
  }

  return metricData;
}