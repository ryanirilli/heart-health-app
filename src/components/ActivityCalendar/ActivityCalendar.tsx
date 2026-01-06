'use client';

import { useState, useMemo, useCallback } from 'react';
import { getShortMonthName, getDateRange } from '@/lib/activities';
import { DayView } from './DayView';
import { MonthView } from './MonthView';
import { YearView } from './YearView';
import { useActivities } from './ActivityProvider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type ViewMode = 'day' | 'month' | 'year';

// Helper to check if a date is today
function isToday(date: Date): boolean {
  const today = new Date();
  return date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
}

// Helper to add days to a date
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Format date for display in navigation (e.g., "Jan 5")
function formatShortDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

export function ActivityCalendar() {
  const { activities } = useActivities();
  const dateRange = useMemo(() => getDateRange(activities), [activities]);
  
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  
  // Day view state - lifted up for header navigation
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  
  // Day view navigation
  const canGoNextDay = !isToday(selectedDate);
  
  const goToPreviousDay = useCallback(() => {
    setSlideDirection('right');
    setSelectedDate(prev => addDays(prev, -1));
  }, []);
  
  const goToNextDay = useCallback(() => {
    if (canGoNextDay) {
      setSlideDirection('left');
      setSelectedDate(prev => addDays(prev, 1));
    }
  }, [canGoNextDay]);

  // Check if we can navigate (for month/year views)
  const canGoPrevious = useMemo(() => {
    if (viewMode === 'day') return true; // Day view can always go back
    if (viewMode === 'year') {
      return year > dateRange.minYear;
    }
    // Month view: can go back if not at the first month of the first year
    if (year > dateRange.minYear) return true;
    return month > dateRange.minMonth;
  }, [viewMode, year, month, dateRange]);

  const canGoNext = useMemo(() => {
    if (viewMode === 'day') return canGoNextDay;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    if (viewMode === 'year') {
      // Can go forward up to current year
      return year < currentYear;
    }
    // Month view: can go forward up to current month
    if (year < currentYear) return true;
    return month < currentMonth;
  }, [viewMode, year, month, canGoNextDay]);

  const handlePrevious = () => {
    if (viewMode === 'day') {
      goToPreviousDay();
      return;
    }
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
    if (viewMode === 'day') {
      goToNextDay();
      return;
    }
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
  
  // Get the navigation label based on view mode
  const getNavigationLabel = () => {
    if (viewMode === 'day') {
      return formatShortDate(selectedDate);
    }
    if (viewMode === 'month') {
      return getShortMonthName(month);
    }
    return year;
  };

  // When switching view modes, set appropriate defaults
  const handleViewModeChange = (newMode: string) => {
    if (!newMode) return; // ToggleGroup can return empty string when deselecting
    const mode = newMode as ViewMode;
    setViewMode(mode);
    
    if (mode === 'month') {
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
    } else if (mode === 'year') {
      // Default to current year
      setYear(new Date().getFullYear());
    }
    // Day view doesn't need any setup - it always shows today
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* View mode toggle */}
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={handleViewModeChange}
          variant="pill"
          size="pill"
          className="rounded-full bg-muted p-1 border border-border"
        >
          <ToggleGroupItem value="day" aria-label="Day view">
            Day
          </ToggleGroupItem>
          <ToggleGroupItem value="month" aria-label="Month view">
            Month
          </ToggleGroupItem>
          <ToggleGroupItem value="year" aria-label="Year view">
            Year
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Navigation - shown for all views, but hidden on mobile for day view (swipe instead) */}
        <div className={cn("flex", viewMode === 'day' && "hidden md:flex")}>
          <div className="flex items-center rounded-full border border-border bg-muted p-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handlePrevious}
              disabled={!canGoPrevious}
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="text-sm font-medium text-foreground min-w-[48px] text-center px-1">
              {getNavigationLabel()}
            </span>
            
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleNext}
              disabled={!canGoNext}
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar view */}
      {viewMode === 'day' ? (
        <DayView 
          selectedDate={selectedDate}
          slideDirection={slideDirection}
          onPreviousDay={goToPreviousDay}
          onNextDay={goToNextDay}
          canGoNext={canGoNextDay}
        />
      ) : (
        <Card>
          <CardContent className="p-6">
            {viewMode === 'month' ? (
              <MonthView year={year} month={month} />
            ) : (
              <YearView year={year} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
