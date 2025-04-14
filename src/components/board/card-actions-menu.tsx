import React from "react";
import { MoreHorizontal, Copy, Archive, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Card } from "./card";

interface CardActionsMenuProps {
  card: Card;
  onDuplicate?: (cardId: string) => Promise<void>;
  onArchive?: (cardId: string) => Promise<void>;
  onDelete?: (cardId: string) => Promise<void>;
  disabled?: boolean;
}

export function CardActionsMenu({
  card,
  onDuplicate,
  onArchive,
  onDelete,
  disabled = false,
}: CardActionsMenuProps) {
  const handleDuplicate = async (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!onDuplicate) return;

    try {
      await onDuplicate(card.id);
      toast.success("Card duplicated", {
        description: "A copy of the card has been created"
      });
    } catch (error) {
      toast.error("Failed to duplicate card", {
        description: "An error occurred while duplicating the card"
      });
    }
  };

  const handleArchive = async (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!onArchive) return;

    try {
      await onArchive(card.id);
      toast.success("Card archived", {
        description: "The card has been moved to the archive"
      });
    } catch (error) {
      toast.error("Failed to archive card", {
        description: "An error occurred while archiving the card"
      });
    }
  };

  const handleDelete = async (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!onDelete) return;

    try {
      await onDelete(card.id);
      toast.success("Card deleted", {
        description: "The card has been permanently deleted"
      });
    } catch (error) {
      toast.error("Failed to delete card", {
        description: "An error occurred while deleting the card"
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="focus:outline-none"
        onClick={(e) => e.stopPropagation()}
        disabled={disabled}
      >
        <div className="p-1 hover:bg-slate-100 rounded-full transition-colors">
          <MoreHorizontal className="h-4 w-4 text-slate-500" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Card Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDuplicate}
          disabled={!onDuplicate}
          className={!onDuplicate ? "opacity-50 cursor-not-allowed" : ""}
        >
          <Copy className="mr-2 h-4 w-4" />
          <span>Duplicate</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleArchive}
          disabled={!onArchive}
          className={!onArchive ? "opacity-50 cursor-not-allowed" : ""}
        >
          <Archive className="mr-2 h-4 w-4" />
          <span>Archive</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDelete}
          disabled={!onDelete}
          className={!onDelete ? "opacity-50 cursor-not-allowed" : "text-red-600 focus:text-red-600"}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}