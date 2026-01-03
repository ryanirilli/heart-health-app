'use client';

import { Activity } from '@/lib/activities';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useActivityConfig, formatValueWithUnit } from './ActivityProvider';

interface ActivityDayProps {
  date: Date | null;
  activity?: Activity;
  compact?: boolean;
}

type ActivityState = 'good' | 'bad' | 'neutral';

/**
 * Determine if the activity state is good, bad, or neutral
 * For this app: false = good (no drinks), true = bad (had drinks)
 */
function getActivityState(activity?: Activity): ActivityState {
  if (!activity) return 'neutral';
  if (activity.state === false) return 'good';
  if (activity.state === true) return 'bad';
  // String states are neutral by default
  return 'neutral';
}

/**
 * Get the intensity level for activity visualization (0-4)
 */
function getIntensityLevel(activity?: Activity): number {
  if (!activity) return 0;
  
  // If state is false (good), show as "achieved" with full intensity
  if (activity.state === false) return 1;
  
  // If there's a value, calculate intensity based on it
  if (activity.value !== undefined) {
    if (activity.value <= 1) return 1;
    if (activity.value <= 2) return 2;
    if (activity.value <= 3) return 3;
    return 4;
  }
  
  // If state is true (bad) without value, show medium intensity
  return 2;
}

/**
 * Format date for tooltip display
 */
function formatTooltipDate(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  const dayNum = date.getDate();
  const year = date.getFullYear();
  
  return `${dayName}, ${monthName} ${dayNum}, ${year}`;
}

export function ActivityDay({ date, activity, compact = false }: ActivityDayProps) {
  const config = useActivityConfig();
  
  if (!date) {
    return (
      <div className="aspect-square" />
    );
  }

  const activityState = getActivityState(activity);
  const intensity = getIntensityLevel(activity);
  const dayNumber = date.getDate();
  
  // Color classes based on activity state
  // Good (false/no drinks): teal tones (chart-2)
  // Bad (true/had drinks): coral tones (chart-1)
  // Neutral: muted
  const colorClasses = {
    neutral: 'bg-muted/50',
    good: 'bg-chart-2',
    bad: {
      1: 'bg-chart-1/40',
      2: 'bg-chart-1/60',
      3: 'bg-chart-1/80',
      4: 'bg-chart-1',
    },
  };

  const cellColor = activityState === 'neutral' 
    ? colorClasses.neutral
    : activityState === 'good'
      ? colorClasses.good
      : colorClasses.bad[intensity as 1 | 2 | 3 | 4] || colorClasses.bad[2];

  const formattedDate = formatTooltipDate(date);
  const activityStatus = activity 
    ? typeof activity.state === 'string' 
      ? activity.state 
      : activity.state 
        ? 'Had drinks' 
        : 'No drinks ✓'
    : 'No data';
  const valueText = activity?.value !== undefined 
    ? formatValueWithUnit(activity.value, config) 
    : null;

  const cell = (
    <div
      className={cn(
        "aspect-square transition-all duration-200 hover:ring-2 hover:ring-ring hover:ring-offset-1 cursor-pointer flex items-center justify-center rounded-sm",
        cellColor
      )}
    >
      {!compact && (
        <span className={cn(
          "text-xs sm:text-sm font-medium",
          activityState === 'good' || intensity >= 3 
            ? "text-primary-foreground" 
            : "text-foreground/70"
        )}>
          {dayNumber}
        </span>
      )}
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {cell}
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-center">
          <div className="font-medium">{formattedDate}</div>
          <div className="text-muted-foreground">
            {activityStatus}
            {valueText && <span> · {valueText}</span>}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
