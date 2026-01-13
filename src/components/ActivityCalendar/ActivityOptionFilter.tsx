"use client";

import { ActivityType } from "@/lib/activityTypes";
import { cn } from "@/lib/utils";
import { useRef } from "react";

interface ActivityOptionFilterProps {
  activityType: ActivityType;
  excludedValues: Set<number>;
  onToggleValue: (value: number) => void;
}

export function ActivityOptionFilter({
  activityType,
  excludedValues,
  onToggleValue,
}: ActivityOptionFilterProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Helper to get color class for a value
  const getColorClass = (value: number, index: number) => {
    // If excluded, show gray/muted
    if (excludedValues.has(value)) {
      return "bg-muted text-muted-foreground hover:bg-muted/80";
    }
    
    // Otherwise show the distinct color
    // Map stable index (0-4) to color (1-5)
    // Note: We use the *sorted* index of options to ensure stability, 
    // similar to logic in ActivityDay
    const colorIndex = (index % 5) + 1;
    return `bg-discrete-${colorIndex} text-foreground hover:opacity-90`;
  };

  // Extract options based on UI type
  let options: { label: string; value: number }[] = [];

  if (activityType.uiType === "buttonGroup" && activityType.buttonOptions) {
    options = [...activityType.buttonOptions].sort((a, b) => a.value - b.value);
  } else if (activityType.uiType === "toggle") {
    // Toggle has fixed options: Yes (1) and No (0)
    // For consistency with color mapping:
    // Yes -> Color 5 (Teal)
    // No -> Color 2 (Terracotta/Purple depending on theme, but we map No to index 1 which becomes Color 2)
    options = [
      { label: "Yes", value: 1 },
      { label: "No", value: 0 },
    ];
  } else {
    // Other types don't support option filtering (slider/increment don't have discrete buckets usually)
    return null;
  }

  if (options.length === 0) return null;

  return (
    <div 
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-none touch-pan-x"
    >
      {options.map((option, index) => {
        // Special mapping for Toggle to match ActivityDay colors
        // Yes (index 0 in our manual array above) -> should be Color 5
        // No (index 1) -> should be Color 2
        let effectiveIndex = index;
        if (activityType.uiType === 'toggle') {
             if (option.value === 1) effectiveIndex = 4; // 4 % 5 + 1 = 5
             if (option.value === 0) effectiveIndex = 1; // 1 % 5 + 1 = 2
        }

        const isExcluded = excludedValues.has(option.value);

        return (
          <button
            key={option.value}
            onClick={() => onToggleValue(option.value)}
            className={cn(
              "flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all select-none border",
              isExcluded 
                ? "bg-transparent border-dashed border-muted-foreground/30 text-muted-foreground" 
                : `${getColorClass(option.value, effectiveIndex)} border-transparent shadow-sm`
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
