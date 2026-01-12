'use client';

import { memo } from 'react';
import { getDatesInYear, formatDate, getShortMonthName, getWeeksInMonth } from '@/lib/activities';
import { ActivityDay } from './ActivityDay';
import { useActivities } from './ActivityProvider';

interface YearViewProps {
  year: number;
}

function MobileYearView({ year }: YearViewProps) {
  const { activities } = useActivities();
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-foreground">{year}</h3>
      
      <div className="grid grid-cols-2 gap-4">
        {months.map((month) => {
          const weeks = getWeeksInMonth(year, month);
          return (
            <div key={month} className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                {getShortMonthName(month)}
              </div>
              <div className="grid grid-cols-7 gap-[2px]">
                {weeks.flat().map((date, index) => (
                  <ActivityDay
                    key={index}
                    date={date}
                    activity={date ? activities[formatDate(date)] : undefined}
                    compact
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

function DesktopYearView({ year }: YearViewProps) {
  const { activities } = useActivities();
  const dates = getDatesInYear(year);
  
  // Group dates by week (GitHub-style: columns are weeks, rows are days of week)
  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];
  
  // Add empty cells for days before Jan 1
  const firstDayOfYear = dates[0].getDay();
  for (let i = 0; i < firstDayOfYear; i++) {
    currentWeek.push(null);
  }
  
  for (const date of dates) {
    currentWeek.push(date);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  
  // Fill remaining week
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  // Calculate month label positions as percentages
  const monthLabels: { month: string; startPercent: number; endPercent: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, weekIndex) => {
    const firstValidDate = week.find(d => d !== null);
    if (firstValidDate) {
      const month = firstValidDate.getMonth();
      if (month !== lastMonth) {
        if (monthLabels.length > 0) {
          monthLabels[monthLabels.length - 1].endPercent = (weekIndex / weeks.length) * 100;
        }
        monthLabels.push({ 
          month: getShortMonthName(month), 
          startPercent: (weekIndex / weeks.length) * 100,
          endPercent: 100
        });
        lastMonth = month;
      }
    }
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">{year}</h3>
      
      <div className="w-full">
        {/* Month labels */}
        <div className="flex mb-1">
          {monthLabels.map(({ month, startPercent, endPercent }) => (
            <div 
              key={`${month}-${startPercent}`}
              className="text-xs text-muted-foreground overflow-hidden"
              style={{ width: `${endPercent - startPercent}%` }}
            >
              {month}
            </div>
          ))}
        </div>

        {/* Activity grid - using flex for proper column layout */}
        <div className="flex gap-[2px]">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex-1 flex flex-col gap-[2px]">
              {week.map((date, dayIndex) => (
                <ActivityDay
                  key={dayIndex}
                  date={date}
                  activity={date ? activities[formatDate(date)] : undefined}
                  compact
                />
              ))}
            </div>
          ))}
        </div>
      </div>


    </div>
  );
}



export const YearView = memo(function YearView({ year }: YearViewProps) {
  return (
    <>
      {/* Mobile: 2-column month grid */}
      <div className="block md:hidden">
        <MobileYearView year={year} />
      </div>
      
      {/* Desktop: GitHub-style horizontal grid */}
      <div className="hidden md:block">
        <DesktopYearView year={year} />
      </div>
    </>
  );
});
