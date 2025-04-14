"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "./card";
import { X, Plus, BookIcon, BookmarkIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CardTemplateSelect, SaveAsTemplate, ManageTemplates } from "./card-templates";
import { toast } from "sonner";

type CardModalProps = {
  isOpen: boolean;
  onClose: () => void;
  card?: Card;
  columnId: string;
  onSave: (card: Partial<Card>) => void;
};

export function CardModal({
  isOpen,
  onClose,
  card,
  columnId,
  onSave
}: CardModalProps) {
  const isEditing = !!card;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cardType, setCardType] = useState<Card["cardType"]>(undefined);
  const [priority, setPriority] = useState<Card["priority"]>(undefined);
  const [dueDate, setDueDate] = useState("");
  const [epic, setEpic] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [users, setUsers] = useState<Array<{ id: string; name: string; avatarUrl?: string }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showTemplateOptions, setShowTemplateOptions] = useState(false);

  // Load users for assignee selection
  useEffect(() => {
    const fetchUsers = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        setUsers([
          {
            id: data.user.id,
            name: data.user.email || 'Current User',
            avatarUrl: data.user.user_metadata?.avatar_url,
          }
        ]);
      }
    };

    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  // Set form values when editing an existing card
  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description || "");
      setCardType(card.cardType);
      setPriority(card.priority);
      setDueDate(card.dueDate || "");
      setEpic(card.metadata?.epic || "");
      setAssigneeId(card.assigneeId || "");
      setIsBlocked(card.blocked || false);
      setBlockReason(card.blockReason || "");
      setLabels(card.labels || []);
    } else {
      // Reset form for new card
      setTitle("");
      setDescription("");
      setCardType(undefined);
      setPriority(undefined);
      setDueDate("");
      setEpic("");
      setAssigneeId("");
      setIsBlocked(false);
      setBlockReason("");
      setLabels([]);
    }
    setErrors({});
    setShowTemplateOptions(false);
  }, [card, isOpen]);

  const addLabel = () => {
    if (!newLabel.trim()) return;

    // Don't add duplicate labels
    if (!labels.includes(newLabel.trim())) {
      setLabels([...labels, newLabel.trim()]);
    }
    setNewLabel("");
  };

  const removeLabel = (labelToRemove: string) => {
    setLabels(labels.filter(label => label !== labelToRemove));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    }

    if (isBlocked && !blockReason.trim()) {
      newErrors.blockReason = "Please provide a reason why the card is blocked";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      const metadata = {
        ...(card?.metadata || {}),
        epic: epic || undefined,
      };

      const cardData: Partial<Card> = {
        title,
        description: description || undefined,
        cardType,
        priority,
        dueDate: dueDate || undefined,
        assigneeId: assigneeId || undefined,
        blocked: isBlocked,
        blockReason: isBlocked ? blockReason : undefined,
        labels,
        metadata,
        ...(card ? { id: card.id } : { column_id: columnId }), // Use column_id for Supabase
      };

      await onSave(cardData);
      onClose();
    } catch (error) {
      console.error("Failed to save card:", error);
      setErrors({
        submit: typeof error === 'string' ? error :
          error instanceof Error ? error.message : 'Error creating card. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTemplateSelect = (template: Partial<Card>) => {
    // Apply template values to the form
    if (template.title) setTitle(template.title);
    if (template.description) setDescription(template.description);
    if (template.cardType) setCardType(template.cardType);
    if (template.priority) setPriority(template.priority);
    if (template.dueDate) setDueDate(template.dueDate);
    if (template.labels) setLabels(template.labels);
    if (template.metadata?.epic) setEpic(template.metadata.epic);

    // Set blocked status
    setIsBlocked(template.blocked || false);
    if (template.blockReason) setBlockReason(template.blockReason);

    // Show success message
    toast.success("Template applied", {
      description: "Card template has been applied successfully."
    });

    // Hide template options after applying
    setShowTemplateOptions(false);
  };

  // Create a partial card object for the template
  const getCurrentCardData = (): Partial<Card> => ({
    title,
    description,
    cardType,
    priority,
    dueDate,
    labels,
    blocked: isBlocked,
    blockReason,
    metadata: {
      epic
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle>{isEditing ? "Edit Card" : "Create New Card"}</DialogTitle>
              <div className="flex gap-2">
                {isEditing && (
                  <SaveAsTemplate
                    card={getCurrentCardData()}
                    onSaved={() => toast.success("Template saved", {
                      description: "Card template has been saved successfully."
                    })}
                  />
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplateOptions(!showTemplateOptions)}
                >
                  <BookmarkIcon className="h-4 w-4 mr-2" />
                  Templates
                </Button>
              </div>
            </div>
            <DialogDescription>
              {isEditing
                ? "Update the details of this card."
                : "Add a new card to this column."}
            </DialogDescription>
          </DialogHeader>

          {showTemplateOptions && (
            <div className="mt-4 mb-6 p-4 border rounded-md bg-slate-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Card Templates</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTemplateOptions(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="template" className="mb-1 block">
                    Apply Template
                  </Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <CardTemplateSelect onSelectTemplate={handleTemplateSelect} />
                    </div>
                    <ManageTemplates onTemplateDeleted={() => {
                      toast.success("Template deleted", {
                        description: "Card template has been deleted successfully."
                      })
                    }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {errors.submit && (
            <div className="mt-2 p-2 bg-red-50 border border-red-300 text-red-700 rounded-md text-sm">
              {errors.submit}
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <div className="col-span-3">
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={errors.title ? "border-red-500" : ""}
                  required
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
              </div>
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                className="col-span-3"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cardType" className="text-right">
                Card Type
              </Label>
              <select
                id="cardType"
                value={cardType || ""}
                onChange={(e) => setCardType(e.target.value as Card["cardType"] || undefined)}
                className="col-span-3 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select type</option>
                <option value="feature">Feature</option>
                <option value="bug">Bug</option>
                <option value="chore">Chore</option>
              </select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="priority" className="text-right">
                Priority
              </Label>
              <select
                id="priority"
                value={priority || ""}
                onChange={(e) => setPriority(e.target.value as Card["priority"] || undefined)}
                className="col-span-3 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-right">
                Due Date
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="epic" className="text-right">
                Epic
              </Label>
              <Input
                id="epic"
                value={epic}
                onChange={(e) => setEpic(e.target.value)}
                className="col-span-3"
                placeholder="e.g. User Authentication"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isBlocked" className="text-right">
                Blocked
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isBlocked"
                  checked={isBlocked}
                  onChange={(e) => setIsBlocked(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm">This card is blocked</span>
              </div>
            </div>

            {isBlocked && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="blockReason" className="text-right pt-2">
                  Block Reason
                </Label>
                <div className="col-span-3">
                  <Textarea
                    id="blockReason"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Why is this card blocked?"
                    className={errors.blockReason ? "border-red-500" : ""}
                    rows={2}
                  />
                  {errors.blockReason && (
                    <p className="text-red-500 text-xs mt-1">{errors.blockReason}</p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="labels" className="text-right pt-2">
                Labels
              </Label>
              <div className="col-span-3">
                <div className="flex gap-2 mb-2">
                  <Input
                    id="newLabel"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Add a label"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addLabel();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLabel}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  {labels.length === 0 ? (
                    <span className="text-sm text-gray-500">No labels added</span>
                  ) : (
                    labels.map((label) => (
                      <Badge key={label} className="px-2 py-1 flex items-center gap-1">
                        {label}
                        <button
                          type="button"
                          onClick={() => removeLabel(label)}
                          className="text-xs rounded-full hover:bg-primary-foreground p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assignee" className="text-right">
                Assignee
              </Label>
              <select
                id="assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="col-span-3 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : isEditing ? "Update Card" : "Create Card"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}