"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { BoardLayout, Column as ColumnType } from "@/components/board/board-layout";
import { BoardProvider, useBoard } from "@/contexts/board-context";
import { ColumnConfigModal } from "@/components/board/column-config-modal";
import { DeleteConfirmation } from "@/components/board/delete-confirmation";
import { RealtimeStatus } from "@/components/board/realtime-status";
import { Toaster } from "sonner";
import { Card } from "@/components/board/card";
import { CreateTemplateButton } from "@/components/board/card-templates";
import { CardModal } from "@/components/board/card-modal";
import { useSearchParams } from "next/navigation";
import React from "react";

function BoardContent() {
  const {
    columns,
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
    reorderCards,
    moveCardToColumn,
    findColumnById,
    updateCard,
    deleteCard,
    addCard
  } = useBoard();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<ColumnType | undefined>(undefined);
  const [parentColumnId, setParentColumnId] = useState<string | null>(null);

  // Add state for card editing
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | undefined>(undefined);

  // Add state for deletion confirmation
  const [isDeleteCardModalOpen, setIsDeleteCardModalOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);

  const handleAddColumn = () => {
    setSelectedColumn(undefined);
    setParentColumnId(null);
    setIsAddModalOpen(true);
  };

  const handleAddSubColumn = (parentId: string) => {
    setSelectedColumn(undefined);
    setParentColumnId(parentId);
    setIsAddModalOpen(true);
  };

  const handleEditColumn = (columnId: string) => {
    const column = columns.find(c => c.id === columnId);
    if (column) {
      setSelectedColumn(column);
      setIsEditModalOpen(true);
    }
  };

  const handleDeleteColumn = (columnId: string) => {
    console.log(`[page.tsx] handleDeleteColumn called with ID: ${columnId}`);
    const column = findColumnById(columnId);
    if (column) {
      console.log(`[page.tsx] Found column to delete: ${column.name} (${column.id}), is subcolumn: ${!!column.parentId}`);
      setSelectedColumn(column);
      setIsDeleteModalOpen(true);
    } else {
      console.error(`[page.tsx] Column with ID ${columnId} not found`);
    }
  };

  const handleSaveColumn = (columnData: Partial<ColumnType>) => {
    if (columnData.id) {
      // Update existing column
      updateColumn(columnData as Partial<ColumnType> & { id: string });
    } else {
      // Add new column with parent ID if applicable
      addColumn({
        ...columnData as Omit<ColumnType, "id" | "order">,
        parentId: parentColumnId
      });
    }

    // Reset parent column ID
    setParentColumnId(null);
  };

  const handleConfirmDelete = () => {
    if (selectedColumn) {
      console.log(`[page.tsx] Confirming delete for column: ${selectedColumn.name} (${selectedColumn.id})`);
      deleteColumn(selectedColumn.id);
      setIsDeleteModalOpen(false);
    } else {
      console.error(`[page.tsx] No column selected for deletion`);
    }
  };

  const handleReorderColumns = (reorderedColumns: ColumnType[]) => {
    reorderColumns(reorderedColumns);
  };

  const handleReorderSubColumns = (subColumns: ColumnType[], parentId: string) => {
    console.log(`[page.tsx] handleReorderSubColumns called with ${subColumns.length} subcolumns for parent ${parentId}`);
    console.log(`[page.tsx] subcolumns to be reordered:`, subColumns.map(c => ({ id: c.id, name: c.name, order: c.order })));

    // First, find the parent column
    const parentColumn = columns.find(c => c.id === parentId);
    if (!parentColumn) {
      console.error(`[page.tsx] Parent column ${parentId} not found`);
      return;
    }

    console.log(`[page.tsx] Found parent column: ${parentColumn.name}`);

    // Update the parent column's subColumns in local state
    const updatedParentColumn: ColumnType = {
      ...parentColumn,
      subColumns
    };

    // Update the parent column in local state
    console.log(`[page.tsx] Updating parent column in local state`);
    updateColumn(updatedParentColumn);

    // Call the reorderSubColumns function from the context to persist the changes
    console.log(`[page.tsx] Calling reorderSubColumns to persist changes to database`);
    reorderSubColumns(subColumns, parentId);

    console.log(`[page.tsx] Reordering complete`);
  };

  const handleCardClick = (cardId: string) => {
    console.log('Card clicked:', cardId);
    // Find the selected card in the cards array
    const card = cards.find(c => c.id === cardId);
    if (card) {
      setSelectedCard(card);
      setIsCardModalOpen(true);
    }
  };

  const handleReorderCards = (updatedCards: Card[]) => {
    reorderCards(updatedCards);
  };

  const handleMoveCardToColumn = (cardId: string, targetColumnId: string) => {
    // Call moveCardToColumn with the proper source column ID
    const card = cards.find(c => c.id === cardId);
    if (card) {
      moveCardToColumn(cardId, card.columnId, targetColumnId);
    }
  };

  const handleUpdateCard = async (cardData: Partial<Card>) => {
    if (selectedCard) {
      try {
        // Combine the selected card ID with the updated data
        const updatedCardData = {
          ...cardData,
          id: selectedCard.id
        };
        await updateCard(updatedCardData);
      } catch (error) {
        console.error("Failed to update card:", error);
      }
    }
  };

  const handleDuplicateCard = async (cardId: string): Promise<void> => {
    try {
      // Find the card to duplicate
      const card = cards.find(c => c.id === cardId);
      if (!card) {
        throw new Error(`Card with ID ${cardId} not found`);
      }

      // Prepare a clean copy of the card for the API
      const duplicatedCard = {
        title: `${card.title} (Copy)`,
        description: card.description,
        column_id: card.columnId,
        cardType: card.cardType,
        priority: card.priority,
        dueDate: card.dueDate,
        labels: [...(card.labels || [])],
        assignee_id: card.assigneeId,
        blocked: card.blocked,
        blockReason: card.blockReason,
        metadata: {
          ...(card.metadata || {}),
          // Garantir que não estamos copiando o status de arquivamento
          archived: undefined,
          archivedAt: undefined,
          epic: card.metadata?.epic
        }
      };

      console.log("Duplicating card with data:", duplicatedCard);

      // Add the duplicated card
      await addCard(duplicatedCard);
    } catch (error) {
      console.error("Failed to duplicate card:", error);
      throw error;
    }
  };

  const handleArchiveCard = async (cardId: string): Promise<void> => {
    try {
      // Find the card to archive
      const card = cards.find(c => c.id === cardId);
      if (!card) {
        throw new Error(`Card with ID ${cardId} not found`);
      }

      // In a real app, we might move it to an archive column
      // For now, we'll just update its metadata to mark it as archived
      const updatedCard = {
        ...card,
        metadata: {
          ...(card.metadata || {}),
          archived: true,
          archivedAt: new Date().toISOString()
        }
      };

      // Certifique-se de manter outros campos importantes
      // como cardType, priority, labels, etc. ao arquivar
      const {
        metadata,
        cardType,
        priority,
        blocked,
        blockReason,
        dueDate,
        ...basicCardData
      } = updatedCard;

      // Envie apenas as informações mínimas necessárias para atualizar
      await updateCard({
        id: cardId,
        metadata
      });
    } catch (error) {
      console.error("Failed to archive card:", error);
      throw error;
    }
  };

  const handleDeleteCard = async (cardId: string): Promise<void> => {
    // Show confirmation modal first
    setCardToDelete(cardId);
    setIsDeleteCardModalOpen(true);

    // The actual deletion happens in confirmDeleteCard when user confirms
    return new Promise((resolve, reject) => {
      // This promise resolves when the deletion is confirmed
      // The card-actions-menu component will show a loading state until then
      window._cardDeletionCallbacks = window._cardDeletionCallbacks || {};
      window._cardDeletionCallbacks[cardId] = { resolve, reject };
    });
  };

  const confirmDeleteCard = async () => {
    if (!cardToDelete) return;

    try {
      await deleteCard(cardToDelete);

      // Resolve the promise to indicate success to the card-actions-menu
      if (window._cardDeletionCallbacks?.[cardToDelete]) {
        window._cardDeletionCallbacks[cardToDelete].resolve();
        delete window._cardDeletionCallbacks[cardToDelete];
      }
    } catch (error) {
      console.error("Failed to delete card:", error);

      // Reject the promise to indicate failure to the card-actions-menu
      if (window._cardDeletionCallbacks?.[cardToDelete]) {
        window._cardDeletionCallbacks[cardToDelete].reject(error);
        delete window._cardDeletionCallbacks[cardToDelete];
      }
    } finally {
      setIsDeleteCardModalOpen(false);
      setCardToDelete(null);
    }
  };

  const cancelDeleteCard = () => {
    // Reject the promise to indicate cancellation to the card-actions-menu
    if (cardToDelete && window._cardDeletionCallbacks?.[cardToDelete]) {
      window._cardDeletionCallbacks[cardToDelete].reject(new Error("Delete operation cancelled"));
      delete window._cardDeletionCallbacks[cardToDelete];
    }

    setIsDeleteCardModalOpen(false);
    setCardToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-lg">Loading board...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-500">
          <div className="text-lg">Error: {error}</div>
        </div>
      </div>
    );
  }

  if (guidance) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Project Board</h1>
          <div className="flex items-center gap-3">
            <RealtimeStatus />
            <CreateTemplateButton />
            <button
              onClick={handleAddColumn}
              className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Column
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center border rounded-lg bg-white">
          <div className="text-center p-8 max-w-lg">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Get started with columns</h3>
            <p className="mt-2 text-sm text-gray-500">{guidance}</p>
            <div className="mt-6">
              <button
                onClick={handleAddColumn}
                className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Your First Column
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Project Board</h1>
        <div className="flex items-center gap-3">
          <RealtimeStatus />
          <CreateTemplateButton />
          <button
            onClick={handleAddColumn}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Column
          </button>
        </div>
      </div>

      <div className="h-[calc(100%-4rem)] border rounded-lg bg-white">
        <BoardLayout
          columns={columns}
          cards={cards.filter(card => !card.metadata?.archived)}
          onEditColumn={handleEditColumn}
          onDeleteColumn={handleDeleteColumn}
          onAddSubColumn={handleAddSubColumn}
          onReorderColumns={handleReorderColumns}
          onReorderSubColumns={handleReorderSubColumns}
          onCardClick={handleCardClick}
          onReorderCards={handleReorderCards}
          onMoveCardToColumn={handleMoveCardToColumn}
          onDuplicateCard={handleDuplicateCard}
          onArchiveCard={handleArchiveCard}
          onDeleteCard={handleDeleteCard}
        />
      </div>

      {/* Add Column Modal */}
      <ColumnConfigModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveColumn}
        parentColumns={getTopLevelColumns()}
        defaultParentId={parentColumnId}
      />

      {/* Edit Column Modal */}
      <ColumnConfigModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveColumn}
        column={selectedColumn}
        parentColumns={getTopLevelColumns().filter(c => c.id !== selectedColumn?.id)}
      />

      {/* Delete Column Confirmation Modal */}
      <DeleteConfirmation
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Column"
        message={`Are you sure you want to delete "${selectedColumn?.name}"? This will also remove all sub-columns and cannot be undone.`}
      />

      {/* Card Edit Modal */}
      <CardModal
        isOpen={isCardModalOpen}
        onClose={() => {
          setIsCardModalOpen(false);
          setSelectedCard(undefined);
        }}
        card={selectedCard}
        columnId={selectedCard?.columnId || ""}
        onSave={handleUpdateCard}
      />

      {/* Delete Card Confirmation Modal */}
      <DeleteConfirmation
        isOpen={isDeleteCardModalOpen}
        onClose={cancelDeleteCard}
        onConfirm={confirmDeleteCard}
        title="Delete Card"
        message="Are you sure you want to delete this card? This action cannot be undone."
      />
    </>
  );
}

// Declare the global type
declare global {
  interface Window {
    _cardDeletionCallbacks?: Record<string, {
      resolve: () => void;
      reject: (error?: any) => void;
    }>;
  }
}

// Default UUID to use if no board ID is provided
const DEFAULT_BOARD_ID = "d3d5e773-107f-4bd6-8249-345d0b3b737a";

export default function BoardPage() {
  const searchParams = useSearchParams();
  const boardId = searchParams.get("id") || DEFAULT_BOARD_ID;

  return (
    <BoardProvider boardId={boardId}>
      <div className="container mx-auto p-4 h-[calc(100vh-4rem)]">
        <BoardContent />
        <Toaster />
      </div>
    </BoardProvider>
  );
}