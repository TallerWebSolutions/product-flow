import React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";

type WipLimitIndicatorProps = {
  currentCount: number;
  minWipLimit?: number;
  maxWipLimit: number;
  className?: string;
  showIcon?: boolean;
};

export function WipLimitIndicator({
  currentCount,
  minWipLimit,
  maxWipLimit,
  className,
  showIcon = true
}: WipLimitIndicatorProps) {
  // Calculate percentage of max limit
  const percentFilled = (currentCount / maxWipLimit) * 100;

  // Determine status based on min and max limits
  let status: "below-min" | "normal" | "warning" | "exceeded-max" = "normal";

  if (currentCount >= maxWipLimit) {
    status = "exceeded-max";
  } else if (currentCount >= maxWipLimit * 0.8) {
    status = "warning";
  } else if (minWipLimit !== undefined && currentCount < minWipLimit) {
    status = "below-min";
  }

  return (
    <div
      className={cn(
        "px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1",
        status === "below-min" && "bg-red-100 text-red-800",
        status === "normal" && "bg-green-100 text-green-800",
        status === "warning" && "bg-amber-100 text-amber-800",
        status === "exceeded-max" && "bg-red-100 text-red-800",
        className
      )}
      title={`${currentCount} items out of ${minWipLimit !== undefined ? `${minWipLimit}-` : ''}${maxWipLimit} limit (${Math.round(percentFilled)}%)`}
    >
      {showIcon && status === "below-min" && <AlertCircle className="h-3 w-3" />}
      {showIcon && status === "normal" && <CheckCircle className="h-3 w-3" />}
      {showIcon && status === "warning" && <AlertTriangle className="h-3 w-3" />}
      {showIcon && status === "exceeded-max" && <AlertCircle className="h-3 w-3" />}
      <span>{currentCount}/{minWipLimit !== undefined ? `${minWipLimit}-` : ''}{maxWipLimit}</span>
      {(status === "exceeded-max" || status === "below-min") && (
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
      )}
    </div>
  );
}