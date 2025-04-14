export interface Card {
  id: string;
  title: string;
  description?: string;
  columnId: string; // Will be removed in future steps; kept for backward compatibility
  statusId: string; // Now required instead of optional
  order: number;
  createdAt: string;
  updatedAt: string;
  boardId?: string;

  // Enhanced fields
  cardType?: 'feature' | 'bug' | 'chore';
  priority?: 'high' | 'medium' | 'low';
  dueDate?: string;
  assigneeId?: string;
  assignee?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  blocked?: boolean;
  blockReason?: string;
  epicId?: string;
  epic?: string; // Just the epic name for simpler display
  labels?: string[]; // Array of label names
  ageing?: number; // Stored in metadata

  // Raw metadata for internal use
  metadata?: Record<string, unknown>;
}

export interface Label {
  id: string;
  name: string;
  color?: string;
}

export interface Epic {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

// New Status interface based on the diagram
export interface Status {
  id: string;
  name: string;
  color?: string;
  order?: number;
  transitionId?: string; // Transition relationship from diagram
}