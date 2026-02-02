'use client';

import { getWeeksInMonth, getMonthName, formatDate } from '@/lib/activities';
import { ActivityDay } from './ActivityDay';
import { useActivities } from './ActivityProvider';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import { Card, CardContent } from '@/components/ui/card';

import { ActivityMap } from '@/lib/activities';

import { ActivityOptionFilter } from './ActivityOptionFilter';
import { ActivityFilter } from './ActivityFilter';
import { ActivityType } from '@/lib/activityTypes';

interface MonthViewProps {
  year: number;
  month: number;
  activities?: ActivityMap;
  isDiscreteFilter?: boolean;
  selectedTypeId?: string;
  onFilterChange?: (id: string) => void;
  excludedValues?: Set<number>;
  onToggleValue?: (value: number) => void;
  activeType?: ActivityType;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// The actual month content
function MonthContent({ 
  year, 
  month, 
  activities: propActivities,
  isDiscreteFilter,
  selectedTypeId,
  onFilterChange,
  excludedValues,
  onToggleValue,
  activeType
}: MonthViewProps) {
  const { activities: contextActivities } = useActivities();
  const activities = propActivities || contextActivities;
  
  const weeks = getWeeksInMonth(year, month);
  const monthName = getMonthName(month);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            {monthName} {year}
          </h3>
          
          {/* Filter inside the card header */}
          {selectedTypeId && onFilterChange && (
            <ActivityFilter 
              selectedTypeId={selectedTypeId} 
              onFilterChange={onFilterChange} 
            />
          )}
        </div>

        {/* Option Filters (if discrete type selected) */}
        {isDiscreteFilter && activeType && excludedValues && onToggleValue && (
          <ActivityOptionFilter
            activityType={activeType}
            excludedValues={excludedValues}
            onToggleValue={onToggleValue}
          />
        )}
      </div>
      
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <div 
            key={day} 
            className="aspect-square flex items-center justify-center text-xs text-muted-foreground font-medium"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0">
        {weeks.map((week, weekIndex) => (
          week.map((date, dayIndex) => {
            const isLastDayOfMonth = date ? 
              (new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate() === date.getDate()) : false;
            
            // Check for adjacent cells in the grid to determine rounding
            // Note: weeks[weekIndex - 1] might be undefined if first week
            // date checks ensure we don't count null pads as cells
            const hasCellAbove = weekIndex > 0 && weeks[weekIndex - 1][dayIndex] !== null;
            const hasCellBelow = weekIndex < weeks.length - 1 && weeks[weekIndex + 1][dayIndex] !== null;

            return (
              <ActivityDay
                key={`${weekIndex}-${dayIndex}`}
                date={date}
                activity={date ? activities[formatDate(date)] : undefined}
                isDiscreteFilter={isDiscreteFilter}
                excludedValues={excludedValues}
                weekIndex={weekIndex}
                dayIndex={dayIndex}
                totalWeeks={weeks.length}
                isLastDayOfMonth={isLastDayOfMonth}
                hasCellAbove={hasCellAbove}
                hasCellBelow={hasCellBelow}
              />
            );
          })
        ))}
      </div>
    </div>
  );
}

export function MonthView(props: MonthViewProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return (
    <div className={isDesktop ? "flex justify-center" : ""}>
      <Card className={isDesktop ? "w-[70%] shadow-lg" : ""}>
        <CardContent className="p-6">
          <MonthContent {...props} />
        </CardContent>
      </Card>
    </div>
  );
}
