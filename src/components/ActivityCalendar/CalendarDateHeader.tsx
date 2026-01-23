import { cn } from "@/lib/utils";
import { ReactNode } from "react";

// Helper to get short month name
function getShortMonth(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
}

// Helper to get day number
function getDayNumber(date: Date): number {
  return date.getDate();
}

// Helper to get day of week name
function getDayOfWeek(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

// Calendar tile component for displaying date
export function CalendarTile({ date }: { date: Date }) {
  const shortMonth = getShortMonth(date);
  const dayNumber = getDayNumber(date);

  return (
    <div
      className={cn(
        "w-14 h-14 rounded-xl overflow-hidden shrink-0",
        "bg-card border border-border",
        "shadow-sm",
        "flex flex-col items-center justify-center"
      )}
    >
      {/* Month header */}
      <div
        className={cn(
          "w-full py-0.5 text-center",
          "bg-muted",
          "text-[9px] font-bold tracking-wide text-foreground"
        )}
      >
        {shortMonth}
      </div>
      {/* Day number */}
      <div className="flex-1 flex items-center justify-center">
        <span className="text-xl font-bold text-foreground">{dayNumber}</span>
      </div>
    </div>
  );
}

// Date header with tile and day of week - left aligned
// Optionally includes a title label below (e.g., "Activity Summary")
export function CalendarDateHeader({ 
  date,
  title,
  badge,
}: { 
  date: Date;
  title?: string;
  badge?: ReactNode;
}) {
  const dayOfWeek = getDayOfWeek(date);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <CalendarTile date={date} />
        <h2 className="text-2xl font-bold text-foreground tracking-tight">
          {dayOfWeek}
        </h2>
      </div>
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            {title}
          </h3>
          {badge}
        </div>
      )}
    </div>
  );
}

