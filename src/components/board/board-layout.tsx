import React, { useState, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  DropResult,
  DragStart
} from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { Column } from "./column";
import { Card as CardType } from "./card";
import { DraggableColumn } from "./draggable-column";

// Define types for the board structure
export type Column = {
  id: string;
  name: string;
  minWipLimit?: number;
  maxWipLimit?: number;
  order: number;
  parentId?: string | null;
  subColumns?: Column[];
};

export type BoardProps = {
  columns: Column[];
  cards: CardType[];
  className?: string;
  onEditColumn?: (columnId: string) => void;
  onDeleteColumn?: (columnId: string) => void;
  onAddSubColumn?: (parentId: string) => void;
  onReorderColumns?: (columns: Column[]) => void;
  onReorderSubColumns?: (subColumns: Column[], parentId: string) => void;
  onCardClick?: (cardId: string) => void;
  onReorderCards?: (cards: CardType[], columnId: string) => void;
  onMoveCardToColumn?: (cardId: string, targetColumnId: string) => void;
  onDuplicateCard?: (cardId: string) => Promise<void>;
  onArchiveCard?: (cardId: string) => Promise<void>;
  onDeleteCard?: (cardId: string) => Promise<void>;
};

// Removing the inline DraggableColumn component and using the imported one instead

export function BoardLayout({
  columns,
  cards,
  className,
  onEditColumn,
  onDeleteColumn,
  onAddSubColumn,
  onReorderColumns,
  onReorderSubColumns,
  onCardClick,
  onReorderCards,
  onMoveCardToColumn,
  onDuplicateCard,
  onArchiveCard,
  onDeleteCard
}: BoardProps) {
  const [invalidDropTarget, setInvalidDropTarget] = useState<string | null>(null);

  // Filter top-level columns (those without parent)
  const topLevelColumns = columns
    .filter(col => !col.parentId)
    .sort((a, b) => a.order - b.order);

  // Generic function to handle reordering items
  const reorderItems = useCallback(<T extends { id: string }>(
    items: T[],
    sourceIndex: number,
    destinationIndex: number
  ): T[] => {
    const result = Array.from(items);
    const [removed] = result.splice(sourceIndex, 1);
    result.splice(destinationIndex, 0, removed);
    return result.map((item, index) => ({ ...item, order: index + 1 }));
  }, []);

  // Helper to check if a column would violate WIP limits if a card is added or removed
  const checkWipLimitViolation = useCallback((columnId: string, operation: 'add' | 'remove' = 'add'): { isViolation: boolean; type?: 'min' | 'max' } => {
    const column = columns.find(col => col.id === columnId);
    if (!column) {
      return { isViolation: false };
    }

    // Count cards in this column only (not including subcolumns)
    // Only count non-archived cards
    const cardsInColumn = cards.filter(card =>
      card.columnId === columnId &&
      !(card.metadata?.archived === true)
    ).length;

    // Check for violations based on operation
    if (operation === 'add') {
      // When adding a card, we check if it would exceed the maximum limit
      if (column.maxWipLimit && cardsInColumn + 1 > column.maxWipLimit) {
        return { isViolation: true, type: 'max' };
      }
    } else if (operation === 'remove') {
      // When removing a card, we check if it would go below the minimum limit
      if (column.minWipLimit !== undefined && cardsInColumn - 1 < column.minWipLimit) {
        return { isViolation: true, type: 'min' };
      }
    }

    return { isViolation: false };
  }, [columns, cards]);

  // Handle drag start to detect potential WIP limit violations
  const handleDragStart = useCallback((initial: DragStart) => {
    setInvalidDropTarget(null);

    if (initial.type !== 'card') {
      return; // Only check for cards
    }

    // Find columns that would violate WIP limit if this card is added
    const columnsWithLimits = columns.filter(col => col.maxWipLimit !== undefined);
    const card = cards.find(c => c.id === initial.draggableId);

    if (!card) return;

    // If the card is already in a column, we don't count it when checking that column's limit
    const cardSourceColumnId = card.columnId;

    // Mark columns that would violate WIP limits as invalid drop targets
    columnsWithLimits.forEach(col => {
      // Skip the source column since removing and re-adding doesn't change count
      if (col.id === cardSourceColumnId) return;

      // Check if adding the card would violate the limit
      const violation = checkWipLimitViolation(col.id, 'add');
      if (violation.isViolation) {
        setInvalidDropTarget(col.id);
      }
    });
  }, [columns, cards, checkWipLimitViolation]);

  // Handler for drag end events
  const handleDragEnd = useCallback((result: DropResult) => {
    const { source, destination, type, draggableId } = result;

    console.log('DRAG END EVENT TRIGGERED:', {
      source,
      destination,
      type,
      draggableId,
      topLevelColumnsCount: topLevelColumns.length
    });

    // Always reset invalidDropTarget
    setInvalidDropTarget(null);

    // If there's no destination or item was dropped in the same place, do nothing
    if (!destination ||
        (source.droppableId === destination.droppableId &&
         source.index === destination.index)) {
      console.log('No destination or same position, ignoring drag');
      return;
    }

    // Handle different drag types
    switch (type) {
      case 'card': {
        const sourceColumnId = source.droppableId;
        const destinationColumnId = destination.droppableId;

        // When moving between columns, check for WIP limit violation
        if (sourceColumnId !== destinationColumnId) {
          // Check destination column for max WIP limit violation
          const destViolation = checkWipLimitViolation(destinationColumnId, 'add');

          if (destViolation.isViolation && destViolation.type === 'max') {
            console.log(`Max WIP limit would be violated for column: ${destinationColumnId}`);
            // Don't proceed with the move
            return;
          }

          // Check source column for min WIP limit violation
          const sourceViolation = checkWipLimitViolation(sourceColumnId, 'remove');

          if (sourceViolation.isViolation && sourceViolation.type === 'min') {
            console.log(`Min WIP limit would be violated for column: ${sourceColumnId}`);
            // Don't proceed with the move
            return;
          }

          if (onMoveCardToColumn) {
            onMoveCardToColumn(draggableId, destinationColumnId);
          }
          return;
        }

        // Reordering within the same column
        if (onReorderCards) {
          const columnCards = cards
            .filter(card => card.columnId === sourceColumnId && !(card.metadata?.archived === true))
            .sort((a, b) => a.order - b.order);
          const reorderedCards = reorderItems(columnCards, source.index, destination.index);
          onReorderCards(reorderedCards, sourceColumnId);
        }
        break;
      }

      case 'subcolumn': {
        // Extract parent column ID from droppableId (format: 'subcolumn-{parentId}')
        const parentColumnId = source.droppableId.substring(source.droppableId.indexOf('-') + 1);
        const parentColumn = columns.find(col => col.id === parentColumnId);

        if (!parentColumn?.subColumns || !onReorderSubColumns) {
          return;
        }

        const reorderedSubColumns = reorderItems(
          parentColumn.subColumns,
          source.index,
          destination.index
        );

        onReorderSubColumns(reorderedSubColumns, parentColumnId);
        break;
      }

      case 'column': {
        if (!onReorderColumns) {
          console.log('No onReorderColumns handler provided, cannot reorder');
          return;
        }

        console.log('Reordering columns from', source.index, 'to', destination.index);
        console.log('Top level columns before reorder:', topLevelColumns.map(c => ({ id: c.id, order: c.order })));

        const reorderedColumns = reorderItems(
          topLevelColumns,
          source.index,
          destination.index
        );

        console.log('Reordered columns:', reorderedColumns.map(c => ({ id: c.id, order: c.order })));

        // Merge with sub-columns that weren't moved
        const nonTopLevelColumns = columns.filter(col => col.parentId);
        const allColumns = [...reorderedColumns, ...nonTopLevelColumns];

        console.log('Calling onReorderColumns with:', allColumns.map(c => ({ id: c.id, order: c.order })));
        onReorderColumns(allColumns);
        break;
      }
    }
  }, [columns, cards, onMoveCardToColumn, onReorderCards, onReorderSubColumns, onReorderColumns, topLevelColumns, reorderItems]);

  // Empty board state
  const emptyBoardUI = (
    <div className="flex items-center justify-center h-full">
      <div className="text-center p-8 border rounded-lg bg-slate-50">
        <h3 className="text-lg font-medium mb-2">No columns yet</h3>
        <p className="text-slate-500">
          Start by adding columns to your board
        </p>
      </div>
    </div>
  );

  // Move the drag handler out of the render function to avoid closure issues
  const onDragEndHandler = (result: DropResult) => {
    console.log('Direct onDragEnd handler called with result:', result);
    handleDragEnd(result);
  };

  return (
    <div className={cn("w-full h-full overflow-x-auto py-2", className)}>
      {columns.length > 0 ? (
        <DragDropContext onDragEnd={onDragEndHandler} onDragStart={handleDragStart}>
          <Droppable
            droppableId="board"
            type="column"
            direction="horizontal"
          >
            {(provided) => (
              <div
                className="flex gap-6 p-4 pb-8 h-full items-start min-h-[200px]"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {topLevelColumns.map((column, index) => (
                  <DraggableColumn
                    key={column.id}
                    column={column}
                    index={index}
                    cards={cards}
                    invalidDropTarget={invalidDropTarget}
                    onEditColumn={onEditColumn}
                    onDeleteColumn={onDeleteColumn}
                    onAddSubColumn={onAddSubColumn}
                    onReorderSubColumns={onReorderSubColumns}
                    onCardClick={onCardClick}
                    onDuplicateCard={onDuplicateCard}
                    onArchiveCard={onArchiveCard}
                    onDeleteCard={onDeleteCard}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : emptyBoardUI}
    </div>
  );
}