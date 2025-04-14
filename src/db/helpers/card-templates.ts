import { createClient } from "@/lib/supabase/client";
import { Card } from '@/types/card';

export interface CardTemplate {
  id: string;
  name: string;
  description: string;
  template: Partial<Card>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all card templates for the current user
 */
export async function getCardTemplates(): Promise<CardTemplate[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('card_templates')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching card templates:', error);
    throw error;
  }

  // Transform from DB format to frontend format
  return (data || []).map(template => ({
    id: template.id,
    name: template.name,
    description: template.description || '',
    template: template.template,
    createdAt: template.created_at,
    updatedAt: template.updated_at
  }));
}

/**
 * Get a specific card template by ID
 */
export async function getCardTemplateById(id: string): Promise<CardTemplate> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('card_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching card template:', error);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description || '',
    template: data.template,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

/**
 * Create a new card template
 */
export async function createCardTemplate(
  name: string,
  description: string,
  template: Partial<Card>
): Promise<CardTemplate> {
  const supabase = createClient();

  // Clean template data to remove unnecessary fields
  const cleanedTemplate = { ...template };

  // Remove fields that shouldn't be part of a template
  delete cleanedTemplate.id;
  delete cleanedTemplate.createdAt;
  delete cleanedTemplate.updatedAt;
  delete cleanedTemplate.columnId;
  delete cleanedTemplate.boardId;
  delete cleanedTemplate.order;

  // For assignee, we don't want to copy the specific user
  delete cleanedTemplate.assigneeId;
  delete cleanedTemplate.assignee;

  const { data, error } = await supabase
    .from('card_templates')
    .insert({
      name,
      description,
      template: cleanedTemplate
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating card template:', error);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description || '',
    template: data.template,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

/**
 * Update an existing card template
 */
export async function updateCardTemplate(
  id: string,
  updates: Partial<{
    name: string;
    description: string;
    template: Partial<Card>;
  }>
): Promise<CardTemplate> {
  const supabase = createClient();

  // If template is being updated, clean it
  if (updates.template) {
    const cleanedTemplate = { ...updates.template };

    // Remove fields that shouldn't be part of a template
    delete cleanedTemplate.id;
    delete cleanedTemplate.createdAt;
    delete cleanedTemplate.updatedAt;
    delete cleanedTemplate.columnId;
    delete cleanedTemplate.boardId;
    delete cleanedTemplate.order;
    delete cleanedTemplate.assigneeId;
    delete cleanedTemplate.assignee;

    updates.template = cleanedTemplate;
  }

  const { data, error } = await supabase
    .from('card_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating card template:', error);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description || '',
    template: data.template,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

/**
 * Delete a card template
 */
export async function deleteCardTemplate(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('card_templates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting card template:', error);
    throw error;
  }
}

/**
 * Apply a template to create a new card
 */
export async function applyCardTemplate(
  templateId: string,
  columnId: string
): Promise<Card> {
  // Get the template
  const template = await getCardTemplateById(templateId);

  // Create card data
  const cardData: Partial<Card> = {
    ...template.template,
    columnId
  };

  // Use the existing addCard function to create a card
  const supabase = createClient();
  const { data, error } = await supabase
    .from('cards')
    .insert({
      title: cardData.title,
      description: cardData.description,
      column_id: columnId,
      metadata: {
        cardType: cardData.cardType,
        priority: cardData.priority,
        dueDate: cardData.dueDate,
        labels: cardData.labels,
        blocked: cardData.blocked,
        blockReason: cardData.blockReason,
        ...(cardData.metadata || {})
      }
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error applying card template:', error);
    throw error;
  }

  // Return the card in the format expected by the frontend
  return {
    id: data.id,
    title: data.title,
    description: data.description || undefined,
    columnId: data.column_id,
    order: data.order,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    boardId: data.board_id,
    ...(data.metadata || {}),
    labels: data.metadata?.labels || []
  };
}