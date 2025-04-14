import React from "react";
import { Card as CardType, Card } from "./card";

type DraggableCardProps = {
  card: CardType;
  onClick?: () => void;
  className?: string;
  isDragging?: boolean;
  onDuplicate?: (cardId: string) => Promise<void>;
  onArchive?: (cardId: string) => Promise<void>;
  onDelete?: (cardId: string) => Promise<void>;
};

export function DraggableCard({
  card,
  onClick,
  className,
  isDragging,
  onDuplicate,
  onArchive,
  onDelete
}: DraggableCardProps) {
  return (
    <Card
      card={card}
      onClick={onClick}
      className={className}
      isDragging={isDragging}
      onDuplicate={onDuplicate}
      onArchive={onArchive}
      onDelete={onDelete}
    />
  );
}