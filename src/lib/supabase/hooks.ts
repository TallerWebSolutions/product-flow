import { useEffect, useState, useCallback } from 'react';
import { createClient } from './client';

export function useRealtimeColumns(boardId: string) {
  const [status, setStatus] = useState<'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'>('DISCONNECTED');
  const [error, setError] = useState<string | null>(null);

  const subscribeToColumns = useCallback(() => {
    const supabase = createClient();

    // Create a channel for realtime columns updates
    const channelName = `board-columns-${boardId}`;
    const channel = supabase.channel(channelName);

    // Subscribe to changes on the columns table for this board
    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'columns',
        filter: 'board_id=eq.' + boardId,
      }, (payload) => {
        console.log('Column change received:', payload);
        // The board context will handle the update
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Connected to realtime updates for columns');
          setStatus('CONNECTED');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error connecting to realtime channel');
          setStatus('ERROR');
          setError('Failed to connect to realtime updates');
        } else {
          console.log('Realtime subscription status:', status);
        }
      });

    return () => {
      console.log('Unsubscribing from realtime updates');
      supabase.removeChannel(channel);
      setStatus('DISCONNECTED');
    };
  }, [boardId]);

  useEffect(() => {
    if (!boardId) return;

    setStatus('CONNECTING');
    const unsubscribe = subscribeToColumns();

    return () => {
      unsubscribe();
    };
  }, [boardId, subscribeToColumns]);

  return { status, error };
}