import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Info, GripHorizontal } from "lucide-react";
import { Column } from "./board-layout";
import { WipLimitIndicator } from "./wip-limit-indicator";
import { ColumnActions } from "./column-actions";
import { cn } from "@/lib/utils";
import { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";

type ColumnHeaderProps = {
  column: Column;
  cardCount: number;
  onEdit?: (columnId: string) => void;
  onDelete?: (columnId: string) => void;
  isCollapsible?: boolean;
  isCollapsed?: boolean;
  onCollapseToggle?: () => void;
  className?: string;
  dragHandleProps?: DraggableProvidedDragHandleProps;
};

export function ColumnHeader({
  column,
  cardCount,
  onEdit,
  onDelete,
  isCollapsible = false,
  isCollapsed = false,
  onCollapseToggle,
  className,
  dragHandleProps
}: ColumnHeaderProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const toggleTooltip = () => setShowTooltip(!showTooltip);

  // Determine status class based on WIP limits
  const statusClass = useMemo(() => {
    if (!column.maxWipLimit) return "";

    if (cardCount >= column.maxWipLimit) return "border-l-4 border-l-red-500";
    if (cardCount >= column.maxWipLimit * 0.8) return "border-l-4 border-l-amber-500";
    if (column.minWipLimit !== undefined && cardCount < column.minWipLimit) return "border-l-4 border-l-red-500";
    return "border-l-4 border-l-green-500";
  }, [
    // Use explicit primitive values instead of objects
    column.maxWipLimit || 0,
    column.minWipLimit,
    cardCount
  ]);

  // Calculate progress percentage for the progress bar
  const { progressPercentage, progressColor } = useMemo(() => {
    if (!column.maxWipLimit) {
      return {
        progressPercentage: 0,
        progressColor: "bg-green-500"
      };
    }

    const percentage = Math.min(Math.round((cardCount / column.maxWipLimit) * 100), 100);
    let color = "bg-green-500";

    if (cardCount >= column.maxWipLimit) {
      color = "bg-red-500";
    } else if (cardCount >= column.maxWipLimit * 0.8) {
      color = "bg-amber-500";
    } else if (column.minWipLimit !== undefined && cardCount < column.minWipLimit) {
      color = "bg-red-500";
    }

    return { progressPercentage: percentage, progressColor: color };
  }, [
    // Use explicit primitive values instead of objects
    column.maxWipLimit || 0,
    column.minWipLimit,
    cardCount
  ]);

  return (
    <div className="relative">
      <div
        className={cn(
          "p-3 border-b bg-slate-200 rounded-t-md font-medium flex items-center justify-between",
          statusClass,
          dragHandleProps && "cursor-grab active:cursor-grabbing hover:bg-slate-300 transition-colors",
          isCollapsed && "p-2 h-full flex-col border-b-0 rounded-r-md pt-4 pb-4",
          className
        )}
        {...dragHandleProps}
      >
        <div className={cn(
          "flex items-center gap-2 overflow-hidden flex-grow",
          isCollapsed && "flex-col w-full items-center"
        )}>
          {dragHandleProps && (
            <GripHorizontal className={cn(
              "h-4 w-4 text-slate-500 flex-shrink-0",
              !isCollapsed ? "mr-1" : "my-1"
            )} />
          )}

          {isCollapsible && (
            <button
              onClick={onCollapseToggle}
              className={cn(
                "p-1 rounded hover:bg-slate-300",
                isCollapsed && "w-full flex justify-center my-1"
              )}
              aria-label={isCollapsed ? "Expand column" : "Collapse column"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}

          {isCollapsed ? (
            <div className="vertical-text text-sm font-medium mt-4 px-1 truncate text-center w-full flex-grow">
              {column.name}
            </div>
          ) : (
            <>
              <h3 className="truncate font-medium">{column.name}</h3>

              <div className="relative inline-block ml-1">
                <button
                  onClick={toggleTooltip}
                  className="text-slate-500 hover:text-slate-700"
                  aria-label="Column information"
                >
                  <Info className="h-4 w-4" />
                </button>

                {showTooltip && (
                  <div className="absolute left-0 top-full mt-1 z-10 bg-white p-2 shadow-lg rounded border text-xs w-48">
                    <p className="font-medium mb-1">{column.name}</p>
                    {(column.minWipLimit !== undefined || column.maxWipLimit) && (
                      <p>WIP Limit: {column.minWipLimit !== undefined ? `${column.minWipLimit}-` : ''}{column.maxWipLimit}</p>
                    )}
                    <p>Current: {cardCount} items</p>
                    {column.maxWipLimit && cardCount > column.maxWipLimit && (
                      <p className="text-red-500 font-medium">Exceeds max WIP limit!</p>
                    )}
                    {column.minWipLimit !== undefined && cardCount < column.minWipLimit && (
                      <p className="text-red-500 font-medium">Below min WIP limit!</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {!isCollapsed && (
          <div className="flex items-center gap-2">
            {column.maxWipLimit && (
              <WipLimitIndicator
                currentCount={cardCount}
                minWipLimit={column.minWipLimit}
                maxWipLimit={column.maxWipLimit}
              />
            )}

            <ColumnActions
              columnId={column.id}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        )}
      </div>

      {/* Progress bar */}
      {column.maxWipLimit && !isCollapsed && (
        <div className="h-1 bg-slate-300 w-full">
          <div
            className={cn("h-full transition-all duration-300", progressColor)}
            style={{ width: `${progressPercentage}%` }}
            title={`${progressPercentage}% of WIP limit`}
          />
        </div>
      )}
    </div>
  );
}
