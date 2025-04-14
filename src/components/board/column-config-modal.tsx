"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Column } from "./board-layout";

type ColumnConfigModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (column: Partial<Column>) => void;
  column?: Column;
  parentColumns?: Column[];
  defaultParentId?: string | null;
};

export function ColumnConfigModal({
  isOpen,
  onClose,
  onSave,
  column,
  parentColumns = [],
  defaultParentId = null
}: ColumnConfigModalProps) {
  const [name, setName] = useState("");
  const [minWipLimit, setMinWipLimit] = useState<number | undefined>(undefined);
  const [maxWipLimit, setMaxWipLimit] = useState<number | undefined>(undefined);
  const [parentId, setParentId] = useState<string | null | undefined>(undefined);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Set initial values when column is provided (edit mode) or when defaultParentId is provided
  useEffect(() => {
    if (column) {
      // Edit mode
      setName(column.name);
      setMinWipLimit(column.minWipLimit);
      setMaxWipLimit(column.maxWipLimit);
      setParentId(column.parentId);
    } else {
      // Add mode
      setName("");
      setMinWipLimit(undefined);
      setMaxWipLimit(undefined);

      // Use defaultParentId if provided, otherwise undefined
      setParentId(defaultParentId !== null ? defaultParentId : undefined);
    }
  }, [column, defaultParentId, isOpen]);

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = "Column name is required";
    }

    if (minWipLimit !== undefined && minWipLimit < 0) {
      newErrors.minWipLimit = "Minimum WIP limit must be non-negative";
    }

    if (maxWipLimit !== undefined && maxWipLimit <= 0) {
      newErrors.maxWipLimit = "Maximum WIP limit must be greater than 0";
    }

    if (minWipLimit !== undefined && maxWipLimit !== undefined && minWipLimit > maxWipLimit) {
      newErrors.minWipLimit = "Minimum WIP limit must not exceed maximum";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validate()) {
      onSave({
        ...(column ? { id: column.id } : {}),
        name,
        minWipLimit: minWipLimit || undefined,
        maxWipLimit: maxWipLimit || undefined,
        parentId: parentId || null
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center border-b p-4">
          <h2 className="text-lg font-medium">
            {column ? "Edit Column" : "Add New Column"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Column Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter column name"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            {/* Only show WIP limits for top-level columns */}
            {(!parentId || parentId === null) && (
              <>
                <div>
                  <label htmlFor="minWipLimit" className="block text-sm font-medium mb-1">
                    Minimum WIP Limit
                  </label>
                  <input
                    type="number"
                    id="minWipLimit"
                    value={minWipLimit === undefined ? "" : minWipLimit}
                    onChange={(e) => setMinWipLimit(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Optional minimum WIP limit"
                    min="0"
                  />
                  {errors.minWipLimit && (
                    <p className="text-red-500 text-sm mt-1">{errors.minWipLimit}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="maxWipLimit" className="block text-sm font-medium mb-1">
                    Maximum WIP Limit
                  </label>
                  <input
                    type="number"
                    id="maxWipLimit"
                    value={maxWipLimit === undefined ? "" : maxWipLimit}
                    onChange={(e) => setMaxWipLimit(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Optional maximum WIP limit"
                    min="1"
                  />
                  {errors.maxWipLimit && (
                    <p className="text-red-500 text-sm mt-1">{errors.maxWipLimit}</p>
                  )}
                </div>
              </>
            )}

            {parentColumns.length > 0 && (
              <div>
                <label htmlFor="parentId" className="block text-sm font-medium mb-1">
                  Parent Column
                </label>
                <select
                  id="parentId"
                  value={parentId || ""}
                  onChange={(e) => setParentId(e.target.value || null)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">None (Top Level)</option>
                  {parentColumns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {column ? "Update Column" : "Add Column"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}