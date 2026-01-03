'use client';

import { useState, useMemo } from 'react';
import { ActivityMap, getMonthName, getDateRange } from '@/lib/activities';
import { MonthView } from './MonthView';
import { YearView } from './YearView';
import { cn } from '@/lib/utils';

type ViewMode = 'month' | 'year';

interface ActivityCalendarProps {
  activities: ActivityMap;
}

export function ActivityCalendar({ activities }: ActivityCalendarProps) {
  const dateRange = useMemo(() => getDateRange(activities), [activities]);
  
  const [viewMode, setViewMode] = useState<ViewMode>('year');
  const [year, setYear] = useState(dateRange.maxYear);
  const [month, setMonth] = useState(
    dateRange.maxYear === new Date().getFullYear() 
      ? Math.min(dateRange.maxMonth, new Date().getMonth())
      : dateRange.maxMonth
  );

  // Check if we can navigate
  const canGoPrevious = useMemo(() => {
    if (viewMode === 'year') {
      return year > dateRange.minYear;
    }
    // Month view: can go back if not at the first month of the first year
    if (year > dateRange.minYear) return true;
    return month > dateRange.minMonth;
  }, [viewMode, year, month, dateRange]);

  const canGoNext = useMemo(() => {
    if (viewMode === 'year') {
      return year < dateRange.maxYear;
    }
    // Month view: can go forward if not at the last month of the last year
    if (year < dateRange.maxYear) return true;
    return month < dateRange.maxMonth;
  }, [viewMode, year, month, dateRange]);

  const handlePrevious = () => {
    if (!canGoPrevious) return;
    
    if (viewMode === 'month') {
      if (month === 0) {
        setMonth(11);
        setYear(year - 1);
      } else {
        setMonth(month - 1);
      }
    } else {
      setYear(year - 1);
    }
  };

  const handleNext = () => {
    if (!canGoNext) return;
    
    if (viewMode === 'month') {
      if (month === 11) {
        setMonth(0);
        setYear(year + 1);
      } else {
        setMonth(month + 1);
      }
    } else {
      setYear(year + 1);
    }
  };

  // When switching to month view, default to current month (clamped to valid range)
  const handleViewModeChange = (newMode: ViewMode) => {
    setViewMode(newMode);
    
    if (newMode === 'month') {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Try to show current month if it's within the data range
      if (currentYear >= dateRange.minYear && currentYear <= dateRange.maxYear) {
        setYear(currentYear);
        
        // Clamp month to valid range for the current year
        if (currentYear === dateRange.minYear && currentMonth < dateRange.minMonth) {
          setMonth(dateRange.minMonth);
        } else if (currentYear === dateRange.maxYear && currentMonth > dateRange.maxMonth) {
          setMonth(dateRange.maxMonth);
        } else {
          setMonth(currentMonth);
        }
      } else if (currentYear < dateRange.minYear) {
        // Current date is before data range, show first available month
        setYear(dateRange.minYear);
        setMonth(dateRange.minMonth);
      } else {
        // Current date is after data range, show last available month
        setYear(dateRange.maxYear);
        setMonth(dateRange.maxMonth);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* View mode toggle */}
        <div className="flex rounded-lg bg-muted p-1">
          <button
            onClick={() => handleViewModeChange('month')}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
              viewMode === 'month' 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Month
          </button>
          <button
            onClick={() => handleViewModeChange('year')}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
              viewMode === 'year' 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Year
          </button>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            className={cn(
              "p-2 rounded-md transition-colors",
              canGoPrevious 
                ? "hover:bg-muted text-muted-foreground hover:text-foreground" 
                : "text-muted-foreground/30 cursor-not-allowed"
            )}
            aria-label="Previous"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          
          <span className="text-sm font-medium text-foreground min-w-[120px] text-center">
            {viewMode === 'month' ? `${getMonthName(month)} ${year}` : year}
          </span>
          
          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className={cn(
              "p-2 rounded-md transition-colors",
              canGoNext 
                ? "hover:bg-muted text-muted-foreground hover:text-foreground" 
                : "text-muted-foreground/30 cursor-not-allowed"
            )}
            aria-label="Next"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar view */}
      <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
        {viewMode === 'month' ? (
          <MonthView year={year} month={month} activities={activities} />
        ) : (
          <YearView year={year} activities={activities} />
        )}
      </div>
    </div>
  );
}
