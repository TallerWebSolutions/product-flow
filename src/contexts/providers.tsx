"use client";

import React from 'react';
import { BoardProvider } from './board-context';
import { StatusProvider } from './status-context';

interface ProvidersProps {
  children: React.ReactNode;
  boardId: string;
}

export function Providers({ children, boardId }: ProvidersProps) {
  return (
    <BoardProvider boardId={boardId}>
      <StatusProvider boardId={boardId}>
        {children}
      </StatusProvider>
    </BoardProvider>
  );
} 