"use client";

import { useState } from "react";
import Link from "next/link";
import { Edit, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Board } from "@/lib/db/schema";
import { boardOperations } from "@/lib/db/operations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { UpdateBoardDialog } from "@/components/board/update-board-dialog";
import { deleteBoard } from "@/app/actions/boards";

interface BoardListProps {
  boards: Board[];
}

export function BoardList({ boards }: BoardListProps) {
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);

  const handleDelete = async (boardId: string) => {
    try {
      const success = await deleteBoard(boardId);
      if (success) {
        toast.success("Board deleted successfully");
        router.refresh();
      } else {
        toast.error("Failed to delete board");
      }
    } catch (error) {
      console.error("Error deleting board:", error);
      toast.error("An error occurred while deleting the board");
    }
  };

  const handleEditClick = (board: Board) => {
    setCurrentBoard(board);
    setIsEditDialogOpen(true);
  };

  const handleEditComplete = () => {
    setIsEditDialogOpen(false);
    setCurrentBoard(null);
    router.refresh();
  };

  if (boards.length === 0) {
    return (
      <div className="text-center py-10">
        <h3 className="text-lg font-medium mb-2">No boards found</h3>
        <p className="text-muted-foreground mb-4">Create your first board to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {boards.map((board) => (
        <Card key={board.id} className="flex flex-col">
          <Link
            href={`/board?id=${board.id}`}
            className="flex-1 p-5 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h3 className="font-medium text-lg">{board.name}</h3>
                {board.description && (
                  <p className="text-muted-foreground text-sm line-clamp-2">
                    {board.description}
                  </p>
                )}
              </div>
            </div>
          </Link>

          {/* Bottom card actions */}
          <div className="flex justify-end p-3 border-t">
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleEditClick(board)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete board</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{board.name}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(board.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}