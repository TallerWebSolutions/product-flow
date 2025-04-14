/**
 * Board represents a Kanban board
 */
export interface Board {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Column represents a column in a Kanban board
 */
export interface Column {
  id: string;
  board_id: string;
  name: string;
  order: number;
  parent_column_id: string | null;
  wip_limit: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Card represents a task card in a Kanban board column
 */
export interface Card {
  id: string;
  title: string;
  description: string | null;
  column_id: string;
  order: number;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
  metadata: CardMetadata;
}

/**
 * CardMetadata represents additional data that can be stored with a card
 */
export interface CardMetadata {
  labels?: string[];
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  estimatedTime?: number;
  spentTime?: number;
  [key: string]: unknown;
}

/**
 * Metric represents an event in the system for analytics
 */
export interface Metric {
  id: string;
  board_id: string;
  card_id: string | null;
  event_type: EventType;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * EventType represents the types of events that can be tracked
 */
export type EventType =
  | 'card_created'
  | 'card_updated'
  | 'card_moved'
  | 'card_deleted'
  | 'column_added'
  | 'column_updated'
  | 'column_deleted'
  | 'board_created'
  | 'board_updated'
  | 'board_deleted'
  | 'wip_limit_exceeded'
  | 'card_assigned'
  | 'card_unassigned';

/**
 * Database types for use with Supabase
 */
export type Tables = {
  boards: Board;
  columns: Column;
  cards: Card;
  metrics: Metric;
};