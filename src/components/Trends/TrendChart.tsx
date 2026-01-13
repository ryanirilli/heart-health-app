"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell
} from "recharts";
import { ActivityType, formatValueOnly } from "@/lib/activityTypes";
import { format } from "date-fns";

interface TrendChartProps {
  type: ActivityType;
  data: { date: string; value: number }[];
  color: string;
}

export function TrendChart({ type, data, color }: TrendChartProps) {
  const [hoveredData, setHoveredData] = useState<{
    date: string;
    formattedValue: string;
    rawValue: number;
    fullDate: string;
    label: string; 
  } | null>(null);

  // Calculate stats and format data
  const { chartData, weeklyTotal } = useMemo(() => {
    let total = 0;
    const formatted = data.map((d) => {
      total += d.value;
      const dateObj = new Date(d.date + "T00:00:00");
      return {
        ...d,
        dayName: format(dateObj, "EEE"), 
        fullDate: format(dateObj, "MMM d, yyyy"),
        formattedValue: formatValueOnly(d.value, type),
      };
    });
    
    return { chartData: formatted, weeklyTotal: total };
  }, [data, type]);

  // Handle mouse leave to reset HUD
  const handleMouseLeave = () => {
    setHoveredData(null);
  };
  
  // HUD Data: prioritize hovered, fallback to Weekly Total
  const hudDisplay = useMemo(() => {
    if (hoveredData) {
      return {
        topLabel: hoveredData.fullDate,
        mainLabel: hoveredData.formattedValue,
        subLabel: "Daily Value"
      };
    }
    return {
       topLabel: "Last 7 Days",
       mainLabel: formatValueOnly(weeklyTotal, type),
       subLabel: "Weekly Total"
    };
  }, [hoveredData, weeklyTotal, type]);

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between min-h-[3rem]">
        <div className="space-y-0.5">
          <h3 className="font-semibold text-foreground flex items-center gap-2 text-md">
            {type.name}
          </h3>
          <p className="text-sm text-muted-foreground">{hudDisplay.topLabel}</p>
        </div>
        
        <div className="text-right">
             <span className="text-2xl font-bold tracking-tight text-foreground">
                {hudDisplay.mainLabel}
             </span>
             <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
               {hudDisplay.subLabel}
             </p>
        </div>
      </div>

      <div className="h-[200px] w-full" onMouseLeave={handleMouseLeave}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
          >
            <XAxis 
              dataKey="dayName" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              dy={10}
              interval={0}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              domain={[0, 'auto']}
              width={30}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.2)', radius: 4 }}
              content={() => null}
            />
            <Bar
              dataKey="value"
              fill={color}
              radius={[4, 4, 4, 4]}
              maxBarSize={50}
              minPointSize={2}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.value > 0 ? color : "hsl(var(--muted))"} 
                  fillOpacity={entry.value > 0 ? 1 : 0.3}
                  onMouseEnter={() => {
                    setHoveredData({
                      date: entry.dayName,
                      fullDate: entry.fullDate,
                      formattedValue: entry.formattedValue,
                      rawValue: entry.value,
                      label: "Daily Value"
                    });
                  }}
                  onMouseLeave={() => setHoveredData(null)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
