import React from "react";
import { Column as ColumnType } from "./board-layout";
import { Column } from "./column";
import { Card as CardType } from "./card";
import { Draggable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";

type DraggableColumnProps = {
  column: ColumnType;
  index: number;
  cards: CardType[];
  invalidDropTarget?: string | null;
  onEditColumn?: (columnId: string) => void;
  onDeleteColumn?: (columnId: string) => void;
  onAddSubColumn?: (parentId: string) => void;
  onReorderSubColumns?: (subColumns: ColumnType[], parentId: string) => void;
  onCardClick?: (cardId: string) => void;
  className?: string;
  onDuplicateCard?: (cardId: string) => Promise<void>;
  onArchiveCard?: (cardId: string) => Promise<void>;
  onDeleteCard?: (cardId: string) => Promise<void>;
};

export const DraggableColumn = ({
  column,
  index,
  cards,
  invalidDropTarget,
  onEditColumn,
  onDeleteColumn,
  onAddSubColumn,
  onReorderSubColumns,
  onCardClick,
  className,
  onDuplicateCard,
  onArchiveCard,
  onDeleteCard
}: DraggableColumnProps) => {
  console.log(`Rendering DraggableColumn for column ${column.id} at index ${index}`);

  return (
    <Draggable draggableId={column.id} index={index}>
      {(provided, snapshot) => {
        console.log(`Draggable function for column ${column.id}, isDragging: ${snapshot.isDragging}`);

        return (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={cn(
              "h-full flex-shrink-0",
              snapshot.isDragging ? "ring-2 ring-blue-400 shadow-lg bg-blue-50 rounded-md z-50" : "",
              invalidDropTarget === column.id ? "ring-2 ring-red-500 bg-red-50 rounded-md" : "",
              className
            )}
            style={provided.draggableProps.style}
          >
            <Column
              column={column}
              cards={cards}
              onEditColumn={onEditColumn}
              onDeleteColumn={onDeleteColumn}
              onAddSubColumn={onAddSubColumn}
              onReorderSubColumns={onReorderSubColumns}
              onCardClick={onCardClick}
              isInvalidDropTarget={invalidDropTarget === column.id}
              dragHandleProps={provided.dragHandleProps}
              className="h-full"
              onDuplicateCard={onDuplicateCard}
              onArchiveCard={onArchiveCard}
              onDeleteCard={onDeleteCard}
            />
          </div>
        );
      }}
    </Draggable>
  );
};

DraggableColumn.displayName = 'DraggableColumn';