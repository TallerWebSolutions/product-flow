import React from "react";
import { cn } from "@/lib/utils";

type CardPlaceholderProps = {
  count: number;
  columnId: string;
  className?: string;
};

export function CardPlaceholder({
  count,
  columnId,
  className
}: CardPlaceholderProps) {
  if (count <= 0) return null;

  // Create an array with 'count' elements
  const cards = Array.from({ length: Math.min(count, 10) }, (_, i) => i);

  // If there are more than 10 cards, we'll show a "+X more" indicator
  const hasMoreCards = count > 10;

  return (
    <div className={cn("space-y-2", className)}>
      {cards.map((index) => (
        <div
          key={`${columnId}-card-${index}`}
          className="bg-white rounded p-2 border shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="h-2 w-1/2 bg-slate-200 rounded-full mb-2" />
          <div className="h-2 w-3/4 bg-slate-200 rounded-full mb-2" />
          <div className="h-2 w-2/3 bg-slate-200 rounded-full" />
        </div>
      ))}

      {hasMoreCards && (
        <div className="text-center text-xs text-slate-500 py-1">
          +{count - 10} more cards
        </div>
      )}
    </div>
  );
}