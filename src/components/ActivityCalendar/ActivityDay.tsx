"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Activity, hasActivityData, getEntryCount, formatDate } from "@/lib/activities";
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
import { useGoals } from "@/components/Goals";
import { ActivityEntryDialog } from "./ActivityEntryDialog";
import { ActivityEntry } from "@/lib/activities";
import { getGoalType, ActivityTypeMap } from "@/lib/activityTypes";
import { getGoalsWithIndicatorForDate, isGoalMet, getEffectiveValueForGoal } from "@/lib/goals";

interface ActivityDayProps {
  date: Date | null;
  activity?: Activity;
  compact?: boolean;
  isDiscreteFilter?: boolean;
  excludedValues?: Set<number>;
  weekIndex?: number;
  dayIndex?: number;
  totalWeeks?: number;
  isLastDayOfMonth?: boolean;
  hasCellAbove?: boolean;
  hasCellBelow?: boolean;
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
  isDiscreteFilter = false,
  excludedValues,
  weekIndex,
  dayIndex,
  totalWeeks,
  isLastDayOfMonth,
  hasCellAbove,
  hasCellBelow,
}: ActivityDayProps) {
  const { activityTypes } = useActivityTypes();
  const { updateActivity, deleteActivity, isSaving, isDeleting, activities } =
    useActivities();
  const { goals } = useGoals();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!date) {
    // Pad days should not be rendered in the non-rectangular layout
    return <div />;
  }

  const hasData = hasActivityData(activity);
  const entryCount = getEntryCount(activity);
  const dayNumber = date.getDate();
  
  // Check if there are goals that should show an indicator on this date
  // Only show star if at least one goal is actually achieved
  const dateStr = formatDate(date);
  const goalsWithIndicator = getGoalsWithIndicatorForDate(goals, dateStr);
  const hasAchievedGoal = goalsWithIndicator.some((goal) => {
    const activityType = activityTypes[goal.activityTypeId];
    
    // For daily goals, check the specific day's value
    if (goal.dateType === 'daily') {
      const activityValue = activity?.entries?.[goal.activityTypeId]?.value;
      return isGoalMet(goal, activityValue, activityType);
    }
    
    // For non-daily goals (weekly, monthly, by_date, sum, average),
    // calculate the effective value over the period
    const result = getEffectiveValueForGoal(goal, activityType, activities, dateStr);
    
    // For Absolute tracking, we expect ALL days to be met
    const isAbsolute = goal.trackingType === 'absolute' && 
      (activityType.uiType === 'buttonGroup' || activityType.uiType === 'toggle');
      
    if (isAbsolute) {
      return result.allDaysMet && result.dayCount > 0;
    }
    
    // For Sum/Average positive/negative goals, check if effectiveValue meets target
    return isGoalMet(goal, result.effectiveValue, activityType);
  });

  // Helper to get discrete information (value index, label) if applicable
  const getDiscreteInfo = () => {
    // Only process discrete info if we are actively filtering by a specific type
    if (!isDiscreteFilter) return null;

    if (!activity?.entries) return null;
    const entries = Object.entries(activity.entries);
    if (entries.length !== 1) return null;
    
    const [typeId, entry] = entries[0];
    const type = activityTypes[typeId];
    
    if (!type || (type.uiType !== 'buttonGroup' && type.uiType !== 'toggle')) return null;
    
    // Safety check for value
    const value = entry.value;

    // CHECK EXCLUSION
    if (excludedValues && excludedValues.has(value)) {
        return null; // Treat as if no discrete info (will fallback to "hasData" checks or empty)
    }
    
    let label = "";
    let colorIndex = 1; // 1-5
    
    if (type.uiType === 'buttonGroup' && type.buttonOptions) {
        const option = type.buttonOptions.find(o => o.value === value);
        label = option?.label ?? value.toString();
        // Map value based on index in sorted options to ensure stability
        const sortedOptions = [...type.buttonOptions].sort((a, b) => a.value - b.value);
        const index = sortedOptions.findIndex(o => o.value === value);
        if (index !== -1) {
            colorIndex = (index % 5) + 1;
        }
    } else if (type.uiType === 'toggle') {
        label = value === 1 ? "Yes" : "No";
        // Use distinct colors for contrast: Yes -> Teal (5), No -> Purple (2)
        colorIndex = value === 1 ? 5 : 2; 
    }
    
    return { label, colorIndex };
  };

  const discreteInfo = getDiscreteInfo();

  // Helper to get numeric intensity information (value, max, intensity 1-5)
  const getNumericInfo = () => {
    // Only process numeric info if we are actively filtering by a specific type
    if (!isDiscreteFilter) return null;

    if (!activity?.entries) return null;
    const entries = Object.entries(activity.entries);
    if (entries.length !== 1) return null;
    
    const [typeId, entry] = entries[0];
    const type = activityTypes[typeId];
    
    if (!type || (type.uiType !== 'slider' && type.uiType !== 'increment')) return null;

    const value = entry.value;
    if (value === 0) return null; // No activity

    // Determine max reference for intensity calculation
    // For slider: use maxValue
    // For increment: use 10 as a reasonable default baseline for "high activity", 
    // or we could check if there's a goal? For now, hardcode/heuristic.
    const maxRef = type.maxValue || 10; 
    
    // Calculate intensity 1-5
    // 1: very low (< 20%)
    // 5: max or higher (>= 100%)
    const percentage = Math.min(value / maxRef, 1);
    let intensity = Math.ceil(percentage * 5);
    if (intensity === 0 && value > 0) intensity = 1; // Ensure at least 1 if valid

    return { value, intensity }; // intensity 1..5
  };

  const numericInfo = getNumericInfo();

  // Static lookup map for discrete colors to ensure Tailwind detects them
  const DISCRETE_BG_CLASSES: Record<number, string> = {
    1: "bg-discrete-1",
    2: "bg-discrete-2",
    3: "bg-discrete-3",
    4: "bg-discrete-4",
    5: "bg-discrete-5",
  };

  // Static lookup for numeric intensity opacity (Stepped transparency)
  // Using chart-3 (neutral blue) with opacity.
  const NUMERIC_BG_CLASSES: Record<number, string> = {
    1: "bg-chart-3/15", // 15% opacity
    2: "bg-chart-3/30", // 30% opacity
    3: "bg-chart-3/50", // 50% opacity
    4: "bg-chart-3/70", // 50% opacity
    5: "bg-chart-3/90", // 90% opacity
  };

  const getColorClass = () => {
    if (!hasData) return "bg-card";
    
    if (discreteInfo) {
        return DISCRETE_BG_CLASSES[discreteInfo.colorIndex] || "bg-chart-3/80";
    }

    if (numericInfo) {
        return NUMERIC_BG_CLASSES[numericInfo.intensity] || "bg-chart-3/80";
    }

    // If we are strictly filtering (discrete mode), and didn't match above (e.g. excluded),
    // we should treat it as empty/hidden.
    if (isDiscreteFilter) {
        return "bg-muted/50";
    }

    // For other logged activities (numeric, multiple, OR "All Activities" view), use the "neutral blue" 
    return "bg-chart-3/80";
  };
  
  const cellColor = getColorClass();
  
  // Use white text for filled cells... BUT for low opacity numeric, white might be unreadable?
  // Let's check: 
  // 20% opacity blue on white card -> very light blue. White text will disappear. Dark text needed.
  // 40% -> still light.
  // 60-80-100 -> distinct.
  // Rule: intensity 1-2 (low) -> dark text. intensity 3-5 (high) -> white text.
  // For discrete (solid colors) -> always white.
  // For standard (solid chart-3) -> always white.
  
  const getTextColorClass = () => {
      if (!hasData) return "text-foreground/70";
      
      if (discreteInfo) return "text-white font-semibold";
      
      if (numericInfo) {
          // Low intensity = dark text
          if (numericInfo.intensity <= 2) return "text-foreground font-semibold";
          return "text-white font-semibold";
      }

      // If we are strictly filtering (discrete mode) and excluded, revert to deafult text style
      if (isDiscreteFilter) {
          return "text-foreground/70";
      }
      
      return "text-white font-semibold";
  };
  
  const textColorClass = getTextColorClass();

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

  // Layout logic:
  // Compact (Year): Just color, no text changes.
  // Standard (Month): 
  // - If discrete: Show Label prominently, move date to corner? OR replace date?
  // User said: "render the text value... on the calendar day tile"
  // Given tile size, showing BOTH date and label cleanly requires layout change.
  // Let's try Date top-left (xs), Label center (sm/bold).
  
  const cellContent = (
    <>
      <span
        className={cn(
          "font-medium transition-all pointer-events-none",
          compact 
            ? "text-xs sm:text-sm" // Original compact behavior (though compact usually hides text via parent check)
            : discreteInfo 
                ? "absolute top-0.5 left-1 text-[10px] opacity-80 font-normal" // Discrete: Date moved to corner
                : "text-xs sm:text-sm", // Standard: Date centered
             textColorClass
        )}
      >
        {dayNumber}
      </span>
      
      {!compact && discreteInfo && (
          <span className={cn(
            "text-[10px] sm:text-xs font-bold px-0.5 leading-tight text-center break-words line-clamp-2 pointer-events-none",
            textColorClass
          )}>
              {discreteInfo.label}
          </span>
      )}
    </>
  );

  // Grid styling logic (for Month View only, not Compact)
  const isStartOfMonth = date.getDate() === 1;
  const isEndOfMonth = isLastDayOfMonth;
  
  // Top Left: 
  // 1. Start of Month (classic)
  // 2. Start of a row (col 0 / Sunday) AND nothing above it (step down)
  // Logic: Day 1 covers case 1. For case 2: dayIndex === 0 && !hasCellAbove.
  // Wait, if dayIndex is 0, hasCellAbove would be true unless it's the very first week? 
  // If it's the first week, hasCellAbove is false. So dayIndex===0 in week 0 is top left.
  // But also if we have a gap? No, grid is solid except for start/end of month.
  // So "nothing above it" implies logic for irregular shapes.
  // In a standard calendar month, only the FIRST week has empty slots at the start.
  // Subsequent weeks always start at dayIndex 0 and always have a cell above them.
  // EXCEPT if we are simply matching the user requirement: "if row does not have a bordered day above it".
  // This logic works generally.
  const isTopLeft = isStartOfMonth || (dayIndex === 0 && !hasCellAbove);

  // Top Right:
  // 1. Last day of first week (col 6 / Saturday) -> covers standard corner
  // 2. Generally: If it's the last col (6) and no cell above? (Usually always has cell above except week 0)
  // Actually, standard Top Right is just week 0, day 6.
  const isTopRight = (weekIndex === 0 && dayIndex === 6);

  // Bottom Left:
  // 1. First day of last week (col 0 / Sunday) -> covers standard corner
  const isBottomLeft = (weekIndex !== undefined && totalWeeks !== undefined) && (weekIndex === totalWeeks - 1 && dayIndex === 0);

  // Bottom Right:
  // 1. End of Month (classic)
  // 2. End of a row (col 6 / Saturday) AND nothing below it.
  const isBottomRight = isEndOfMonth || (dayIndex === 6 && !hasCellBelow);

  const getBorderRadiusClass = () => {
    if (compact) return "rounded"; // Keep year view simple
    
    // We can have multiple corners on one cell (e.g. 1st day is also top right if on Saturday)
    const distinctCorners = [
        isTopLeft && "rounded-tl-2xl",
        isTopRight && "rounded-tr-2xl",
        isBottomLeft && "rounded-bl-2xl",
        isBottomRight && "rounded-br-2xl",
    ].filter(Boolean).join(" ");
    
    return distinctCorners;
  };

  const borderRadiusClass = getBorderRadiusClass();

  const cell = (
    <div
      onClick={handleCellClick}
      className={cn(
        "aspect-square transition-all duration-200 flex items-center justify-center relative",
        
        // Grid Layout Styles (Month View)
        !compact && "border border-border -ml-px -mt-px z-0 hover:z-10",
        
        // Rounded corners
        borderRadiusClass,

        cellColor,
        isFutureDate
          ? "cursor-not-allowed opacity-50"
          : "hover:brightness-75 cursor-pointer", // Darken on hover
        // Flex direction for discrete text layout
        !compact && discreteInfo && "flex-col p-1"
      )}
    >
      {!compact && cellContent}
      {/* Goal indicator star - shows when goals are achieved on evaluation days */}
      {!compact && hasAchievedGoal && !isFutureDate && ( // Hide star in compact mode (Year view)
        <Star 
          className={cn(
            "absolute top-0.5 right-0.5 h-3.5 w-3.5 pointer-events-none",
            "text-white fill-white"
          )} 
        />
      )}
    </div>
  );

  // Fetch the FULL activity for this date from context (unfiltered) to use in the dialog
  // The 'activity' prop passed in is potentially filtered by the parent view
  const fullActivity = date ? activities[formatDate(date)] : undefined;
  
  // Check if we need to use full activity or filtered activity for interactions
  // For the dialog (view/edit), we ALWAYS want the full activity.
  // For the tooltip summary, if we're filtered, maybe we want to show just the filtered summary?
  // Let's assume tooltip should also show everything or at least match the dialog expectation.
  // But typically tooltip summarizes what you see. Let's stick to using 'activity' (filtered) for Tooltip summary
  // and 'fullActivity' for the Dialog.

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
        existingActivity={fullActivity} // Use full unfiltered activity here
        onSave={handleSave}
        onDelete={hasData ? handleDelete : undefined}
        isSaving={isSaving}
        isDeleting={isDeleting}
      />
    </>
  );
}
