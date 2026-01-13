"use client";

import { useMemo } from "react";
import { getFirstEntryDate } from "@/lib/activities";
import { ActivityType, getActiveActivityTypes } from "@/lib/activityTypes";
import { TrendChart } from "./TrendChart";
import { TrendTable } from "./TrendTable";
import { subDays, format, eachDayOfInterval, startOfDay } from "date-fns";
import { CalendarDays } from "lucide-react";
import { motion } from "framer-motion";
import { useActivities, useActivityTypes } from "@/components/ActivityCalendar";

export function TrendsView() {
  const { activityTypes: types } = useActivityTypes();
  const { activities } = useActivities();
  // Logic to determine eligible activities and prepare chart data
  const eligibleActivities = useMemo(() => {
    const activeTypes = getActiveActivityTypes(types);
    const today = startOfDay(new Date());
    const sevenDaysAgo = subDays(today, 6); // Inclusive of today, so go back 6 days = 7 days total range
    
    // Generate dates for the last 7 days
    const range = eachDayOfInterval({
        start: sevenDaysAgo,
        end: today
    });
    
    // Format dates as strings for lookup
    const last7DaysDates = range.map(d => format(d, 'yyyy-MM-dd'));

    const result = activeTypes.map((type) => {
        // Check eligibility: first entry must be >= 7 days ago (i.e. <= sevenDaysAgo date object comparison)
        const firstEntryDate = getFirstEntryDate(type.id, activities);
        
        // If no data
        if (!firstEntryDate) return null;

        // Check if data is mature enough (at least 7 days old)
        // We compare the first entry date to 7 days ago. 
        // If first entry is AFTER 7 days ago (i.e. newer), then we don't have a full week yet?
        // Let's stick to strict 7 days check: firstEntryDate <= sevenDaysAgo (more than 7 days ago)
        // Actually, user said "at least one week of data". 
        // So if I started 3 days ago, I shouldn't see trends.
        // If I started 8 days ago, I see trends.
        // So if firstEntryDate is AFTER (newer than) sevenDaysAgo, then ineligible.
        
        // Compare timestamps to be safe
        if (firstEntryDate.getTime() > sevenDaysAgo.getTime()) {
             return null;
        }

        // Prepare data for the last 7 days
        const chartData = last7DaysDates.map((dateStr) => {
          const dayActivity = activities[dateStr];
          const entry = dayActivity?.entries[type.id];
          return {
            date: dateStr,
            value: entry?.value ?? null,
          };
        });

        return {
          type,
          data: chartData,
        };
      });
      
    // Filter out nulls
    return result.filter((item) => item !== null) as { type: ActivityType; data: { date: string; value: number | null }[] }[];
  }, [types, activities]);

  // Empty state if no eligible activities
  if (eligibleActivities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center h-[50vh]">
        <div className="bg-muted p-4 rounded-full">
          <CalendarDays className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Not Enough Data Yet</h3>
          <p className="text-muted-foreground max-w-[280px]">
            Keep logging your activities! Trends will appear here once you have at least 1 week of data.
          </p>
        </div>
      </div>
    );
  }

  // Render charts for eligible activities
  return (
    <div className="space-y-6 pb-20">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Trends</h2>
        <p className="text-muted-foreground">Your activity over the last 7 days</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {eligibleActivities.map(({ type, data }, index) => {
           const isDiscrete = type.uiType === "buttonGroup" || type.uiType === "toggle";
           
           // Use explicit comma-separated HSL to ensure SVG compatibility (Recharts/SVG can be picky)
           const CHART_COLORS = [
             "hsl(15, 40%, 55%)",  // chart-1
             "hsl(160, 30%, 45%)", // chart-2
             "hsl(210, 25%, 50%)", // chart-3
             "hsl(45, 40%, 55%)",  // chart-4
             "hsl(280, 20%, 55%)"  // chart-5
           ];
           const color = CHART_COLORS[index % CHART_COLORS.length];

           return (
            <motion.div
                key={type.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
               {isDiscrete ? (
                   <TrendTable type={type} data={data} color={color} />
               ) : (
                   <TrendChart type={type} data={data} color={color} />
               )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
