import React from "react";
import { cn } from "@/lib/utils";
import { format, isPast, isToday } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CardActionsMenu } from "./card-actions-menu";

// Define the Card type
export type Card = {
  id: string;
  title: string;
  description?: string;
  order: number;
  columnId: string; // Will be removed in future steps; kept for backward compatibility
  statusId: string; // Now required instead of optional
  boardId: string;
  createdAt?: string;
  updatedAt?: string;
  // Additional fields for enhanced card functionality
  cardType?: 'feature' | 'bug' | 'chore';
  priority?: 'high' | 'medium' | 'low';
  dueDate?: string;
  labels?: string[];
  assigneeId?: string;
  assignee?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  blocked?: boolean;
  blockReason?: string;
  metadata?: {
    ageing?: number;
    epic?: string;
    [key: string]: unknown;
  };
};

// Card style configurations
const CARD_TYPE_STYLES = {
  feature: {
    background: "bg-green-100",
    text: "text-green-800",
    border: "border-l-4 border-l-green-500",
    hoverBorder: "hover:border-green-500",
    icon: "✨",
    description: "New functionality or enhancement",
  },
  bug: {
    background: "bg-red-100",
    text: "text-red-800",
    border: "border-l-4 border-l-red-500",
    hoverBorder: "hover:border-red-500",
    icon: "🐛",
    description: "Fix for a defect or issue",
  },
  chore: {
    background: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-l-4 border-l-yellow-500",
    hoverBorder: "hover:border-yellow-500",
    icon: "🔧",
    description: "Technical task or maintenance work",
  },
};

const PRIORITY_STYLES = {
  high: {
    background: "bg-red-100",
    text: "text-red-800",
    icon: "🔥",
    description: "Highest priority",
  },
  medium: {
    background: "bg-blue-100",
    text: "text-blue-800",
    icon: "📋",
    description: "Normal priority",
  },
  low: {
    background: "bg-gray-100",
    text: "text-gray-800",
    icon: "🔽",
    description: "Low priority",
  },
};

const getDueDateColor = (dueDate?: string): string => {
  if (!dueDate) return "";
  const date = new Date(dueDate);
  if (isPast(date)) return "bg-red-100 text-red-800";
  if (isToday(date)) return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
};

const getAgeingColor = (ageing?: number): string => {
  if (!ageing) return "bg-gray-300";
  if (ageing >= 6) return "bg-red-400";
  if (ageing > 3) return "bg-yellow-300";
  return "bg-gray-300";
};

const getAgeingTooltip = (days?: number): string => {
  if (!days) return "New: Less than 1 day in this column";
  if (days === 1) return "1 day in this column";
  return `${days} days in this column`;
};

type CardProps = {
  card: Card;
  onClick?: () => void;
  className?: string;
  isDragging?: boolean;
  onDuplicate?: (cardId: string) => Promise<void>;
  onArchive?: (cardId: string) => Promise<void>;
  onDelete?: (cardId: string) => Promise<void>;
};

export function Card({
  card,
  onClick,
  className,
  isDragging,
  onDuplicate,
  onArchive,
  onDelete
}: CardProps) {
  const cardTypeStyle = card.cardType ? CARD_TYPE_STYLES[card.cardType] : undefined;
  const priorityStyle = card.priority ? PRIORITY_STYLES[card.priority] : undefined;
  const ageing = card.metadata?.ageing || 0;

  return (
    <div
      className={cn(
        "bg-white rounded p-3 border shadow-sm hover:shadow-md transition-all cursor-grab relative",
        isDragging && "opacity-70 shadow-md ring-2 ring-blue-400 cursor-grabbing",
        card.blocked && "border-red-300",
        cardTypeStyle?.border || "border-gray-100",
        cardTypeStyle?.hoverBorder || "hover:border-gray-300",
        className
      )}
      onClick={onClick}
    >
      {/* Top Row - Labels and Indicators */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Card Type Indicator */}
          {card.cardType && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded flex items-center",
                  cardTypeStyle?.background,
                  cardTypeStyle?.text
                )}>
                  {cardTypeStyle?.icon}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  <strong>{card.cardType.charAt(0).toUpperCase() + card.cardType.slice(1)}</strong>
                  <br />
                  {cardTypeStyle?.description}
                </p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Priority Indicator */}
          {card.priority && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded",
                  priorityStyle?.background,
                  priorityStyle?.text
                )}>
                  {priorityStyle?.icon}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  <strong>{card.priority.charAt(0).toUpperCase() + card.priority.slice(1)} Priority</strong>
                  <br />
                  {priorityStyle?.description}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Blocked Indicator */}
          {card.blocked && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-red-100 text-red-800 p-1 pb-0.5 rounded-lg shadow-sm flex items-center cursor-default">
                  <span className="text-sm">🚫</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  <strong>Blocked</strong>
                  {card.blockReason && <><br />{card.blockReason}</>}
                </p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Card Actions Menu */}
          <CardActionsMenu
            card={card}
            onDuplicate={onDuplicate}
            onArchive={onArchive}
            onDelete={onDelete}
          />
        </div>
      </div>

      {/* Epic or category (if available) */}
      {card.metadata?.epic && (
        <div className="mb-1">
          <span className="text-xs text-gray-500 truncate max-w-[220px] inline-block">
            {card.metadata.epic}
          </span>
        </div>
      )}

      {/* Card Title */}
      <h3 className="font-medium text-sm text-slate-800 mb-2">{card.title}</h3>

      {/* Card Description (truncated) */}
      {card.description && (
        <div className="text-xs text-slate-500 line-clamp-3 mb-4">
          {card.description}
        </div>
      )}

      {/* Bottom Row - Assignee and Ageing */}
      <div className="flex items-center justify-between mt-auto">
        {/* Assignee */}
        {card.assignee && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="h-6 w-6">
                {card.assignee.avatarUrl ? (
                  <AvatarImage src={card.assignee.avatarUrl} alt={card.assignee.name} />
                ) : (
                  <AvatarFallback>
                    {card.assignee.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>{card.assignee.name}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Ageing Indicators */}
        {ageing > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-0.5 cursor-default">
                {Array.from({ length: Math.min(5, ageing) }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      getAgeingColor(i < 3 ? ageing : ageing + 1)
                    )}
                  />
                ))}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                <strong>Age indicator</strong>
                <br />
                {getAgeingTooltip(ageing)}
                {ageing >= 3 && " - Needs attention!"}
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Due Date (if available) */}
      {card.dueDate && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "mt-3 text-xs px-2 py-0.5 text-center rounded cursor-default",
              getDueDateColor(card.dueDate)
            )}>
              Due: {format(new Date(card.dueDate), "MMM d")}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              <strong>Due date</strong>
              <br />
              {isPast(new Date(card.dueDate))
                ? "Overdue!"
                : isToday(new Date(card.dueDate))
                ? "Due today!"
                : "Upcoming deadline"}
            </p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}