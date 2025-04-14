"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Status, Transition, StatusColumn } from "@/types/status";
import { getStatuses, getStatusColumns, getStatusColumnsForBoard, createStatus, mapStatusToColumn, updateCardStatus } from "@/db/helpers/status";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type StatusContextType = {
  statuses: Status[];
  statusColumns: StatusColumn[];
  isLoading: boolean;
  error: string | null;
  getStatusesByColumn: (columnId: string) => Status[];
  getColumnsByStatus: (statusId: string) => string[];
  addStatus: (status: Omit<Status, "id" | "createdAt" | "updatedAt">) => Promise<Status>;
  updateStatus: (status: Partial<Status> & { id: string }) => Promise<Status>;
  deleteStatus: (statusId: string) => Promise<void>;
  mapStatusToColumn: (statusId: string, columnId: string) => Promise<StatusColumn>;
  unmapStatusFromColumn: (statusId: string, columnId: string) => Promise<void>;
  moveCardToStatus: (cardId: string, statusId: string) => Promise<void>;
};

const StatusContext = createContext<StatusContextType | undefined>(undefined);

export function StatusProvider({
  children,
  boardId
}: {
  children: React.ReactNode;
  boardId: string;
}) {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [statusColumns, setStatusColumns] = useState<StatusColumn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch statuses and their column mappings
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch statuses
      const fetchedStatuses = await getStatuses();
      setStatuses(fetchedStatuses);

      // Fetch status-column mappings for this board
      const fetchedStatusColumns = await getStatusColumnsForBoard(boardId);
      setStatusColumns(fetchedStatusColumns);

      setError(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch status data";
      console.error('Status fetch error:', error);
      setError(errorMessage);

      toast.error("Failed to load status data", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [boardId]);

  // Initialize the status provider
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up realtime handlers for status changes
  useEffect(() => {
    const supabase = createClient();

    // Subscribe to changes in statuses
    const statusChannel = supabase.channel('status-changes');
    statusChannel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'statuses'
      }, async () => {
        // Refetch all statuses when any change happens
        const updatedStatuses = await getStatuses();
        setStatuses(updatedStatuses);
      })
      .subscribe();

    // Subscribe to changes in status_columns
    const statusColumnChannel = supabase.channel('status-column-changes');
    statusColumnChannel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'status_columns'
      }, async () => {
        // Refetch status columns for this board
        const updatedStatusColumns = await getStatusColumnsForBoard(boardId);
        setStatusColumns(updatedStatusColumns);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(statusColumnChannel);
    };
  }, [boardId]);

  // Get statuses for a specific column
  const getStatusesByColumn = useCallback((columnId: string) => {
    // Find all status IDs mapped to this column
    const statusIds = statusColumns
      .filter(sc => sc.columnId === columnId)
      .map(sc => sc.statusId);

    // Return all statuses matching these IDs
    return statuses.filter(status => statusIds.includes(status.id));
  }, [statuses, statusColumns]);

  // Get columns for a specific status
  const getColumnsByStatus = useCallback((statusId: string) => {
    // Find all column IDs mapped to this status
    return statusColumns
      .filter(sc => sc.statusId === statusId)
      .map(sc => sc.columnId);
  }, [statusColumns]);

  // Add a new status
  const addStatus = async (status: Omit<Status, "id" | "createdAt" | "updatedAt">): Promise<Status> => {
    try {
      const newStatus = await createStatus(status);
      setStatuses(prevStatuses => [...prevStatuses, newStatus]);
      return newStatus;
    } catch (error) {
      console.error("Error adding status:", error);
      throw error;
    }
  };

  // Update a status
  const updateStatus = async (statusData: Partial<Status> & { id: string }): Promise<Status> => {
    try {
      const supabase = createClient();
      const { id, ...updatableFields } = statusData;

      // Format the status data for Supabase
      const dbStatusData = {
        ...(updatableFields.name !== undefined && { name: updatableFields.name }),
        ...(updatableFields.color !== undefined && { color: updatableFields.color }),
        ...(updatableFields.order !== undefined && { order: updatableFields.order }),
        ...(updatableFields.transitionId !== undefined && { transition_id: updatableFields.transitionId })
      };

      const { data, error } = await supabase
        .from('statuses')
        .update(dbStatusData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedStatus: Status = {
        id: data.id,
        name: data.name,
        color: data.color,
        order: data.order,
        transitionId: data.transition_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      // Update local state
      setStatuses(prevStatuses =>
        prevStatuses.map(status => status.id === id ? updatedStatus : status)
      );

      return updatedStatus;
    } catch (error) {
      console.error("Error updating status:", error);
      throw error;
    }
  };

  // Delete a status
  const deleteStatus = async (statusId: string): Promise<void> => {
    try {
      const supabase = createClient();

      // Check if the status is being used by any cards
      const { count, error: countError } = await supabase
        .from('cards')
        .select('id', { count: 'exact', head: true })
        .eq('status_id', statusId);

      if (countError) throw countError;

      if (count && count > 0) {
        throw new Error(`Cannot delete status because it is used by ${count} cards`);
      }

      // Delete the status
      const { error } = await supabase
        .from('statuses')
        .delete()
        .eq('id', statusId);

      if (error) throw error;

      // Update local state
      setStatuses(prevStatuses => prevStatuses.filter(status => status.id !== statusId));
      setStatusColumns(prevStatusColumns => 
        prevStatusColumns.filter(sc => sc.statusId !== statusId)
      );

    } catch (error) {
      console.error("Error deleting status:", error);
      throw error;
    }
  };

  // Map a status to a column
  const mapStatusToCol = async (statusId: string, columnId: string): Promise<StatusColumn> => {
    try {
      const mapping = await mapStatusToColumn(statusId, columnId);
      setStatusColumns(prevMappings => [...prevMappings, mapping]);
      return mapping;
    } catch (error) {
      console.error("Error mapping status to column:", error);
      throw error;
    }
  };

  // Unmap a status from a column
  const unmapStatusFromColumn = async (statusId: string, columnId: string): Promise<void> => {
    try {
      const supabase = createClient();

      // Find the mapping ID
      const mapping = statusColumns.find(
        sc => sc.statusId === statusId && sc.columnId === columnId
      );

      if (!mapping) {
        throw new Error("Status-column mapping not found");
      }

      // Delete the mapping
      const { error } = await supabase
        .from('status_columns')
        .delete()
        .eq('id', mapping.id);

      if (error) throw error;

      // Update local state
      setStatusColumns(prevMappings => 
        prevMappings.filter(sc => !(sc.statusId === statusId && sc.columnId === columnId))
      );

    } catch (error) {
      console.error("Error unmapping status from column:", error);
      throw error;
    }
  };

  // Move a card to a different status
  const moveCardToStatus = async (cardId: string, statusId: string): Promise<void> => {
    try {
      await updateCardStatus(cardId, statusId);
      // Note: We don't need to update any state here as card state is managed by the board context
      // The board context would listen for card changes in the database
    } catch (error) {
      console.error("Error moving card to status:", error);
      throw error;
    }
  };

  return (
    <StatusContext.Provider
      value={{
        statuses,
        statusColumns,
        isLoading,
        error,
        getStatusesByColumn,
        getColumnsByStatus,
        addStatus,
        updateStatus,
        deleteStatus,
        mapStatusToColumn: mapStatusToCol,
        unmapStatusFromColumn,
        moveCardToStatus
      }}
    >
      {children}
    </StatusContext.Provider>
  );
}

export function useStatus() {
  const context = useContext(StatusContext);
  if (context === undefined) {
    throw new Error('useStatus must be used within a StatusProvider');
  }
  return context;
} 