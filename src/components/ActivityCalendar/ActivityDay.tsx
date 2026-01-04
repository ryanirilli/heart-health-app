'use client';

import { useState } from 'react';
import { Activity, hasActivityData, getEntryCount } from '@/lib/activities';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useActivityTypes, useActivities, formatValueWithUnit } from './ActivityProvider';
import { ActivityEntryDialog } from './ActivityEntryDialog';
import { ActivityEntry } from '@/lib/activities';

interface ActivityDayProps {
  date: Date | null;
  activity?: Activity;
  compact?: boolean;
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
  const { activityTypes } = useActivityTypes();
  const { updateActivity, deleteActivity } = useActivities();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  if (!date) {
    return (
      <div className="aspect-square" />
    );
  }

  const hasData = hasActivityData(activity);
  const entryCount = getEntryCount(activity);
  const dayNumber = date.getDate();
  
  // Unified color: use chart-3 (a calm blue/slate) when there's data
  // Intensity based on how many entries are filled
  const getColorClass = () => {
    if (!hasData) return 'bg-muted/50';
    
    // Calculate intensity based on entry count (1-5 types max)
    if (entryCount === 1) return 'bg-chart-3/50';
    if (entryCount === 2) return 'bg-chart-3/65';
    if (entryCount === 3) return 'bg-chart-3/80';
    return 'bg-chart-3';
  };

  const cellColor = getColorClass();

  const formattedDate = formatTooltipDate(date);
  
  // Build activity summary for tooltip
  const getActivitySummary = () => {
    if (!activity?.entries || Object.keys(activity.entries).length === 0) return 'No data';
    
    const summaryParts: string[] = [];
    for (const typeId in activity.entries) {
      const entry = activity.entries[typeId];
      const type = activityTypes[typeId];
      if (type) {
        // Include all tracked entries, even those with value 0
        summaryParts.push(formatValueWithUnit(entry.value, type));
      }
    }
    
    return summaryParts.length > 0 ? summaryParts.join(', ') : 'No data';
  };

  const handleCellClick = () => {
    // In month view (non-compact), open the dialog for editing
    if (!compact) {
      setDialogOpen(true);
    }
  };

  const handleSave = (dateStr: string, entries: { [typeId: string]: ActivityEntry }) => {
    updateActivity(dateStr, entries);
  };

  const handleDelete = () => {
    if (date) {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      deleteActivity(dateStr);
    }
  };

  const cell = (
    <div
      onClick={handleCellClick}
      className={cn(
        "aspect-square transition-all duration-200 hover:ring-2 hover:ring-ring hover:ring-offset-1 cursor-pointer flex items-center justify-center rounded-sm",
        cellColor
      )}
    >
      {!compact && (
        <span className={cn(
          "text-xs sm:text-sm font-medium",
          hasData && entryCount >= 2
            ? "text-primary-foreground" 
            : "text-foreground/70"
        )}>
          {dayNumber}
        </span>
      )}
    </div>
  );

  // Mobile: use drawer on tap (for viewing in year view / compact mode)
  // Desktop: use tooltip on hover, click opens dialog
  return (
    <>
      {/* Desktop: Tooltip + Dialog */}
      <div className="hidden md:block">
        <Tooltip>
          <TooltipTrigger asChild>
            {cell}
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <div className="font-medium">{formattedDate}</div>
              <div className="text-muted-foreground">
                {getActivitySummary()}
              </div>
              {!compact && (
                <div className="text-xs text-muted-foreground/70 mt-1">
                  Click to {hasData ? 'edit' : 'add entry'}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Mobile: Drawer for compact view, Dialog for month view */}
      <div 
        className="block md:hidden" 
        onClick={() => {
          if (compact) {
            setDrawerOpen(true);
          } else {
            setDialogOpen(true);
          }
        }}
      >
        {cell}
      </div>

      {/* Drawer for mobile compact/year view */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader className="text-center">
            <DrawerTitle>{formattedDate}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8 text-center">
            <div className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
              hasData 
                ? "bg-chart-3/20 text-chart-3" 
                : "bg-muted text-muted-foreground"
            )}>
              {getActivitySummary()}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Dialog for adding/editing entries */}
      <ActivityEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        date={date}
        existingActivity={activity}
        onSave={handleSave}
        onDelete={hasData ? handleDelete : undefined}
      />
    </>
  );
}
