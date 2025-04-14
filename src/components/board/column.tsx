import React, { useState, useMemo } from "react";
import { Plus, AlertCircle, PlusIcon } from "lucide-react";
import { Column as ColumnType } from "./board-layout";
import { ColumnHeader } from "./column-header";
import { CardList } from "./card-list";
import { Card as CardType } from "./card";
import { SubColumnContainer } from "./sub-column-container";
import { useBoard } from "@/contexts/board-context";
import { cn } from "@/lib/utils";
import { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { CardModal } from "./card-modal";
import { Button } from "@/components/ui/button";

type ColumnProps = {
  column: ColumnType;
  onEditColumn?: (columnId: string) => void;
  onDeleteColumn?: (columnId: string) => void;
  onAddSubColumn?: (parentId: string) => void;
  onReorderSubColumns?: (subColumns: ColumnType[], parentId: string) => void;
  onCardClick?: (cardId: string) => void;
  cards?: CardType[];
  className?: string;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  isPaddedForDragHandle?: boolean;
  isInvalidDropTarget?: boolean;
  onDuplicateCard?: (cardId: string) => Promise<void>;
  onArchiveCard?: (cardId: string) => Promise<void>;
  onDeleteCard?: (cardId: string) => Promise<void>;
};

export function Column({
  column,
  onEditColumn,
  onDeleteColumn,
  onAddSubColumn,
  onReorderSubColumns,
  onCardClick,
  cards = [],
  className,
  dragHandleProps,
  isPaddedForDragHandle,
  isInvalidDropTarget = false,
  onDuplicateCard,
  onArchiveCard,
  onDeleteCard
}: ColumnProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { getCardCount, addCard } = useBoard();
  const cardCount = getCardCount(column.id);
  const [showCardModal, setShowCardModal] = useState(false);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);
  const handleAddSubColumn = () => onAddSubColumn?.(column.id);

  // Column properties
  const isTopLevel = !column.parentId;
  const hasSubColumns = Boolean(column.subColumns?.length);

  // Calculate width based on subcolumn count
  const subColumnCount = column.subColumns?.length || 0;

  // Memoize sorted subcolumns to prevent unnecessary re-sorting
  const sortedSubColumns = useMemo(() =>
    column.subColumns
      ? [...column.subColumns].sort((a, b) => a.order - b.order)
      : [],
    [
      // More stable dependencies
      column.subColumns?.length,
      column.subColumns ? column.subColumns.map(col => col.id).join(',') : ''
    ]
  );

  // Memoize filtered cards to prevent unnecessary filtering
  const columnCards = useMemo(() =>
    cards.filter(card => card.columnId === column.id),
    [
      // More stable dependencies
      cards.length,
      column.id,
      // Create a stable hash of relevant card IDs
      cards
        .filter(card => card.columnId === column.id)
        .map(card => card.id)
        .join(',')
    ]
  );

  // Calculate dynamic width style based on number of subcolumns
  const dynamicWidthStyle = useMemo(() => {
    // For collapsed columns, return a very narrow width
    if (isCollapsed) {
      return { width: '60px', minWidth: '60px', maxWidth: '60px' };
    }

    if (!hasSubColumns) return {};

    // Base width calculation - each subcolumn is around 270px wide
    const baseWidth = 270; // Base subcolumn width
    const gapWidth = 24; // Gap between subcolumns (6 * 4 = 24px for gap-6)
    const containerPadding = 60; // Container padding (p-3 = 12px * 2 = 24px + extra space)

    // Calculate total width needed for all subcolumns including spacing
    // For multiple columns, need to account for gaps between them
    const gapsCount = Math.max(0, subColumnCount - 1);

    // For a single subcolumn, use a width that's just slightly larger than the subcolumn
    if (subColumnCount === 1) {
      return { width: `${baseWidth + containerPadding}px` }; // Single subcolumn with padding
    }

    const calculatedWidth = (subColumnCount * baseWidth) + (gapsCount * gapWidth) + containerPadding;
    return { width: `${calculatedWidth}px` };
  }, [hasSubColumns, subColumnCount, isCollapsed]);

  return (
    <div
      className={cn(
        "flex flex-col bg-slate-100 rounded-md shadow-sm h-full relative",
        !isCollapsed && "min-w-[280px]",
        !isCollapsed && !hasSubColumns && "max-w-[400px]",
        isPaddedForDragHandle && "pl-8",
        isInvalidDropTarget && "ring-2 ring-red-500 bg-red-50",
        hasSubColumns && subColumnCount > 1 && !isCollapsed && "min-w-[600px]", // Only apply min-width for multiple subcolumns when not collapsed
        hasSubColumns && !isCollapsed && "max-w-none", // Remove max-w restriction for all parent columns when not collapsed
        isCollapsed && "w-[60px] min-w-[60px] max-w-[60px] overflow-hidden flex items-center", // Fixed narrow width when collapsed
        className
      )}
      data-column-id={column.id}
      style={hasSubColumns && !isCollapsed ? dynamicWidthStyle : undefined}
    >
      <ColumnHeader
        column={column}
        cardCount={cardCount}
        onEdit={onEditColumn}
        onDelete={onDeleteColumn}
        isCollapsible={true}
        isCollapsed={isCollapsed}
        onCollapseToggle={toggleCollapse}
        dragHandleProps={dragHandleProps || undefined}
      />

      {!isCollapsed && (
        <div className="p-2 flex-1 overflow-auto">
          {hasSubColumns ? (
            <div className="h-full overflow-y-auto">
              <SubColumnContainer
                parentColumn={column}
                subColumns={sortedSubColumns}
                onEditColumn={onEditColumn}
                onDeleteColumn={onDeleteColumn}
                onAddSubColumn={onAddSubColumn}
                onReorderSubColumns={onReorderSubColumns}
                cards={cards}
                onCardClick={onCardClick}
                onDuplicateCard={onDuplicateCard}
                onArchiveCard={onArchiveCard}
                onDeleteCard={onDeleteCard}
              />
            </div>
          ) : (
            <>
              {isInvalidDropTarget && column.maxWipLimit && (
                <div className="mb-2 p-2 bg-red-100 text-red-700 rounded-md text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>WIP limit reached ({column.maxWipLimit} cards maximum)</span>
                </div>
              )}

              {!isInvalidDropTarget && column.minWipLimit !== undefined && cardCount < column.minWipLimit && (
                <div className="mb-2 p-2 bg-red-100 text-red-700 rounded-md text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>Below minimum WIP limit ({column.minWipLimit} cards minimum)</span>
                </div>
              )}

              {!isInvalidDropTarget && column.maxWipLimit && cardCount > column.maxWipLimit && (
                <div className="mb-2 p-2 bg-red-100 text-red-700 rounded-md text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>Exceeds maximum WIP limit ({column.maxWipLimit} cards maximum)</span>
                </div>
              )}

              <div className="py-1 px-0.5">
                <CardList
                  cards={columnCards}
                  className="mt-1"
                  onCardClick={onCardClick}
                  columnId={column.id}
                  onDuplicate={onDuplicateCard}
                  onArchive={onArchiveCard}
                  onDelete={onDeleteCard}
                />
              </div>

              {/* Add Card Button */}
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-sm border-dashed border-slate-300 hover:border-slate-400"
                  onClick={() => setShowCardModal(true)}
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Card
                </Button>
              </div>
            </>
          )}

          {/* Only show Add Sub-Column button for top-level columns */}
          {isTopLevel && (
            <button
              onClick={handleAddSubColumn}
              className="mt-2 w-full p-2 border border-dashed border-slate-300 rounded-md
                text-slate-500 text-sm flex items-center justify-center gap-1
                hover:bg-slate-50 hover:border-slate-400 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add Sub-Column
            </button>
          )}
        </div>
      )}

      {/* Card Creation Modal */}
      <CardModal
        isOpen={showCardModal}
        onClose={() => setShowCardModal(false)}
        columnId={column.id}
        onSave={async (cardData) => {
          try {
            // Create a new object with column_id for Supabase
            const cardDataForDb = {
              ...cardData,
              column_id: column.id, // Use column_id instead of columnId for Supabase
              labels: cardData.labels || [], // Ensure labels are included
            };

            // Remove columnId to prevent conflicts
            if ('columnId' in cardDataForDb) {
              delete cardDataForDb.columnId;
            }

            await addCard(cardDataForDb);
          } catch (error) {
            console.error("Failed to add card:", error);
            throw error; // Rethrow to be handled by the card modal
          }
        }}
      />
    </div>
  );
}