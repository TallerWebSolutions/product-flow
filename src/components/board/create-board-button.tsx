"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { createBoard } from "@/app/actions/boards";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CreateBoardButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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
      const newBoard = await createBoard(
        name,
        description.trim() ? description : undefined
      );

      if (newBoard) {
        toast.success("Board created successfully");
        setIsOpen(false);

        // Navigate to the new board with its ID in the URL
        router.push(`/board?id=${newBoard.id}`);

        // Reset form
        setName("");
        setDescription("");
      } else {
        setError("Failed to create board");
      }
    } catch (error) {
      console.error("Error creating board:", error);
      setError("An error occurred while creating the board");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset form when dialog is closed
      setName("");
      setDescription("");
      setError("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Board
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Board</DialogTitle>
          <DialogDescription>
            Create a new board to organize your tasks.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-board-name">Name</Label>
              <Input
                id="new-board-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Board"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-board-description">Description (optional)</Label>
              <Textarea
                id="new-board-description"
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
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Board"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}