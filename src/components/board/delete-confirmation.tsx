import React from "react";
import { AlertTriangle, X } from "lucide-react";

type DeleteConfirmationProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
};

export function DeleteConfirmation({
  isOpen,
  onClose,
  onConfirm,
  title,
  message
}: DeleteConfirmationProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center border-b p-4">
          <h2 className="text-lg font-medium text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-gray-700 mb-6">{message}</p>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md text-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
