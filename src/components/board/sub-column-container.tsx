import React, { useMemo } from "react";
import {
  Droppable,
  Draggable,
  DroppableProvided,
  DraggableProvided,
  DraggableStateSnapshot
} from "@hello-pangea/dnd";
import { Column as ColumnType } from "./board-layout";
import { Column } from "./column";
import { Card as CardType } from "./card";
import { cn } from "@/lib/utils";

type SubColumnContainerProps = {
  parentColumn: ColumnType;
  subColumns: ColumnType[];
  onEditColumn?: (columnId: string) => void;
  onDeleteColumn?: (columnId: string) => void;
  onAddSubColumn?: (parentId: string) => void;
  onReorderSubColumns?: (subColumns: ColumnType[], parentId: string) => void;
  cards?: CardType[];
  onCardClick?: (cardId: string) => void;
  onDuplicateCard?: (cardId: string) => Promise<void>;
  onArchiveCard?: (cardId: string) => Promise<void>;
  onDeleteCard?: (cardId: string) => Promise<void>;
};

// Memoized SubColumn component to prevent unnecessary re-renders
const SubColumn = React.memo(({
  subColumn,
  index,
  onEditColumn,
  onDeleteColumn,
  onAddSubColumn,
  cards,
  onCardClick,
  onDuplicateCard,
  onArchiveCard,
  onDeleteCard
}: {
  subColumn: ColumnType;
  index: number;
  onEditColumn?: (columnId: string) => void;
  onDeleteColumn?: (columnId: string) => void;
  onAddSubColumn?: (parentId: string) => void;
  cards: CardType[];
  onCardClick?: (cardId: string) => void;
  onDuplicateCard?: (cardId: string) => Promise<void>;
  onArchiveCard?: (cardId: string) => Promise<void>;
  onDeleteCard?: (cardId: string) => Promise<void>;
}) => {
  return (
    <Draggable
      key={subColumn.id}
      draggableId={subColumn.id}
      index={index}
    >
      {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "min-w-[260px] max-w-[320px] h-full",
            snapshot.isDragging && "ring-2 ring-blue-400 shadow-lg bg-blue-50 rounded-md"
          )}
          style={{
            ...provided.draggableProps.style
          }}
        >
          <Column
            column={subColumn}
            onEditColumn={onEditColumn}
            onDeleteColumn={onDeleteColumn}
            onAddSubColumn={onAddSubColumn}
            cards={cards}
            onCardClick={onCardClick}
            dragHandleProps={provided.dragHandleProps}
            className="h-full"
            onDuplicateCard={onDuplicateCard}
            onArchiveCard={onArchiveCard}
            onDeleteCard={onDeleteCard}
          />
        </div>
      )}
    </Draggable>
  );
});

SubColumn.displayName = 'SubColumn';

export const SubColumnContainer = React.memo(function SubColumnContainer({
  parentColumn,
  subColumns,
  onEditColumn,
  onDeleteColumn,
  onAddSubColumn,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onReorderSubColumns, // This prop is passed through but handled by BoardLayout's handleDragEnd
  cards = [],
  onCardClick,
  onDuplicateCard,
  onArchiveCard,
  onDeleteCard
}: SubColumnContainerProps) {
  // Memoize sorted subcolumns to prevent unnecessary re-sorting
  const sortedSubColumns = useMemo(() => {
    return [...subColumns].sort((a, b) => a.order - b.order);
  }, [
    // Use more stable dependencies:
    // Length check and a string of IDs rather than the entire objects
    subColumns.length,
    subColumns.map(col => col.id).join(',')
  ]);

  return (
    <Droppable
      droppableId={`subcolumn-${parentColumn.id}`}
      direction="horizontal"
      type="subcolumn"
    >
      {(provided: DroppableProvided) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className="flex gap-6 p-3 overflow-x-auto pb-4 h-full"
        >
          {sortedSubColumns.map((subColumn, index) => (
            <SubColumn
              key={subColumn.id}
              subColumn={subColumn}
              index={index}
              onEditColumn={onEditColumn}
              onDeleteColumn={onDeleteColumn}
              onAddSubColumn={onAddSubColumn}
              cards={cards}
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
  );
});