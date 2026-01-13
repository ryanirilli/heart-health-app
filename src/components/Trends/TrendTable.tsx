"use client";

import { Badge } from "@/components/ui/badge";
import { ActivityType, formatValueOnly } from "@/lib/activityTypes";
import { format } from "date-fns";

interface TrendTableProps {
  type: ActivityType;
  data: { date: string; value: number }[];
  color: string;
}

export function TrendTable({ type, data, color }: TrendTableProps) {
  // Sort data Newest -> Oldest
  const processedData = [...data].reverse().map((d) => {
    const dateObj = new Date(d.date + "T00:00:00");
    const label = formatValueOnly(d.value, type);
    const isZero = d.value === 0;
    
    // Determine color for this specific value
    let valueColor = color;
    
    if (type.buttonOptions) {
        // Sort options by value to ensure consistent coloring order
        const sortedOptions = [...type.buttonOptions].sort((a, b) => a.value - b.value);
        const index = sortedOptions.findIndex(o => o.value === d.value);
        if (index !== -1) {
            // Cycle through chart-1 to chart-5
            const chartIndex = (index % 5) + 1;
            valueColor = `hsl(var(--chart-${chartIndex}))`;
        }
    } else if (type.uiType === "toggle") {
        // Toggle: 1 (Yes) gets the main color, 0 is already handled as "No entry"
        valueColor = color;
    }
    
    return {
      date: d.date,
      dayName: format(dateObj, "EEEE"),
      fullDate: format(dateObj, "MMM d"),
      value: d.value,
      label,
      isZero,
      valueColor
    };
  });

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
       <div className="space-y-0.5">
          <h3 className="font-semibold text-foreground flex items-center gap-2 text-md">
            {type.name}
          </h3>
          <p className="text-sm text-muted-foreground">Last 7 Days</p>
        </div>

        <div className="space-y-3">
          {processedData.map((item) => (
            <div key={item.date} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                 <span className="font-medium w-24 text-muted-foreground">{item.fullDate}</span>
                 <span className="text-foreground">{item.dayName}</span>
              </div>
              
              {item.isZero ? (
                 <span className="text-muted-foreground italic text-xs">No entry</span>
              ) : (
                <Badge 
                    variant="outline" 
                    className="px-3 py-1 font-medium transition-colors border-2"
                    style={{
                        borderColor: item.valueColor,
                        color: item.valueColor,
                        backgroundColor: "transparent"
                    }}
                >
                  {item.label}
                </Badge>
              )}
            </div>
          ))}
        </div>
    </div>
  );
}
