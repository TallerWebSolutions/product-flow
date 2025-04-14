import React from "react";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ColumnActionsProps = {
  columnId: string;
  onEdit?: (columnId: string) => void;
  onDelete?: (columnId: string) => void;
  disabled?: boolean;
};

export function ColumnActions({
  columnId,
  onEdit,
  onDelete,
  disabled = false
}: ColumnActionsProps) {
  const handleEdit = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(columnId);
    }
  };

  const handleDelete = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(columnId);
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
        <DropdownMenuLabel>Column Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleEdit}
          disabled={!onEdit}
          className={!onEdit ? "opacity-50 cursor-not-allowed" : ""}
        >
          <Edit className="mr-2 h-4 w-4" />
          <span>Edit Column</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDelete}
          disabled={!onDelete}
          className={!onDelete ? "opacity-50 cursor-not-allowed" : "text-red-600 focus:text-red-600"}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete Column</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}