'use client';

import { memo } from 'react';
import { getDatesInYear, formatDate, getShortMonthName, getWeeksInMonth, ActivityMap, getMonthName } from '@/lib/activities';
import { ActivityDay } from './ActivityDay';
import { useActivities } from './ActivityProvider';

import { ActivityFilter } from './ActivityFilter';
import { ActivityOptionFilter } from './ActivityOptionFilter';
import { ActivityType } from '@/lib/activityTypes';
import { Card, CardContent } from '@/components/ui/card';

interface YearViewProps {
  year: number;
  isDiscreteFilter?: boolean;
  selectedTypeId?: string;
  onFilterChange?: (id: string) => void;
  excludedValues?: Set<number>;
  onToggleValue?: (value: number) => void;
  activeType?: ActivityType;
  activities?: ActivityMap; // Optional prop as we use context mostly
}

// Mobile View: Vertical list of months
function MobileYearView({ 
  year, 
  isDiscreteFilter,
  selectedTypeId,
  onFilterChange,
  excludedValues,
  onToggleValue,
  activeType,
  activities: propActivities,
}: YearViewProps) {
  const { activities: contextActivities } = useActivities();
  const activities = propActivities || contextActivities;
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{year}</h3>
          {selectedTypeId && onFilterChange && (
            <ActivityFilter 
              selectedTypeId={selectedTypeId} 
              onFilterChange={onFilterChange} 
            />
          )}
        </div>
        {isDiscreteFilter && activeType && excludedValues && onToggleValue && (
            <ActivityOptionFilter
              activityType={activeType}
              excludedValues={excludedValues}
              onToggleValue={onToggleValue}
            />
         )}
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        {months.map((month) => {
          const weeks = getWeeksInMonth(year, month);
          return (
            <div key={month} className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                {getShortMonthName(month)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {weeks.flat().map((date, index) => (
                  <ActivityDay
                    key={index}
                    date={date}
                    activity={date ? activities[formatDate(date)] : undefined}
                    compact
                    isDiscreteFilter={isDiscreteFilter}
                    excludedValues={excludedValues}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Desktop View: GitHub-style contribution graph
function DesktopYearView({ 
  year, 
  isDiscreteFilter,
  selectedTypeId,
  onFilterChange,
  excludedValues,
  onToggleValue,
  activeType,
  activities: propActivities,
}: YearViewProps) {
  const { activities: contextActivities } = useActivities();
  const activities = propActivities || contextActivities;
  const dates = getDatesInYear(year); // Assumes this util returns all dates for the year properly
  
  // Group dates by week (GitHub-style: columns are weeks, rows are days of week)
  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];
  
  // Add empty cells for days before Jan 1 of this year to align properly
  if (dates.length > 0) {
      const firstDayOfYear = dates[0].getDay(); // 0 is Sunday
      for (let i = 0; i < firstDayOfYear; i++) {
        currentWeek.push(null);
      }
  }
  
  for (const date of dates) {
    currentWeek.push(date);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  
  // Fill remaining week if incomplete
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  // Calculate month label positions based on week index
  const monthLabels: { month: string; startPercent: number; endPercent: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, weekIndex) => {
    // Find first valid date in week to determine month
    const firstValidDate = week.find(d => d !== null);
    if (firstValidDate) {
      const month = firstValidDate.getMonth();
      if (month !== lastMonth) {
        if (monthLabels.length > 0) {
          // Close previous segment
          monthLabels[monthLabels.length - 1].endPercent = (weekIndex / weeks.length) * 100;
        }
        monthLabels.push({ 
          month: getShortMonthName(month), 
          startPercent: (weekIndex / weeks.length) * 100,
          endPercent: 100 // Temporary end
        });
        lastMonth = month;
      }
    }
  });

  // Calculate the width percentage for each week column
  const weekWidthPercent = 100 / weeks.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{year}</h3>
          {selectedTypeId && onFilterChange && (
            <ActivityFilter 
              selectedTypeId={selectedTypeId} 
              onFilterChange={onFilterChange} 
            />
          )}
        </div>
        {isDiscreteFilter && activeType && excludedValues && onToggleValue && (
            <ActivityOptionFilter
              activityType={activeType}
              excludedValues={excludedValues}
              onToggleValue={onToggleValue}
            />
         )}
      </div>
      
      <Card>
        <CardContent className="p-4 overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Month labels */}
            <div className="relative h-6 mb-1 w-full">
              {monthLabels.map(({ month, startPercent }) => (
                <div 
                  key={`${month}-${startPercent}`}
                  className="absolute text-xs text-muted-foreground font-medium"
                  style={{ left: `${startPercent}%` }}
                >
                  {month}
                </div>
              ))}
            </div>

            {/* Activity grid */}
            {/* We render columns (weeks) horizontally */}
            <div className="flex w-full gap-[2px]">
              {weeks.map((week, weekIndex) => (
                <div 
                  key={weekIndex} 
                  className="flex-col gap-[2px] flex"
                  style={{ width: `${weekWidthPercent}%` }}
                >
                  {week.map((date, dayIndex) => (
                    <div key={dayIndex} className="w-full aspect-square">
                      <ActivityDay
                        date={date}
                        activity={date ? activities[formatDate(date)] : undefined}
                        compact
                        isDiscreteFilter={isDiscreteFilter}
                        excludedValues={excludedValues}
                      />
                    </div>
                  ))}
                 </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const YearView = memo(function YearView(props: YearViewProps) {
  return (
    <>
      <div className="block md:hidden">
        <MobileYearView {...props} />
      </div>
      <div className="hidden md:block">
        <DesktopYearView {...props} />
      </div>
    </>
  );
});
