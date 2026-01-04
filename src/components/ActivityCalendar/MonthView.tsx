import { getWeeksInMonth, getMonthName, formatDate } from '@/lib/activities';
import { ActivityDay } from './ActivityDay';
import { useActivities } from './ActivityProvider';

interface MonthViewProps {
  year: number;
  month: number;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MonthView({ year, month }: MonthViewProps) {
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
