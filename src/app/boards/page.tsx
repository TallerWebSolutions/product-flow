"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getUserBoards } from "@/app/actions/boards";
import { Board } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { BoardList } from "@/components/board/boards-list";
import { CreateBoardButton } from "@/components/board/create-board-button";

export default function BoardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBoards() {
      try {
        setIsLoading(true);
        const data = await getUserBoards();
        setBoards(data);
      } catch (err) {
        console.error("Error loading boards:", err);
        setError("Failed to load boards. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchBoards();
  }, []);

  return (
    <div className="container py-8 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Boards</h1>
        <CreateBoardButton />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {isLoading ? (
          <div className="text-center py-10">Loading boards...</div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">{error}</div>
        ) : (
          <BoardList boards={boards} />
        )}
      </div>
    </div>
  );
}