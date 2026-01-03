'use client';

import { ActivityMap, getDatesInYear, formatDate, getShortMonthName, getWeeksInMonth } from '@/lib/activities';
import { ActivityDay } from './ActivityDay';

interface YearViewProps {
  year: number;
  activities: ActivityMap;
}

function MobileYearView({ year, activities }: YearViewProps) {
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

      {/* Legend */}
      <Legend />
    </div>
  );
}

function DesktopYearView({ year, activities }: YearViewProps) {
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

      {/* Legend */}
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm bg-muted/50" />
        <span>No data</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm bg-chart-2" />
        <span>No drinks</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex gap-0.5">
          <div className="w-3 h-3 rounded-sm bg-chart-1/40" />
          <div className="w-3 h-3 rounded-sm bg-chart-1/60" />
          <div className="w-3 h-3 rounded-sm bg-chart-1/80" />
          <div className="w-3 h-3 rounded-sm bg-chart-1" />
        </div>
        <span>Had drinks</span>
      </div>
    </div>
  );
}

export function YearView({ year, activities }: YearViewProps) {
  return (
    <>
      {/* Mobile: 2-column month grid */}
      <div className="block md:hidden">
        <MobileYearView year={year} activities={activities} />
      </div>
      
      {/* Desktop: GitHub-style horizontal grid */}
      <div className="hidden md:block">
        <DesktopYearView year={year} activities={activities} />
      </div>
    </>
  );
}
