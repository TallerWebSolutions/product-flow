import React from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Card as CardType } from "./card";
import { DraggableCard } from "./draggable-card";
import { cn } from "@/lib/utils";

type CardListProps = {
  cards: CardType[];
  className?: string;
  onCardClick?: (cardId: string) => void;
  columnId: string; // Add columnId to identify which column these cards belong to
  onDuplicate?: (cardId: string) => Promise<void>;
  onArchive?: (cardId: string) => Promise<void>;
  onDelete?: (cardId: string) => Promise<void>;
};

export function CardList({
  cards,
  className,
  onCardClick,
  columnId,
  onDuplicate,
  onArchive,
  onDelete
}: CardListProps) {
  // Get sorted cards by order
  const sortedCards = [...cards].sort((a, b) => a.order - b.order);

  const handleCardClick = (cardId: string) => {
    if (onCardClick) {
      onCardClick(cardId);
    }
  };

  return (
    <Droppable droppableId={columnId} type="card">
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={cn("space-y-2", className)}
        >
          {sortedCards.length > 0 ? (
            sortedCards.map((card, index) => (
              <Draggable key={card.id} draggableId={card.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{
                      ...provided.draggableProps.style,
                      marginBottom: "0.5rem"
                    }}
                  >
                    <DraggableCard
                      card={card}
                      onClick={() => handleCardClick(card.id)}
                      className={snapshot.isDragging ? "card-dragging" : ""}
                      isDragging={snapshot.isDragging}
                      onDuplicate={onDuplicate}
                      onArchive={onArchive}
                      onDelete={onDelete}
                    />
                  </div>
                )}
              </Draggable>
            ))
          ) : (
            <div className="p-4 text-center text-slate-500 text-sm min-h-[100px] border border-dashed border-slate-300 rounded">
              No cards yet
            </div>
          )}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}