"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { Column } from "@/components/board/board-layout";
import { Card } from "@/components/board/card";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeColumns } from "@/lib/supabase/hooks";
import { toast } from "sonner";

// The actual data we'd fetch from Supabase would match this interface
interface ColumnData {
  id: string;
  name: string;
  order: number;
  parent_column_id: string | null;
  min_wip_limit: number | null;
  wip_limit: number | null;
  board_id: string;
  created_at: string;
  updated_at: string;
}

interface CardData {
  id: string;
  title: string;
  description: string | null;
  order: number;
  column_id: string; // Will be removed in future migration; kept for backward compatibility
  status_id: string; // Now required instead of optional
  board_id?: string; // Make board_id optional since we might not have it in some DB responses
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown> | null;
  assignee_id: string | null;
}

type BoardContextType = {
  columns: Column[];
  cards: Card[];
  isLoading: boolean;
  error: string | null;
  guidance: string | null;
  addColumn: (column: Omit<Column, "id" | "order">) => void;
  updateColumn: (column: Partial<Column> & { id: string }) => void;
  deleteColumn: (columnId: string) => void;
  reorderColumns: (reorderedColumns: Column[]) => void;
  reorderSubColumns: (reorderedSubColumns: Column[], parentId: string) => void;
  getTopLevelColumns: () => Column[];
  getCardCount: (columnId: string) => number;
  realtimeStatus: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  reorderCards: (updatedCards: Card[]) => void;
  moveCardToColumn: (cardId: string, sourceColumnId: string | null, targetColumnId: string) => void;
  moveCardToStatus: (cardId: string, statusId: string) => Promise<void>;
  findColumnById: (id: string, columnsToSearch?: Column[]) => Column | undefined;
  addCard: (card: Partial<Card> & { column_id?: string }) => Promise<Card>;
  updateCard: (card: Partial<Card> & { id: string }) => Promise<Card>;
  deleteCard: (cardId: string) => Promise<void>;
};

// Valid UUID format for board
const DEFAULT_BOARD_UUID = "d3d5e773-107f-4bd6-8249-345d0b3b737a";

const BoardContext = createContext<BoardContextType | undefined>(undefined);
// Return memo-ized version of columns and subcolumns for stable references
const useMemoizedColumns = (columns: Column[]) => {
  // Create a stable dependency value instead of a variable-length array
  const dependencyString = useMemo(() => {
    return columns.map(col =>
      `${col.id}:${col.order}:${col.subColumns?.length || 0}:${col.subColumns?.map(sc => `${sc.id}:${sc.order}`).join(',') || ''}`
    ).join('|');
  }, [columns]);

  return useMemo(() => columns, [dependencyString]);
};

export function BoardProvider({
  children,
  boardId
}: {
  children: React.ReactNode;
  boardId: string;
}) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({});
  const [guidance, setGuidance] = useState<string | null>(null);

  // Subscribe to realtime updates for the board's columns
  const { status: realtimeStatus, error: realtimeError } = useRealtimeColumns(boardId);

  // Setup realtime handlers
  useEffect(() => {
    if (realtimeError) {
      toast.error("Realtime connection error", {
        description: realtimeError,
      });
    }
  }, [realtimeError]);

  useEffect(() => {
    if (realtimeStatus === 'CONNECTED') {
      toast.success("Connected to realtime updates", {
        description: "Board changes will be updated in real-time",
      });
    }
  }, [realtimeStatus]);

  // Convert Supabase column format to our app's column format
  const convertToAppColumn = useCallback((dbColumn: ColumnData): Column => {
    return {
      id: dbColumn.id,
      name: dbColumn.name,
      order: dbColumn.order,
      parentId: dbColumn.parent_column_id,
      // Only apply WIP limits to top-level columns
      minWipLimit: dbColumn.parent_column_id ? undefined : (dbColumn.min_wip_limit || undefined),
      maxWipLimit: dbColumn.parent_column_id ? undefined : (dbColumn.wip_limit || undefined),
      subColumns: [], // Will be populated later
    };
  }, []);

  // Convert Supabase card format to our app's card format
  const convertToAppCard = useCallback((dbCard: CardData): Card => {
    const metadata = dbCard.metadata || {};

    const cardBoardId = dbCard.board_id || boardId;

    return {
      id: dbCard.id,
      title: dbCard.title,
      description: dbCard.description || undefined,
      order: dbCard.order,
      columnId: dbCard.column_id,
      statusId: dbCard.status_id,
      boardId: cardBoardId,
      createdAt: dbCard.created_at,
      updatedAt: dbCard.updated_at,
      // Extended fields from metadata
      cardType: metadata.cardType as Card["cardType"],
      priority: metadata.priority as Card["priority"],
      dueDate: metadata.dueDate as string | undefined,
      blocked: metadata.blocked as boolean | undefined,
      blockReason: metadata.blockReason as string | undefined,
      assigneeId: dbCard.assignee_id || undefined,
      labels: metadata.labels as string[] || [], // Ensure labels are properly extracted
      metadata: {
        ...metadata, // Preservar todos os campos originais do metadata
        epic: metadata.epic as string | undefined,
        ageing: (metadata.ageing as number) || 0,
        // Garantir que archived seja preservado
        archived: metadata.archived as boolean | undefined,
        archivedAt: metadata.archivedAt as string | undefined,
      },
    };
  }, [boardId]);

  // Build the column hierarchy
  const buildColumnHierarchy = useCallback((flatColumns: Column[]): Column[] => {
    // Create a map of all columns by ID with initialized subColumns arrays
    const columnsById = flatColumns.reduce(
      (acc, column) => ({
        ...acc,
        [column.id]: { ...column, subColumns: [] }
      }),
      {} as Record<string, Column>
    );

    // Group columns by their parentId
    const columnsByParentId = flatColumns.reduce(
      (acc, column) => {
        const parentId = column.parentId || "null";
        return {
          ...acc,
          [parentId]: [...(acc[parentId] || []), columnsById[column.id]]
        };
      },
      {} as Record<string, Column[]>
    );

    // Assign subcolumns to their parent columns
    Object.entries(columnsByParentId).forEach(([parentId, children]) => {
      if (parentId !== "null") {
        columnsById[parentId].subColumns = children.sort((a, b) => a.order - b.order);
      }
    });

    // Return sorted root columns
    return (columnsByParentId["null"] || []).sort((a, b) => a.order - b.order);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setGuidance(null);

      // Fetch real data from Supabase
      const supabase = await createClient();

      console.log(`Attempting to fetch data for board_id: ${boardId}`);

      // First, verify if the board exists
      const { data: boardData, error: boardError } = await supabase
        .from('boards')
        .select('id')
        .eq('id', boardId)
        .single();

      if (boardError) {
        console.error('Error checking board:', boardError);
        throw new Error(`Failed to verify board: ${boardError.message}`);
      }

      // Fetch columns for this specific board only
      const { data: dbColumns, error: columnsError } = await supabase
        .from('columns')
        .select('*')
        .eq('board_id', boardId)
        .order('order', { ascending: true });

      if (columnsError) {
        console.error('Error fetching columns:', columnsError);
        throw new Error(`Failed to fetch columns: ${columnsError.message}`);
      }

      console.log(`Fetched ${dbColumns?.length || 0} columns for board ${boardId}`);

      // Fetch cards for this specific board
      const { data: dbCards, error: cardsError } = await supabase
        .from('cards')
        .select(`
          id, title, description, order, column_id, status_id,
          assignee_id, created_at, updated_at, metadata
        `)
        .in('column_id', dbColumns?.map(col => col.id) || [])
        .order('order', { ascending: true });

      if (cardsError) {
        console.error('Error fetching cards:', cardsError);
        throw new Error(`Failed to fetch cards: ${cardsError.message}`);
      }

      console.log(`Fetched ${dbCards?.length || 0} cards for board ${boardId}`);

      // Also fetch the status_columns mapping to support the new status-based model
      const { data: statusColumns, error: statusColumnsError } = await supabase
        .from('status_columns')
        .select('status_id, column_id')
        .filter('column_id', 'in', `(${dbColumns?.map(col => col.id).join(',')})`)
        .order('created_at', { ascending: true });

      if (statusColumnsError) {
        console.error('Error fetching status-column mappings:', statusColumnsError);
        // Non-critical error, we can proceed without this data during transition
      } else {
        console.log(`Fetched ${statusColumns?.length || 0} status-column mappings`);
      }

      if (!boardData) {
        console.error(`Board with ID ${boardId} not found in the 'boards' table`);
        setError(`Board with ID ${boardId} not found. Please check your Supabase database.`);
        setColumns([]);
        setCards([]);
        setCardCounts({});
        setIsLoading(false);
        return;
      }

      console.log('Board found:', boardData);

      // If no columns were found but no error occurred, it might mean the board is empty
      if (!dbColumns || dbColumns.length === 0) {
        setColumns([]);
        setCards([]);
        setCardCounts({});
        // Set guidance instead of error
        setGuidance("This board doesn't have any columns yet. Click 'Add Column' to get started.");
        setError(null); // Clear any existing errors
        setIsLoading(false);
        return;
      }

      if (dbCards && dbCards.length > 0) {
        // Convert to our app's card format
        const appCards = dbCards.map(dbCard => {
          const metadata = dbCard.metadata || {};

          return {
            id: dbCard.id,
            title: dbCard.title,
            description: dbCard.description || undefined,
            order: dbCard.order,
            columnId: dbCard.column_id,
            statusId: dbCard.status_id || undefined,
            boardId: boardId,
            createdAt: dbCard.created_at,
            updatedAt: dbCard.updated_at,
            // Extended fields from metadata
            cardType: metadata.cardType as Card["cardType"],
            priority: metadata.priority as Card["priority"],
            dueDate: metadata.dueDate as string | undefined,
            blocked: metadata.blocked as boolean | undefined,
            blockReason: metadata.blockReason as string | undefined,
            assigneeId: dbCard.assignee_id || undefined,
            labels: metadata.labels as string[] || [],
            metadata: {
              ...metadata,
              epic: metadata.epic as string | undefined,
              ageing: (metadata.ageing as number) || 0,
              archived: metadata.archived as boolean | undefined,
              archivedAt: metadata.archivedAt as string | undefined,
            },
          };
        });

        console.log('Converted cards to app format:', appCards);
        setCards(appCards);
      } else {
        console.log('No cards found in Supabase');
        setCards([]);
      }

      // Convert columns to our app's column format
      const appColumns = dbColumns.map(convertToAppColumn);

      // Build the column hierarchy
      const hierarchicalColumns = buildColumnHierarchy(appColumns);

      setColumns(hierarchicalColumns);
      setError(null); // Clear any previous errors

      // Calculate card counts per column based on status-column mapping and card statuses
      const counts: Record<string, number> = {};

      if (dbCards && dbCards.length > 0 && statusColumns && statusColumns.length > 0) {
        // Create a mapping of status_id to column_id
        const statusToColumnMap: Record<string, string[]> = {};
        statusColumns.forEach(sc => {
          if (!statusToColumnMap[sc.status_id]) {
            statusToColumnMap[sc.status_id] = [];
          }
          statusToColumnMap[sc.status_id].push(sc.column_id);
        });

        // Calculate counts based on status
        const appCards = dbCards.map(convertToAppCard);
        appCards.forEach(card => {
          if (card.statusId && statusToColumnMap[card.statusId]) {
            // A status can be mapped to multiple columns
            statusToColumnMap[card.statusId].forEach(columnId => {
              counts[columnId] = (counts[columnId] || 0) + 1;
            });
          } else {
            // Fallback to direct column mapping for backward compatibility
            counts[card.columnId] = (counts[card.columnId] || 0) + 1;
          }
        });
      } else if (dbCards && dbCards.length > 0) {
        // Fallback to old direct column mapping if no status-column mappings exist
        const appCards = dbCards.map(convertToAppCard);
        appCards.forEach(card => {
          counts[card.columnId] = (counts[card.columnId] || 0) + 1;
        });
      }

      console.log('Card counts by column:', counts);
      setCardCounts(counts);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch board data";
      console.error('Board fetch error:', error);
      setError(errorMessage);
      // Set empty states to prevent undefined errors in the UI
      setColumns([]);
      setCards([]);
      setCardCounts({});

      toast.error("Failed to load board data", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [buildColumnHierarchy, convertToAppColumn, convertToAppCard, boardId]);

  // Initialize the board provider, including schema migrations
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up realtime handlers for column changes
  useEffect(() => {
    const supabase = createClient();

    // This handles INSERT/UPDATE/DELETE events on the columns table
    const channelName = `board-columns-${boardId}`;
    const channel = supabase.channel(channelName);

    // Subscribe to changes
    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'columns',
        filter: 'board_id=eq.' + boardId,
      }, async (payload) => {
        console.log('Column change detected:', payload);

        // Handle each event type differently for better performance
        if (payload.eventType === 'INSERT') {
          // For INSERT, convert the new column to our app format and add it
          const newColumn = convertToAppColumn(payload.new as ColumnData);

          setColumns(prevColumns => {
            // Create a new array with all existing columns + new column
            const updatedColumns = [...prevColumns];

            // If it's a subcolumn, find its parent and add to its subColumns
            if (newColumn.parentId) {
              // Find the parent column (which might be nested)
              const findAndUpdateParent = (cols: Column[]): Column[] => {
                return cols.map(col => {
                  if (col.id === newColumn.parentId) {
                    // Add the new subcolumn to this parent
                    return {
                      ...col,
                      subColumns: [...(col.subColumns || []), newColumn].sort((a, b) => a.order - b.order)
                    };
                  } else if (col.subColumns && col.subColumns.length > 0) {
                    // Check in this column's subColumns
                    return {
                      ...col,
                      subColumns: findAndUpdateParent(col.subColumns)
                    };
                  }
                  return col;
                });
              };

              return findAndUpdateParent(updatedColumns);
            } else {
              // It's a top-level column, just add it to the array and resort
              return [...updatedColumns, newColumn].sort((a, b) => a.order - b.order);
            }
          });

          toast.success('Column added', {
            description: `Column "${payload.new.name}" was added to the board.`,
          });
        } else if (payload.eventType === 'UPDATE') {
          // For UPDATE, find and update the specific column
          const updatedColumn = convertToAppColumn(payload.new as ColumnData);

          setColumns(prevColumns => {
            // Create a function to recursively find and update the column
            const findAndUpdateColumn = (cols: Column[]): Column[] => {
              return cols.map(col => {
                if (col.id === updatedColumn.id) {
                  // Preserve subColumns from the existing column
                  return { ...updatedColumn, subColumns: col.subColumns || [] };
                } else if (col.subColumns && col.subColumns.length > 0) {
                  // Check in this column's subColumns
                  return {
                    ...col,
                    subColumns: findAndUpdateColumn(col.subColumns)
                  };
                }
                return col;
              });
            };

            // Get updated columns
            let updatedColumns = findAndUpdateColumn(prevColumns);

            // If parentId changed, we might need to rebuild the hierarchy
            if (payload.old.parent_column_id !== payload.new.parent_column_id) {
              // Extract all columns into a flat array
              const extractAllColumns = (cols: Column[]): Column[] => {
                return cols.reduce((acc, col) => {
                  acc.push({ ...col, subColumns: [] });
                  if (col.subColumns && col.subColumns.length > 0) {
                    acc.push(...extractAllColumns(col.subColumns));
                  }
                  return acc;
                }, [] as Column[]);
              };

              const flatColumns = extractAllColumns(updatedColumns);
              // Rebuild using our optimized buildColumnHierarchy function
              updatedColumns = buildColumnHierarchy(flatColumns);
            }

            return updatedColumns;
          });

          toast.info('Column updated', {
            description: `Column "${payload.new.name}" was updated.`,
          });
        } else if (payload.eventType === 'DELETE') {
          // For DELETE, remove the column from the array
          const deletedColumnId = payload.old.id;
          console.log(`Realtime DELETE event for column ID: ${deletedColumnId}`);

          // Skip if this was manually deleted through our deleteColumn function
          // We've already optimistically updated the UI in that case
          if (payload.old.manually_deleted === true) {
            console.log('Column was manually deleted, skipping realtime update');
            return;
          }

          // For all columns (both top-level and subcolumns), use the filter approach
          setColumns(prevColumns => {
            console.log(`Removing column ID: ${deletedColumnId} from state`);

            // Recursively filter out the deleted column and its children
            const filterDeletedColumn = (cols: Column[]): Column[] => {
              return cols
                .filter(col => col.id !== deletedColumnId) // Remove the deleted column
                .map(col => ({
                  ...col,
                  // Apply the filter to any subColumns
                  subColumns: col.subColumns ? filterDeletedColumn(col.subColumns) : []
                }));
            };

            const filteredColumns = filterDeletedColumn(prevColumns);
            console.log(`Columns after delete: ${filteredColumns.length} vs previous ${prevColumns.length}`);
            return filteredColumns;
          });

          // Also update card counts by removing the entry for the deleted column
          setCardCounts(prev => {
            const newCounts = { ...prev };
            delete newCounts[deletedColumnId];
            return newCounts;
          });

          // Determine entity type for toast
          const isSubcolumn = !!payload.old.parent_column_id;
          const entityType = isSubcolumn ? "Subcolumn" : "Column";

          toast.info(`${entityType} removed`, {
            description: `A ${entityType.toLowerCase()} was removed from the board.`,
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [convertToAppColumn, buildColumnHierarchy, boardId]);

  // Set up realtime handlers for card changes
  useEffect(() => {
    const supabase = createClient();

    // This handles INSERT/UPDATE/DELETE events on the cards table
    const channelName = `board-cards-${boardId}`;
    const channel = supabase.channel(channelName);

    // First get column IDs for this board to use in the subscription
    const boardColumnIds = columns.map(col => col.id);

    if (boardColumnIds.length === 0) {
      return; // No columns yet, so no need to subscribe to card changes
    }

    // Subscribe to changes for cards in any of our columns
    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'cards',
        // Cards don't have board_id directly, they have column_id which links to columns
        // We can only filter on a single field, so we'll need to handle filtering in our callback
      }, async (payload) => {
        console.log('Card change detected:', payload);

        // Define a type for the card payload
        type CardPayload = { column_id?: string };

        // Get the column_id from the payload safely
        const newCard = payload.new as CardPayload | null;
        const oldCard = payload.old as CardPayload | null;
        const columnId = newCard?.column_id || oldCard?.column_id;

        // Only process events for cards in our board's columns
        if (columnId && boardColumnIds.includes(columnId)) {
          // Refresh the entire board data
          await fetchData();

          // Show a toast notification
          if (payload.eventType === 'INSERT') {
            toast.success('Card added', {
              description: `Card "${payload.new.title}" was added to the board.`,
            });
          } else if (payload.eventType === 'UPDATE') {
            toast.info('Card updated', {
              description: `Card "${payload.new.title}" was updated.`,
            });
          } else if (payload.eventType === 'DELETE') {
            toast.info('Card removed', {
              description: `A card was removed from the board.`,
            });
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, columns]);

  const addColumn = async (columnData: Omit<Column, "id" | "order">) => {
    try {
      const newOrder = getNextOrder(columnData.parentId);

      // Add column to Supabase
      const supabase = await createClient();

      // First, get the highest order among all columns (including subcolumns)
      // to ensure a globally unique order value
      const { data: maxOrderData, error: maxOrderError } = await supabase
        .from('columns')
        .select('order')
        .eq('board_id', boardId)
        .order('order', { ascending: false })
        .limit(1);

      if (maxOrderError) {
        throw new Error(`Failed to get max order: ${maxOrderError.message}`);
      }

      // Use a globally unique order value to avoid conflicts
      const globalMaxOrder = maxOrderData && maxOrderData.length > 0 ? maxOrderData[0].order : 0;
      const uniqueOrder = globalMaxOrder + 1;

      console.log(`Adding column with order=${uniqueOrder} (local order would be ${newOrder})`);

      const { data, error } = await supabase
        .from('columns')
        .insert({
          board_id: boardId,
          name: columnData.name,
          order: uniqueOrder,
          parent_column_id: columnData.parentId || null,
          min_wip_limit: columnData.minWipLimit || null,
          wip_limit: columnData.maxWipLimit || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Insert error details:", error);
        throw new Error(`Failed to add column: ${error.message}`);
      }

      // The realtime subscription will update the columns
      toast.success('Column added', {
        description: `Column "${data.name}" was added to the board.`,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add column";
      console.error("Add column error:", error);
      toast.error("Failed to add column", {
        description: errorMessage,
      });
    }
  };

  const updateColumn = async (updatedColumn: Partial<Column> & { id: string }) => {
    try {
      // Update in Supabase
      const supabase = await createClient();

      const updates: Record<string, unknown> = {};
      if (updatedColumn.name !== undefined) updates.name = updatedColumn.name;
      if (updatedColumn.order !== undefined) updates.order = updatedColumn.order;
      if (updatedColumn.parentId !== undefined) updates.parent_column_id = updatedColumn.parentId;
      if (updatedColumn.minWipLimit !== undefined) updates.min_wip_limit = updatedColumn.minWipLimit;
      if (updatedColumn.maxWipLimit !== undefined) updates.wip_limit = updatedColumn.maxWipLimit;

      const { error } = await supabase
        .from('columns')
        .update(updates)
        .eq('id', updatedColumn.id);

      if (error) {
        throw new Error(`Failed to update column: ${error.message}`);
      }

      // The realtime subscription will update the columns
      toast.success('Column updated', {
        description: `Column "${updatedColumn.name || 'Unknown'}" was updated.`,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update column";
      toast.error("Failed to update column", {
        description: errorMessage,
      });
    }
  };

  const deleteColumn = async (columnId: string) => {
    console.log(`deleteColumn called with ID: ${columnId}`);

    try {
      // Find the column to delete to reference in toast messages
      const columnToDelete = findColumnById(columnId);
      console.log(`Column to delete:`, columnToDelete);

      if (!columnToDelete) {
        console.error(`Column with ID ${columnId} not found`);
        throw new Error(`Column with ID ${columnId} not found`);
      }

      // Determine if this is a column or subcolumn
      const isSubcolumn = !!columnToDelete.parentId;
      const entityType = isSubcolumn ? "subcolumn" : "column";

      // Check if the column contains cards
      const columnCards = cards.filter(card => card.columnId === columnId);
      if (columnCards.length > 0) {
        console.log(`Cannot delete ${entityType} with ID ${columnId} - it contains ${columnCards.length} cards`);
        toast.error(`Cannot delete ${entityType}`, {
          description: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} "${columnToDelete.name}" contains cards. Move or delete the cards first.`,
        });
        return;
      }

      // For parent columns, also check if any of their subcolumns contain cards
      if (!isSubcolumn && columnToDelete.subColumns && columnToDelete.subColumns.length > 0) {
        const subColumnIds = columnToDelete.subColumns.map(sc => sc.id);
        const hasSubcolumnCards = cards.some(card => subColumnIds.includes(card.columnId));

        if (hasSubcolumnCards) {
          console.log(`Cannot delete column with ID ${columnId} - its subcolumns contain cards`);
          toast.error(`Cannot delete column`, {
            description: `Column "${columnToDelete.name}" has subcolumns containing cards. Move or delete the cards first.`,
          });
          return;
        }
      }

      // STEP 1: UPDATE DATABASE FIRST
      console.log(`Sending delete request to Supabase for ${entityType} ID: ${columnId}`);
      const supabase = await createClient();

      // Delete the column from the database
      const { error } = await supabase
        .from('columns')
        .delete()
        .eq('id', columnId);

      if (error) {
        console.error(`Delete ${entityType} error from Supabase:`, error);
        throw new Error(`Failed to delete ${entityType}: ${error.message}`);
      }

      console.log(`Successfully deleted ${entityType} ${columnId} from Supabase`);

      // STEP 2: DIRECTLY UPDATE THE UI STATE WITHOUT WAITING FOR REALTIME

      // For subcolumns, we need to update the parent column's subColumns array
      if (isSubcolumn && columnToDelete.parentId) {
        console.log(`Manually updating UI for subcolumn deletion, parent: ${columnToDelete.parentId}`);

        // Complete state refresh instead of trying to selectively update
        // This is the most reliable way to handle nested structure updates
        await fetchData();
      } else {
        // For top-level columns, we can simply filter them out
        console.log(`Manually updating UI for column deletion`);
        setColumns(prevColumns => prevColumns.filter(c => c.id !== columnId));

        // Also update card counts
        setCardCounts(prev => {
          const newCounts = { ...prev };
          delete newCounts[columnId];
          return newCounts;
        });
      }

      // Show success toast
      toast.success(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} deleted`, {
        description: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} "${columnToDelete.name}" was deleted successfully.`,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete column";
      console.error("Delete column error:", error);
      toast.error("Failed to delete column", {
        description: errorMessage,
      });

      // Reload data in case of error to reset state
      fetchData();
    }
  };

  const reorderColumns = async (reorderedColumns: Column[]) => {
    try {
      console.log('CONTEXT: reorderColumns called with:', reorderedColumns.map(c => ({ id: c.id, order: c.order })));

      // 1. Apply optimistic update to local state FIRST before any server calls
      setColumns(prevColumns => {
        console.log('CONTEXT: Applying optimistic update to columns');

        // Create a flat copy of all columns (including subcolumns)
        const extractAllColumns = (columns: Column[]): Column[] => {
          return columns.reduce((acc, col) => {
            // Add this column (without subColumns)
            const colWithoutSub = { ...col, subColumns: [] };
            acc.push(colWithoutSub);

            // If it has subColumns, extract them too
            if (col.subColumns && col.subColumns.length > 0) {
              acc.push(...extractAllColumns(col.subColumns));
            }

            return acc;
          }, [] as Column[]);
        };

        // Get all columns in a flat structure
        const allColumns = extractAllColumns(prevColumns);

        // Update the order of reordered columns
        reorderedColumns.forEach(updatedColumn => {
          const colToUpdate = allColumns.find(c => c.id === updatedColumn.id);
          if (colToUpdate) {
            colToUpdate.order = updatedColumn.order;
            console.log(`CONTEXT: Updated column ${updatedColumn.id} to order ${updatedColumn.order}`);
          }
        });

        // Rebuild the hierarchy with the updated orders
        const result = buildColumnHierarchy(allColumns);
        console.log('CONTEXT: Optimistically updated columns');
        return result;
      });

      // 2. AFTER UI is updated, perform server updates in the background
      const supabase = await createClient();
      const updatePromises = [];

      // Queue up all updates to run in parallel
      for (const column of reorderedColumns) {
        console.log(`CONTEXT: Queueing update for column ${column.id} to order ${column.order}`);

        const updatePromise = supabase
          .from('columns')
          .update({ order: column.order })
          .eq('id', column.id)
          .select()
          .then(({ data, error }) => {
            if (error) {
              console.error(`Update failed for column ${column.id}:`, error);
              return { success: false, id: column.id, error };
            } else {
              console.log(`Successfully updated column ${column.id} to order ${column.order}`, data);
              return { success: true, id: column.id };
            }
          });

        updatePromises.push(updatePromise);
      }

      // Wait for all updates to complete, but UI is already updated
      const results = await Promise.all(updatePromises);
      const allSucceeded = results.every(r => r.success);
      const anySucceeded = results.some(r => r.success);

      // Show appropriate toast based on results
      if (allSucceeded) {
        toast.success('Columns reordered', {
          description: 'Column order updated successfully.',
        });
      } else if (anySucceeded) {
        toast.success('Some columns reordered', {
          description: 'Some columns were successfully updated.',
        });
      } else {
        toast.error('Failed to update database', {
          description: 'Changes shown may not persist after refresh.',
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to reorder columns";
      console.error('CONTEXT: Reorder columns error:', error);

      toast.error("Failed to reorder columns", {
        description: errorMessage,
      });

      // Don't immediately reset the UI - let the user see their changes
      // Instead, schedule a refresh to sync with server state
      setTimeout(() => {
        console.log('CONTEXT: Refreshing data after error');
        fetchData();
      }, 2000);
    }
  };

  // Handler for reordering cards within a status
  const reorderCards = async (updatedCards: Card[]) => {
    try {
      // Update the local state optimistically
      setCards(prevCards => {
        const newCards = [...prevCards];

        // Update cards that were reordered
        updatedCards.forEach(updatedCard => {
          const index = newCards.findIndex(c => c.id === updatedCard.id);
          if (index !== -1) {
            newCards[index] = updatedCard;
          }
        });

        return newCards;
      });

      // Update in Supabase
      const supabase = await createClient();
      console.log('Reordering cards in Supabase:', updatedCards.map(c => ({ id: c.id, order: c.order })));

      // Update all card orders
      // Note: First, get the highest order value to use as a starting point for temporary orders
      const { data: maxOrderData, error: maxOrderError } = await supabase
        .from('cards')
        .select('order')
        .order('order', { ascending: false })
        .limit(1);

      if (maxOrderError) {
        console.error('Error getting max order:', maxOrderError);
        throw new Error(`Failed to get max order: ${maxOrderError.message}`);
      }

      // Get the highest order value plus a buffer
      const maxOrder = (maxOrderData && maxOrderData.length > 0) ? maxOrderData[0].order : 0;
      const tempOrderBase = maxOrder + 10000;

      // Group cards by status
      const cardsByStatus: Record<string, Card[]> = {};

      updatedCards.forEach(card => {
        // Group by status (primary)
        if (card.statusId) {
          if (!cardsByStatus[card.statusId]) {
            cardsByStatus[card.statusId] = [];
          }
          cardsByStatus[card.statusId].push(card);
        }
      });

      // Two-phase update to avoid constraint violations
      for (let i = 0; i < updatedCards.length; i++) {
        const card = updatedCards[i];
        const tempOrder = tempOrderBase + i;

        // First set temporary high orders
        const { error: tempError } = await supabase
          .from('cards')
          .update({ order: tempOrder })
          .eq('id', card.id);

        if (tempError) {
          console.error(`Failed to set temporary order for card ${card.id}:`, tempError);
          throw new Error(`Failed to reorder cards: ${tempError.message}`);
        }
      }

      // Then set final orders
      for (const card of updatedCards) {
        const { error } = await supabase
          .from('cards')
          .update({ order: card.order })
          .eq('id', card.id);

        if (error) {
          console.error(`Failed to set final order for card ${card.id}:`, error);
          throw new Error(`Failed to reorder cards: ${error.message}`);
        }
      }

      toast.success('Cards reordered', {
        description: `Card order updated successfully.`,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to reorder cards";
      console.error('Reorder cards error:', error);
      toast.error("Failed to reorder cards", {
        description: errorMessage,
      });

      // Reload data in case of error to reset state
      fetchData();
    }
  };

  // Helper function to find a column by ID, including nested subcolumns
  const findColumnById = (id: string, columnsToSearch: Column[] = columns): Column | undefined => {
    // First try to find the column directly in the array
    const column = columnsToSearch.find(c => c.id === id);
    if (column) return column;

    // If not found, search through subcolumns
    for (const col of columnsToSearch) {
      if (col.subColumns && col.subColumns.length > 0) {
        const found = findColumnById(id, col.subColumns);
        if (found) return found;
      }
    }

    return undefined;
  };

  // Check if moving a card to a column would violate the WIP limit
  const wouldViolateWipLimit = (targetColumnId: string): boolean => {
    const targetColumn = findColumnById(targetColumnId);

    // If it's a subcolumn or doesn't have a max WIP limit, no violation
    if (!targetColumn || targetColumn.parentId || !targetColumn.maxWipLimit) {
      return false;
    }

    // Find all statuses associated with this column
    const columnStatuses = cards
      .filter(card => card.columnId === targetColumnId)
      .map(card => card.statusId);
    
    // Get unique status IDs for this column
    const uniqueStatusIds = [...new Set(columnStatuses)];
    
    // Count cards that have statuses associated with this column
    const currentCount = cards.filter(card => 
      uniqueStatusIds.includes(card.statusId)
    ).length;

    // Check if adding one more card would exceed the max limit
    return currentCount >= targetColumn.maxWipLimit;
  };

  // Handler for moving a card to a different column
  const moveCardToColumn = async (cardId: string, sourceColumnId: string | null, targetColumnId: string) => {
    try {
      // Find the card to move
      const cardToMove = cards.find(c => c.id === cardId);
      if (!cardToMove) {
        throw new Error(`Card with ID ${cardId} not found`);
      }

      // Check that target column exists
      const targetColumn = findColumnById(targetColumnId);
      if (!targetColumn) {
        throw new Error(`Target column with ID ${targetColumnId} not found`);
      }

      // Check if moving the card would violate the WIP limit
      if (wouldViolateWipLimit(targetColumnId)) {
        toast.error("WIP Limit Violation", {
          description: `Cannot move card to ${targetColumn.name} because it would exceed the column's WIP limit.`,
        });
        return;
      }

      // Find a status associated with this column through status_columns
      const supabase = await createClient();
      
      // Query to find a status mapped to the target column
      const { data: statusColumnData, error: statusColumnError } = await supabase
        .from('status_columns')
        .select('status_id')
        .eq('column_id', targetColumnId)
        .order('created_at', { ascending: true }) // Get the first status created for this column
        .limit(1)
        .single();
      
      if (statusColumnError) {
        if (statusColumnError.code === 'PGRST116') { // PGRST116 = no rows returned
          toast.error("Cannot move card", {
            description: `Column "${targetColumn.name}" has no status associated with it. Please set up a status for this column first.`,
          });
          return;
        } else {
          console.error('Error finding status for column:', statusColumnError);
          throw new Error(`Failed to find status for column: ${statusColumnError.message}`);
        }
      }
      
      // Get the status ID for the target column
      const targetStatusId = statusColumnData.status_id;
      if (!targetStatusId) {
        throw new Error(`No status found for column ${targetColumnId}`);
      }

      // Use moveCardToStatus to update the card's status
      await moveCardToStatus(cardId, targetStatusId);
      
      // We still need to update the column_id for backward compatibility
      // But this will be removed in future versions when we fully migrate to status-based model
      const { error } = await supabase
        .from('cards')
        .update({ column_id: targetColumnId })
        .eq('id', cardId);

      if (error) {
        console.error('Error updating card column_id:', error);
        // This is not a critical error since we've already updated the status_id,
        // so we'll just log it but not throw
        toast.warning('Partial update', {
          description: 'Card status was updated but column reference may be inconsistent.',
        });
      } else {
        // Update the card's columnId in local state
        setCards(prevCards => {
          return prevCards.map(card => {
            if (card.id === cardId) {
              return {
                ...card,
                columnId: targetColumnId,
              };
            }
            return card;
          });
        });

        // Update card counts for columns (for backward compatibility)
        if (sourceColumnId) {
          setCardCounts(prev => {
            const newCounts = { ...prev };
            // Decrease count in source column
            newCounts[sourceColumnId] = Math.max(0, (newCounts[sourceColumnId] || 0) - 1);
            // Increase count in target column
            newCounts[targetColumnId] = (newCounts[targetColumnId] || 0) + 1;
            return newCounts;
          });
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to move card";
      console.error('Move card error:', error);
      toast.error("Failed to move card", {
        description: errorMessage,
      });

      // Reload data in case of error to reset state
      fetchData();
    }
  };

  // Helper function to get the next order number for a new column
  const getNextOrder = (parentId: string | null | undefined): number => {
    const siblingColumns = columns.filter(c =>
      parentId ? c.parentId === parentId : !c.parentId
    );

    return siblingColumns.length > 0
      ? Math.max(...siblingColumns.map(c => c.order)) + 1
      : 1;
  };

  // Get top-level columns for parent selection
  const getTopLevelColumns = (): Column[] => {
    return columns
      .filter(column => !column.parentId)
      .sort((a, b) => a.order - b.order);
  };

  // Get card count for a column
  const getCardCount = (columnId: string): number => {
    // In the transition period, we'll use a hybrid approach that considers both status and direct column association
    
    // Step 1: Get statuses associated with this column
    const columnStatuses = cards
      .filter(card => card.columnId === columnId)
      .map(card => card.statusId);
    
    // Get unique status IDs for this column
    const uniqueStatusIds = [...new Set(columnStatuses)];
    
    // Step 2: Count all cards that have these statuses, regardless of their column
    const statusBasedCount = uniqueStatusIds.length > 0 ?
      cards.filter(card => 
        uniqueStatusIds.includes(card.statusId)
      ).length : 0;
    
    // During transition, we also count cards directly mapped to column for backward compatibility
    const directColumnCount = cards.filter(card => card.columnId === columnId).length;
    
    // Use the maximum of these two counts during the transition period
    const directCount = Math.max(statusBasedCount, directColumnCount);

    // Find the column to check if it has subcolumns
    const column = findColumnById(columnId);
    if (!column || !column.subColumns || column.subColumns.length === 0) {
      return directCount;
    }

    // If it has subcolumns, recursively get the count of all cards in subcolumns
    const subColumnsCount = column.subColumns.reduce((total, subCol) => {
      return total + getCardCount(subCol.id);
    }, 0);

    // Return the sum of direct cards and cards in subcolumns
    return directCount + subColumnsCount;
  };

  // Handler specifically for reordering subcolumns
  const reorderSubColumns = useCallback(async (reorderedSubColumns: Column[], parentId: string) => {
    try {
      // Apply optimistic update to local state first
      setColumns(prevColumns => {
        return prevColumns.map(column => {
          // If this is the parent column that contains the subcolumns being reordered
          if (column.id === parentId) {
            return {
              ...column,
              subColumns: reorderedSubColumns.map(subCol => {
                // Find the original subcolumn to preserve any properties not in the reordered array
                const originalSubCol = column.subColumns?.find(sc => sc.id === subCol.id);
                if (originalSubCol) {
                  return {
                    ...originalSubCol,
                    order: subCol.order
                  };
                }
                return subCol;
              })
            };
          }
          return column;
        });
      });

      console.log(`[context] reorderSubColumns called with ${reorderedSubColumns.length} subcolumns for parent ${parentId}`);

      // Update in Supabase - use a completely different approach
      const supabase = await createClient();

      // Fetch the current state of all subcolumns for this parent
      const { data: existingSubColumns, error: fetchError } = await supabase
        .from('columns')
        .select('id, order')
        .eq('parent_column_id', parentId)
        .order('order', { ascending: true });

      if (fetchError) {
        console.error('[context] Error fetching existing subcolumns:', fetchError);
        throw new Error(`Failed to fetch existing subcolumns: ${fetchError.message}`);
      }

      console.log('[context] Current subcolumn state:', existingSubColumns);

      // Create a mapping of id to target order
      const orderMap = new Map();
      reorderedSubColumns.forEach((col, idx) => {
        orderMap.set(col.id, idx + 1);
      });

      // Check if any order changes are needed
      const needsUpdate = existingSubColumns.some((col) => {
        const targetOrder = orderMap.get(col.id);
        return targetOrder !== col.order;
      });

      if (!needsUpdate) {
        console.log('[context] No order changes needed, skipping update');
        return;
      }

      // One-by-one approach: Update each subcolumn individually
      for (const subColumn of reorderedSubColumns) {
        console.log(`[context] Updating order for subcolumn ${subColumn.id} to ${subColumn.order}`);

        const { error } = await supabase
          .from('columns')
          .update({ order: subColumn.order })
          .eq('id', subColumn.id);

        if (error) {
          console.error(`[context] Failed to update order for subcolumn ${subColumn.id}:`, error);
          throw new Error(`Failed to update subcolumn ${subColumn.id}: ${error.message}`);
        }

        // Add a small delay between updates to avoid constraint issues
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      console.log('[context] Successfully reordered all subcolumns');

      toast.success('Subcolumns reordered', {
        description: 'Subcolumn order updated successfully.',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to reorder subcolumns";
      console.error('[context] Reorder subcolumns error:', error);
      toast.error("Failed to reorder subcolumns", {
        description: errorMessage,
      });

      // Reload data in case of error to reset state
      fetchData();
    }
  }, [fetchData]);

  // When state updates, memoize columns to prevent unnecessary re-renders
  const memoizedColumns = useMemoizedColumns(columns);

  const addCard = async (cardData: Partial<Card> & { column_id?: string }): Promise<Card> => {
    try {
      const supabase = await createClient();

      // Extract the column ID, checking both columnId and column_id properties
      const columnId = cardData.columnId || cardData.column_id;
      
      console.log(`Creating card in column: ${columnId}`);

      if (!columnId) {
        throw new Error("Column ID is required to create a card");
      }

      // Get the column to ensure board association
      const { data: columnData } = await supabase
        .from('columns')
        .select('board_id')
        .eq('id', columnId)
        .single();

      if (!columnData) {
        throw new Error(`Column ${columnId} not found`);
      }

      // We MUST have a status_id for each card
      let statusId = cardData.statusId;
      
      // If no statusId is provided, find a status associated with this column
      if (!statusId) {
        const { data: statusColumnData, error: statusColumnError } = await supabase
          .from('status_columns')
          .select('status_id')
          .eq('column_id', columnId)
          .order('created_at', { ascending: true }) // Get the first status created for this column
          .limit(1)
          .single();
        
        if (!statusColumnError) {
          statusId = statusColumnData.status_id;
        } else if (statusColumnError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error finding status for column:', statusColumnError);
        }
        
        // If no status found via status_columns, use a default status
        if (!statusId) {
          // Try to get the first status by order
          const { data: defaultStatusData, error: defaultStatusError } = await supabase
            .from('statuses')
            .select('id')
            .order('order', { ascending: true })
            .limit(1)
            .single();
            
          if (!defaultStatusError) {
            statusId = defaultStatusData.id;
          } else {
            console.error('Error finding default status:', defaultStatusError);
            throw new Error(`No status found for column ${columnId} and no default status available. Please create a status first.`);
          }
        }
      }

      // Prepare the new card with the correct board ID and status ID
      const newCard = {
        title: cardData.title || 'New Card',
        description: cardData.description || null,
        column_id: columnId,
        status_id: statusId,
        // Calculate the next order if not provided - now based on status rather than column
        order: cardData.order !== undefined ? cardData.order : await getNextOrderForStatus(statusId!),
        assignee_id: cardData.assigneeId || null,
        metadata: {
          ...(cardData.metadata || {}),
          cardType: cardData.cardType || 'task',
          priority: cardData.priority || 'medium',
          labels: cardData.labels || [],
          dueDate: cardData.dueDate,
          blocked: cardData.blocked || false,
          blockReason: cardData.blockReason,
        }
      };

      // Insert the card
      const { data, error } = await supabase
        .from('cards')
        .insert(newCard)
        .select()
        .single();

      if (error) {
        console.error('Error creating card:', error);
        throw new Error(`Failed to create card: ${error.message}`);
      }

      // Convert from DB format to our app format
      const createdCard = convertToAppCard(data);

      // Update local state
      setCards(prevCards => [...prevCards, createdCard]);

      return createdCard;
    } catch (error) {
      console.error("Error adding card:", error);
      throw error;
    }
  };

  const updateCard = async (cardData: Partial<Card> & { id: string }): Promise<Card> => {
    try {
      const supabase = await createClient();
      const { id } = cardData;

      // Find the existing card
      const existingCard = cards.find(c => c.id === id);
      if (!existingCard) {
        throw new Error(`Card with ID ${id} not found`);
      }

      // Extract fields from the extended Card type that aren't in the database schema
      const {
        cardType, priority, blocked, blockReason, dueDate,
        metadata: cardMetadata,
        assignee: _unused, // Using _unused to indicate an intentionally unused variable
        assigneeId,
        statusId,
        ...basicCardData
      } = cardData;

      // Prepare metadata field for database
      const existingMetadata = existingCard.metadata || {};
      const metadata: Record<string, unknown> = {
        ...existingMetadata,
        ...(cardMetadata || {}),
      };

      // Update extended fields in metadata
      if (cardType !== undefined) metadata.cardType = cardType;
      if (priority !== undefined) metadata.priority = priority;
      if (blocked !== undefined) metadata.blocked = blocked;
      if (blockReason !== undefined) metadata.blockReason = blockReason;
      if (dueDate !== undefined) metadata.dueDate = dueDate;

      // Format the card data for Supabase
      const dbCardData = {
        ...basicCardData,
        assignee_id: assigneeId,
        status_id: statusId,
        metadata
      };

      const { data, error } = await supabase
        .from('cards')
        .update(dbCardData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      // Convert from DB format to our app format
      const updatedCard = convertToAppCard(data);

      // Update local state
      setCards(prevCards =>
        prevCards.map(card => card.id === id ? updatedCard : card)
      );

      return updatedCard;
    } catch (error) {
      console.error("Error updating card:", error);
      throw error;
    }
  };

  const deleteCard = async (cardId: string): Promise<void> => {
    try {
      const supabase = await createClient();

      const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;

      // Update local state
      setCards(prevCards => prevCards.filter(card => card.id !== cardId));

    } catch (error) {
      console.error("Error deleting card:", error);
      throw error;
    }
  };

  // Handler for moving a card to a different status
  const moveCardToStatus = async (cardId: string, statusId: string): Promise<void> => {
    try {
      // Find the card to move
      const cardToMove = cards.find(c => c.id === cardId);
      if (!cardToMove) {
        throw new Error(`Card with ID ${cardId} not found`);
      }

      // Get cards with the same status to determine order
      const statusCards = cards.filter(c => c.statusId === statusId);

      // Determine the new order in the target status (add at the end)
      const newOrder = statusCards.length > 0
        ? Math.max(...statusCards.map(c => c.order)) + 1
        : 1;

      // Update the local state optimistically
      setCards(prevCards => {
        return prevCards.map(card => {
          if (card.id === cardId) {
            return {
              ...card,
              statusId: statusId,
              order: newOrder
            };
          }
          return card;
        });
      });

      // Update in Supabase
      const supabase = await createClient();

      const { error } = await supabase
        .from('cards')
        .update({
          status_id: statusId,
          order: newOrder
        })
        .eq('id', cardId);

      if (error) {
        console.error('Error updating card status:', error);
        throw new Error(`Failed to update card status: ${error.message}`);
      }

      toast.success('Card status updated', {
        description: `Card status changed successfully.`,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update card status";
      console.error('Update card status error:', error);
      toast.error("Failed to update card status", {
        description: errorMessage,
      });

      // Reload data in case of error to reset state
      fetchData();
    }
  };

  // Helper function to get the next order number for a new card in a status
  const getNextOrderForStatus = async (statusId: string): Promise<number> => {
    // First check local state for cards with this status
    const statusCards = cards.filter(c => c.statusId === statusId);
    if (statusCards.length > 0) {
      return Math.max(...statusCards.map(c => c.order)) + 1;
    }
    
    // If no cards in local state, check database
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('cards')
        .select('order')
        .eq('status_id', statusId)
        .order('order', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error getting max order for status:', error);
        return 1; // Default to 1 if there's an error
      }

      return data && data.length > 0 ? data[0].order + 1 : 1;
    } catch (error) {
      console.error('Error in getNextOrderForStatus:', error);
      return 1; // Default to 1 if there's an error
    }
  };

  return (
    <BoardContext.Provider
      value={{
        columns: memoizedColumns,
        cards,
        isLoading,
        error,
        guidance,
        addColumn,
        updateColumn,
        deleteColumn,
        reorderColumns,
        reorderSubColumns,
        getTopLevelColumns,
        getCardCount,
        realtimeStatus,
        reorderCards,
        moveCardToColumn,
        moveCardToStatus,
        findColumnById,
        addCard,
        updateCard,
        deleteCard
      }}
    >
      {children}
    </BoardContext.Provider>
  );
}

export function useBoard() {
  const context = useContext(BoardContext);
  if (context === undefined) {
    throw new Error("useBoard must be used within a BoardProvider");
  }
  return context;
}