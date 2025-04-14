import { createClient } from "@/lib/supabase/client";
import { Card, Label, Epic } from '../../types/card';

// Get all cards for a column with enhanced data
export async function getCardsForColumn(columnId: string): Promise<Card[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('cards')
    .select(`
      *,
      assignee:assignee_id(id, email, user_metadata)
    `)
    .eq('column_id', columnId)
    .order('order');

  if (error) {
    console.error('Error fetching cards:', error);
    throw error;
  }

  // Transform the data to match our frontend model
  return (data || []).map((card: any) => ({
    id: card.id,
    title: card.title,
    description: card.description,
    columnId: card.column_id,
    order: card.order,
    createdAt: card.created_at,
    updatedAt: card.updated_at,
    boardId: card.board_id,
    // Handle assignee
    assigneeId: card.assignee_id,
    assignee: card.assignee ? {
      id: card.assignee.id,
      name: card.assignee.email,
      avatarUrl: card.assignee.user_metadata?.avatar_url
    } : undefined,
    // Ensure labels are available
    labels: card.metadata?.labels || [],
    // Metadata fields as defined in board-context.tsx
    ...(card.metadata || {})
  }));
}

// Add a new card with enhanced fields
export async function addCard(card: Partial<Card> & { column_id?: string }): Promise<Card> {
  const supabase = createClient();

  console.log("Card data received:", JSON.stringify(card, null, 2));

  // Extract fields exactly as done in board-context.tsx
  const {
    cardType, priority, blocked, blockReason, dueDate,
    metadata: cardMetadata,
    assignee, // We'll ignore this
    assigneeId,
    columnId,
    column_id, // Accept both column_id and columnId
    labels, // Extract labels
    ...basicCardData
  } = card;

  // Determine the actual column ID to use (prefer column_id if it exists)
  const actualColumnId = column_id || columnId;

  if (!actualColumnId) {
    throw new Error("Missing required column_id for new card");
  }

  // Make sure we have an order for the card
  const { data: existingCards } = await supabase
    .from('cards')
    .select('order')
    .eq('column_id', actualColumnId)
    .order('order', { ascending: false })
    .limit(1);

  const nextOrder = existingCards?.length
    ? existingCards[0].order + 1
    : 1;

  // Prepare metadata field for database
  const metadata: Record<string, unknown> = {
    ...(cardMetadata || {}),
  };

  // Add extended fields to metadata
  if (cardType) metadata.cardType = cardType;
  if (priority) metadata.priority = priority;
  if (blocked) metadata.blocked = blocked;
  if (blockReason) metadata.blockReason = blockReason;
  if (dueDate) metadata.dueDate = dueDate;
  if (labels) metadata.labels = labels; // Add labels to metadata

  // Create a clean object with correct DB field names
  const dbCardData = {
    title: basicCardData.title,
    description: basicCardData.description,
    order: nextOrder,
    column_id: actualColumnId, // Always use column_id for DB
    assignee_id: assigneeId,
    metadata: metadata
  };

  // Safety check - should never happen with our approach
  if ('columnId' in dbCardData) {
    delete (dbCardData as any).columnId;
  }

  console.log("Inserting card with data:", JSON.stringify(dbCardData, null, 2));

  const { data, error } = await supabase
    .from('cards')
    .insert(dbCardData)
    .select('*')
    .single();

  if (error) {
    console.error('Error adding card:', error);
    throw error;
  }

  // Return the card in the format expected by the frontend
  return {
    id: data.id,
    title: data.title,
    description: data.description || undefined,
    columnId: data.column_id, // Convert back to React property name
    order: data.order,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    assigneeId: data.assignee_id || undefined,
    boardId: data.board_id,
    // Include all metadata fields directly in the card object
    ...(data.metadata || {}),
    labels: data.metadata?.labels || [] // Ensure labels are available
  };
}

// Update an existing card
export async function updateCard(id: string, card: Partial<Card>): Promise<Card> {
  const supabase = createClient();

  // Get the existing card to preserve metadata
  const { data: existingCard, error: fetchError } = await supabase
    .from('cards')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Error fetching card:', fetchError);
    throw fetchError;
  }

  // Extract fields that will go into metadata vs direct column fields
  const {
    cardType, priority, blocked, blockReason, dueDate, epic,
    ageing, assignee, labels, metadata, columnId,
    assigneeId, ...basicCardData
  } = card;

  // Start with existing metadata and update with new values
  const updatedMetadata = { ...(existingCard.metadata || {}) };

  // Update metadata fields only if provided in the update
  if (cardType !== undefined) updatedMetadata.cardType = cardType;
  if (priority !== undefined) updatedMetadata.priority = priority;
  if (blocked !== undefined) updatedMetadata.blocked = blocked;
  if (blockReason !== undefined) updatedMetadata.blockReason = blockReason;
  if (dueDate !== undefined) updatedMetadata.dueDate = dueDate;
  if (epic !== undefined) updatedMetadata.epic = epic;
  if (ageing !== undefined) updatedMetadata.ageing = ageing;
  if (labels !== undefined) updatedMetadata.labels = labels;
  if (metadata) Object.assign(updatedMetadata, metadata);

  // Prepare the update data
  const updateData: Record<string, any> = {
    ...basicCardData
  };

  // Only add these fields if they were provided
  if (columnId !== undefined) updateData.column_id = columnId;
  if (assigneeId !== undefined) updateData.assignee_id = assigneeId;

  // Always include metadata updates
  updateData.metadata = updatedMetadata;

  // Perform the update
  const { data, error } = await supabase
    .from('cards')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating card:', error);
    throw error;
  }

  // Return the updated card with metadata fields at top level
  return {
    id: data.id,
    title: data.title,
    description: data.description || undefined,
    columnId: data.column_id,
    order: data.order,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    assigneeId: data.assignee_id || undefined,
    boardId: data.board_id,
    labels: data.metadata?.labels || [],
    ...(data.metadata || {})
  };
}

// Get a single card by ID
export async function getCardById(id: string): Promise<Card> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('cards')
    .select(`
      *,
      assignee:assignee_id(id, email, user_metadata)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching card:', error);
    throw error;
  }

  // Return card with metadata fields at top level, matching board-context pattern
  return {
    id: data.id,
    title: data.title,
    description: data.description || undefined,
    columnId: data.column_id,
    order: data.order,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    boardId: data.board_id,
    assigneeId: data.assignee_id,
    assignee: data.assignee ? {
      id: data.assignee.id,
      name: data.assignee.email,
      avatarUrl: data.assignee.user_metadata?.avatar_url
    } : undefined,
    labels: data.metadata?.labels || [],
    // Spread all metadata fields to top level
    ...(data.metadata || {})
  };
}

// Get all epics
export async function getEpics(): Promise<Epic[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('epics')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching epics:', error);
    throw error;
  }

  return (data || []).map((epic: any) => ({
    id: epic.id,
    name: epic.name,
    description: epic.description,
    color: epic.color
  }));
}

// Get all labels
export async function getLabels(): Promise<Label[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('labels')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching labels:', error);
    throw error;
  }

  return (data || []).map((label: any) => ({
    id: label.id,
    name: label.name,
    color: label.color
  }));
}