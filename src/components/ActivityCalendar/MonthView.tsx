'use client';

import { getWeeksInMonth, getMonthName, formatDate } from '@/lib/activities';
import { ActivityDay } from './ActivityDay';
import { useActivities } from './ActivityProvider';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import { Card, CardContent } from '@/components/ui/card';

interface MonthViewProps {
  year: number;
  month: number;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// The actual month content
function MonthContent({ year, month }: { year: number; month: number }) {
  const { activities } = useActivities();
  const weeks = getWeeksInMonth(year, month);
  const monthName = getMonthName(month);

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-foreground">
        {monthName} {year}
      </h3>
      
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
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((date, index) => (
          <ActivityDay
            key={index}
            date={date}
            activity={date ? activities[formatDate(date)] : undefined}
          />
        ))}
      </div>
    </div>
  );
}

export function MonthView({ year, month }: MonthViewProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return (
    <div className={isDesktop ? "flex justify-center" : ""}>
      <Card className={isDesktop ? "w-[70%] shadow-lg" : ""}>
        <CardContent className="p-6">
          <MonthContent year={year} month={month} />
        </CardContent>
      </Card>
    </div>
  );
}
