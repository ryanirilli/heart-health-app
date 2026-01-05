"use client";

import { useState } from "react";
import { Activity, hasActivityData, getEntryCount } from "@/lib/activities";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useActivityTypes,
  useActivities,
  formatValueWithUnit,
} from "./ActivityProvider";
import { ActivityEntryDialog } from "./ActivityEntryDialog";
import { ActivityEntry } from "@/lib/activities";
import { getGoalType, ActivityTypeMap } from "@/lib/activityTypes";

interface ActivityDayProps {
  date: Date | null;
  activity?: Activity;
  compact?: boolean;
}

/**
 * Format date for tooltip display
 */
function formatTooltipDate(date: Date): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  const dayNum = date.getDate();
  const year = date.getFullYear();

  return `${dayName}, ${monthName} ${dayNum}, ${year}`;
}

export function ActivityDay({
  date,
  activity,
  compact = false,
}: ActivityDayProps) {
  const { activityTypes } = useActivityTypes();
  const { updateActivity, deleteActivity, isSaving, isDeleting } =
    useActivities();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!date) {
    return <div className="aspect-square" />;
  }

  const hasData = hasActivityData(activity);
  const entryCount = getEntryCount(activity);
  const dayNumber = date.getDate();

  /**
   * Calculate the activity score for the day based on goal types and values.
   *
   * Scoring logic:
   * - Sum all values from "positive" (more is better) activities → positiveSum
   * - Sum all values from "negative" (less is better) activities → negativeSum
   * - Compare: if positiveSum >= negativeSum → 'positive', else → 'negative'
   * - Neutral/tracking activities are ignored
   * - If only neutral activities exist → 'neutral'
   *
   * Returns: 'positive' | 'negative' | 'neutral' | null (no data)
   */
  const getActivityScore = (
    activity: Activity | undefined,
    types: ActivityTypeMap
  ): "positive" | "negative" | "neutral" | null => {
    if (!activity?.entries || Object.keys(activity.entries).length === 0) {
      return null;
    }

    let positiveSum = 0;
    let negativeSum = 0;
    let hasNonNeutral = false;

    for (const typeId in activity.entries) {
      const type = types[typeId];
      if (!type) continue;

      const entry = activity.entries[typeId];
      const value = entry.value;
      const goalType = getGoalType(type);

      if (goalType === "positive") {
        // More is better: add to positive sum
        positiveSum += value;
        hasNonNeutral = true;
      } else if (goalType === "negative") {
        // Less is better: add to negative sum
        negativeSum += value;
        hasNonNeutral = true;
      }
      // 'neutral' types are ignored for scoring
    }

    // If only neutral/tracking activities, return neutral
    if (!hasNonNeutral) {
      return "neutral";
    }

    // Compare sums: positive wins ties
    if (positiveSum >= negativeSum) return "positive";
    return "negative";
  };

  const activityScore = getActivityScore(activity, activityTypes);

  const getColorClass = () => {
    if (!hasData) return "bg-muted/50";

    switch (activityScore) {
      case "positive":
        return "bg-activity-positive";
      case "negative":
        return "bg-activity-negative";
      case "neutral":
      default:
        return "bg-activity-neutral";
    }
  };

  const cellColor = getColorClass();

  const formattedDate = formatTooltipDate(date);

  // Build activity summary for tooltip
  const getActivitySummary = () => {
    if (!activity?.entries || Object.keys(activity.entries).length === 0)
      return "No data";

    const summaryParts: string[] = [];
    for (const typeId in activity.entries) {
      const entry = activity.entries[typeId];
      const type = activityTypes[typeId];
      if (type) {
        // Include all tracked entries, even those with value 0
        summaryParts.push(formatValueWithUnit(entry.value, type));
      }
    }

    return summaryParts.length > 0 ? summaryParts.join(", ") : "No data";
  };

  // Check if the date is in the future
  const isFutureDate = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cellDate = new Date(date);
    cellDate.setHours(0, 0, 0, 0);
    return cellDate > today;
  })();

  const handleCellClick = () => {
    // Don't allow adding activities for future dates
    if (isFutureDate) return;
    // Open the dialog for viewing/editing in any view
    setDialogOpen(true);
  };

  const handleSave = (
    dateStr: string,
    entries: { [typeId: string]: ActivityEntry }
  ) => {
    updateActivity(dateStr, entries);
  };

  const handleDelete = () => {
    if (date) {
      const dateStr = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      deleteActivity(dateStr);
    }
  };

  const cell = (
    <div
      onClick={handleCellClick}
      className={cn(
        "aspect-square transition-all duration-200 flex items-center justify-center rounded-sm",
        cellColor,
        isFutureDate
          ? "cursor-not-allowed opacity-50"
          : "hover:ring-2 hover:ring-ring hover:ring-offset-1 cursor-pointer"
      )}
    >
      {!compact && (
        <span
          className={cn(
            "text-xs sm:text-sm font-medium",
            hasData ? "text-foreground" : "text-foreground/70"
          )}
        >
          {dayNumber}
        </span>
      )}
    </div>
  );

  // Mobile: use drawer on tap (for viewing in year view / compact mode)
  // Desktop: use tooltip on hover, click opens dialog
  return (
    <>
      {/* Desktop: Tooltip + Dialog */}
      <div className="hidden md:block">
        <Tooltip>
          <TooltipTrigger asChild>{cell}</TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <div className="font-medium">{formattedDate}</div>
              <div className="text-muted-foreground">
                {isFutureDate ? "" : getActivitySummary()}
              </div>
              {!isFutureDate && (
                <div className="text-xs text-muted-foreground/70 mt-1">
                  Click to {hasData ? "view" : "add entry"}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Mobile: Open dialog on tap */}
      <div
        className="block md:hidden"
        onClick={() => !isFutureDate && setDialogOpen(true)}
      >
        {cell}
      </div>

      {/* Dialog for adding/editing entries */}
      <ActivityEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        date={date}
        existingActivity={activity}
        onSave={handleSave}
        onDelete={hasData ? handleDelete : undefined}
        isSaving={isSaving}
        isDeleting={isDeleting}
      />
    </>
  );
}
