import React, { useState, useEffect } from "react";
import { Card } from "@/types/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SaveIcon, TrashIcon, FileIcon, PlusIcon } from "lucide-react";
import { X } from "lucide-react";

interface CardTemplate {
  id: string;
  name: string;
  description: string;
  template: Partial<Card>;
  createdAt: string;
  updatedAt: string;
}

interface CardTemplateSelectProps {
  onSelectTemplate: (template: Partial<Card>) => void;
}

export function CardTemplateSelect({ onSelectTemplate }: CardTemplateSelectProps) {
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('card_templates')
          .select('*')
          .order('name');

        if (error) throw error;
        setTemplates(data || []);
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Loading templates..." />
        </SelectTrigger>
      </Select>
    );
  }

  if (templates.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="No templates available" />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select onValueChange={(value) => {
      const template = templates.find(t => t.id === value);
      if (template) {
        onSelectTemplate(template.template);
      }
    }}>
      <SelectTrigger>
        <SelectValue placeholder="Select a template" />
      </SelectTrigger>
      <SelectContent>
        {templates.map((template) => (
          <SelectItem key={template.id} value={template.id}>
            {template.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface SaveAsTemplateProps {
  card: Partial<Card>;
  onSaved?: () => void;
}

export function SaveAsTemplate({ card, onSaved }: SaveAsTemplateProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Template name is required");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      // Strip out non-template fields
      const { id, createdAt, updatedAt, ...templateFields } = card;

      const { error } = await supabase
        .from('card_templates')
        .insert({
          name,
          description,
          template: templateFields,
        });

      if (error) throw error;

      toast.success("Template saved", {
        description: `Card template "${name}" has been saved.`
      });

      setIsOpen(false);
      if (onSaved) onSaved();
    } catch (error) {
      console.error('Error saving template:', error);
      setError(typeof error === 'string' ? error : 'Failed to save template. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <SaveIcon className="h-4 w-4 mr-2" />
          Save as Template
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Create a reusable template from this card. Templates can be used to quickly create similar cards.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="templateName" className="text-right">
              Name
            </Label>
            <Input
              id="templateName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="Feature Request, Bug Report, etc."
            />
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="templateDescription" className="text-right pt-2">
              Description
            </Label>
            <Textarea
              id="templateDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              placeholder="What this template is used for..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ManageTemplatesProps {
  onTemplateDeleted?: () => void;
}

export function ManageTemplates({ onTemplateDeleted }: ManageTemplatesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('card_templates')
        .select('*')
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      const supabase = createClient();
      const { error } = await supabase
        .from('card_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTemplates(templates.filter(t => t.id !== id));

      toast.success("Template deleted", {
        description: "Card template has been deleted successfully."
      });

      if (onTemplateDeleted) onTemplateDeleted();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error("Error", {
        description: "Failed to delete template. Please try again."
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileIcon className="h-4 w-4 mr-2" />
          Manage Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Card Templates</DialogTitle>
          <DialogDescription>
            View, edit, or delete your saved card templates.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-4 text-center text-gray-500">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="py-4 text-center text-gray-500">No templates found. Create a template by saving a card.</div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-start justify-between p-3 border rounded-md hover:bg-gray-50"
                >
                  <div>
                    <h4 className="font-medium">{template.name}</h4>
                    {template.description && (
                      <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      Created: {new Date(template.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    disabled={deletingId === template.id}
                  >
                    <TrashIcon className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// New component for creating a template from scratch
export function CreateTemplateButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [cardDescription, setCardDescription] = useState("");
  const [cardType, setCardType] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [labels, setLabels] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [epic, setEpic] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddLabel = () => {
    if (!newLabel.trim()) return;
    if (!labels.includes(newLabel.trim())) {
      setLabels([...labels, newLabel.trim()]);
    }
    setNewLabel("");
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    setLabels(labels.filter(label => label !== labelToRemove));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Template name is required");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      // Create template data
      const templateData: Partial<Card> = {
        title,
        description: cardDescription,
        cardType: cardType as Card["cardType"],
        priority: priority as Card["priority"],
        labels,
        metadata: {
          epic
        }
      };

      const { error: saveError } = await supabase
        .from('card_templates')
        .insert({
          name,
          description,
          template: templateData,
        });

      if (saveError) throw saveError;

      toast.success("Template created", {
        description: `Card template "${name}" has been created.`
      });

      setIsOpen(false);
      // Reset form
      setName("");
      setDescription("");
      setTitle("");
      setCardDescription("");
      setCardType("");
      setPriority("");
      setLabels([]);
      setEpic("");
    } catch (error) {
      console.error('Error creating template:', error);
      setError(typeof error === 'string' ? error : 'Failed to create template. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileIcon className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Template</DialogTitle>
          <DialogDescription>
            Create a reusable template for cards. Templates can be applied when creating new cards.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="templateName" className="text-right">
              Template Name
            </Label>
            <Input
              id="templateName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="Feature Request, Bug Report, etc."
              required
            />
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="templateDescription" className="text-right pt-2">
              Template Description
            </Label>
            <Textarea
              id="templateDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              placeholder="What this template is used for..."
              rows={2}
            />
          </div>

          <div className="border-t my-4"></div>
          <h3 className="font-medium text-sm">Card Template Details</h3>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
              placeholder="Card title"
            />
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">
              Description
            </Label>
            <Textarea
              id="description"
              value={cardDescription}
              onChange={(e) => setCardDescription(e.target.value)}
              className="col-span-3"
              placeholder="Card description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cardType" className="text-right">
              Card Type
            </Label>
            <select
              id="cardType"
              value={cardType}
              onChange={(e) => setCardType(e.target.value)}
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
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="col-span-3 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
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
                      handleAddLabel();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLabel}
                >
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 mt-2">
                {labels.length === 0 ? (
                  <span className="text-sm text-gray-500">No labels added</span>
                ) : (
                  labels.map((label) => (
                    <div key={label} className="bg-blue-100 text-blue-800 px-2 py-1 rounded flex items-center gap-1">
                      {label}
                      <button
                        type="button"
                        onClick={() => handleRemoveLabel(label)}
                        className="text-xs rounded-full hover:bg-blue-200 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}