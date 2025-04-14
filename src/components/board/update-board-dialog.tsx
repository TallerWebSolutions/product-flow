"use client";

import { useState } from "react";
import { Board } from "@/lib/db/schema";
import { updateBoard } from "@/app/actions/boards";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface UpdateBoardDialogProps {
  board: Board;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function UpdateBoardDialog({ board, open, onOpenChange, onComplete }: UpdateBoardDialogProps) {
  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Board name is required");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const updatedBoard = await updateBoard(board.id, {
        name,
        description: description.trim() ? description : null
      });

      if (updatedBoard) {
        toast.success("Board updated successfully");
        onComplete();
      } else {
        setError("Failed to update board");
      }
    } catch (error) {
      console.error("Error updating board:", error);
      setError("An error occurred while updating the board");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Board</DialogTitle>
          <DialogDescription>
            Update your board details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="board-name">Name</Label>
              <Input
                id="board-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Board"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="board-description">Description (optional)</Label>
              <Textarea
                id="board-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Board description..."
                rows={3}
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Board"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}