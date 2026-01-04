'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Activity, ActivityEntry, formatDate } from '@/lib/activities';
import { ActivityType, formatValueWithUnit, getGoalType, getButtonOptionLabel } from '@/lib/activityTypes';
import pluralizeLib from 'pluralize-esm';
const { plural } = pluralizeLib;
import { useActivityTypes } from './ActivityProvider';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/lib/hooks/useMediaQuery';

type DialogMode = 'view' | 'edit';

interface ActivityEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  existingActivity?: Activity;
  onSave: (date: string, entries: { [typeId: string]: ActivityEntry }) => void;
  onDelete?: () => void;
}

function formatDialogDate(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  const dayNum = date.getDate();
  const year = date.getFullYear();
  
  return `${dayName}, ${monthName} ${dayNum}, ${year}`;
}

interface EntryInputProps {
  type: ActivityType;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
}

function EntryInput({ type, value, onChange, disabled }: EntryInputProps) {
  const currentValue = value ?? 0;
  const minValue = type.minValue ?? 0;
  const maxValue = type.maxValue ?? 100;
  const step = type.step ?? 1;

  if (type.uiType === 'slider') {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {formatValueWithUnit(currentValue, type)}
          </span>
        </div>
        <input
          type="range"
          min={minValue}
          max={maxValue}
          step={step}
          value={currentValue}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{minValue}</span>
          <span>{maxValue}</span>
        </div>
      </div>
    );
  }

  if (type.uiType === 'buttonGroup') {
    const options = type.buttonOptions ?? [];
    
    return (
      <div className="flex gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              // Toggle: if already selected, deselect (set to 0)
              if (currentValue === option.value) {
                onChange(0);
              } else {
                onChange(option.value);
              }
            }}
            disabled={disabled}
            className={cn(
              "flex-1 py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all",
              currentValue === option.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:border-muted-foreground/50 text-muted-foreground hover:text-foreground",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  // Increment/decrement UI
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, currentValue - step))}
        disabled={disabled || currentValue <= 0}
        className={cn(
          "w-10 h-10 rounded-full border-2 text-lg font-bold transition-all flex items-center justify-center",
          disabled || currentValue <= 0
            ? "border-muted text-muted-foreground cursor-not-allowed"
            : "border-border hover:border-foreground text-foreground hover:bg-muted"
        )}
      >
        −
      </button>
      <div className="flex-1 text-center">
        <span className="text-2xl font-bold text-foreground">
          {currentValue}
        </span>
        {type.unit && (
          <span className="ml-2 text-sm text-muted-foreground">
            {type.pluralize && currentValue !== 1 
              ? plural(type.unit)
              : type.unit}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(currentValue + step)}
        disabled={disabled}
        className="w-10 h-10 rounded-full border-2 border-border hover:border-foreground text-lg font-bold text-foreground hover:bg-muted transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        +
      </button>
    </div>
  );
}

function ActivityTypeCard({ 
  type, 
  value, 
  isTracked,
  onChange, 
  onToggleTracked,
  disabled 
}: { 
  type: ActivityType; 
  value: number | undefined;
  isTracked: boolean;
  onChange: (value: number | undefined) => void;
  onToggleTracked: (tracked: boolean) => void;
  disabled?: boolean;
}) {
  const goalType = getGoalType(type);
  const isDisabled = disabled || type.deleted;
  
  return (
    <div 
      className={cn(
        "rounded-lg border transition-all overflow-hidden",
        type.deleted 
          ? "border-border/50 bg-muted/30" 
          : isTracked
            ? "border-primary/50 bg-primary/5"
            : "border-border hover:border-muted-foreground/40"
      )}
    >
      {/* Clickable header to toggle tracking */}
      <button
        type="button"
        onClick={() => !isDisabled && onToggleTracked(!isTracked)}
        disabled={isDisabled}
        className={cn(
          "w-full flex items-center gap-2 p-4 text-left transition-colors",
          !isDisabled && !isTracked && "hover:bg-muted/50",
          isDisabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className={cn(
          "w-2 h-2 rounded-full",
          goalType === 'negative' ? "bg-chart-1" : 
          goalType === 'positive' ? "bg-chart-2" : 
          "bg-chart-3"
        )} />
        <span className="text-sm font-medium text-foreground flex-1">
          {type.name}
        </span>
        {type.deleted && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            Archived
          </span>
        )}
        {!isTracked && !isDisabled && (
          <span className="text-xs text-muted-foreground">
            Tap to log
          </span>
        )}
        {isTracked && (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </button>
      
      {/* Value input (shown when tracked) */}
      {isTracked && (
        <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1 duration-150">
          <EntryInput
            type={type}
            value={value}
            onChange={onChange}
            disabled={isDisabled}
          />
        </div>
      )}
    </div>
  );
}

/** View-only card for displaying activity entries */
function ActivityViewCard({ 
  type, 
  value 
}: { 
  type: ActivityType; 
  value: number;
}) {
  const goalType = getGoalType(type);
  
  // Format the display value
  const displayValue = () => {
    if (type.uiType === 'buttonGroup') {
      const label = getButtonOptionLabel(type, value);
      return label || `${value}`;
    }
    return formatValueWithUnit(value, type);
  };
  
  return (
    <div 
      className={cn(
        "rounded-lg border p-4 transition-all",
        type.deleted 
          ? "border-border/50 bg-muted/30" 
          : "border-border bg-card"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            goalType === 'negative' ? "bg-chart-1" : 
            goalType === 'positive' ? "bg-chart-2" : 
            "bg-chart-3"
          )} />
          <span className="text-sm font-medium text-foreground">
            {type.name}
          </span>
          {type.deleted && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              Archived
            </span>
          )}
        </div>
        <span className="text-lg font-semibold text-foreground">
          {displayValue()}
        </span>
      </div>
    </div>
  );
}

export function ActivityEntryDialog({
  open,
  onOpenChange,
  date,
  existingActivity,
  onSave,
  onDelete,
}: ActivityEntryDialogProps) {
  const { activeTypes, activityTypes } = useActivityTypes();
  const [entries, setEntries] = useState<{ [typeId: string]: number | undefined }>({});
  const [trackedTypes, setTrackedTypes] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnsetTypes, setShowUnsetTypes] = useState(false);
  const [mode, setMode] = useState<DialogMode>('view');
  const isMobile = useIsMobile();

  // Reset state when dialog opens with new data
  useEffect(() => {
    if (open) {
      const initialEntries: { [typeId: string]: number | undefined } = {};
      const initialTracked = new Set<string>();
      
      // Initialize with existing values
      if (existingActivity?.entries) {
        for (const typeId in existingActivity.entries) {
          initialEntries[typeId] = existingActivity.entries[typeId].value;
          initialTracked.add(typeId);
        }
      }
      
      setEntries(initialEntries);
      setTrackedTypes(initialTracked);
      setShowUnsetTypes(false);
      // Start in view mode if there's existing data, otherwise edit mode for new entries
      setMode(existingActivity ? 'view' : 'edit');
    }
  }, [open, existingActivity]);

  const handleEntryChange = (typeId: string, value: number | undefined) => {
    setEntries(prev => ({
      ...prev,
      [typeId]: value,
    }));
  };

  const handleToggleTracked = (typeId: string, tracked: boolean) => {
    setTrackedTypes(prev => {
      const next = new Set(prev);
      if (tracked) {
        next.add(typeId);
        // Initialize value to 0 when tracking starts
        if (entries[typeId] === undefined) {
          setEntries(prev => ({ ...prev, [typeId]: 0 }));
        }
      } else {
        next.delete(typeId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    
    try {
      const dateStr = formatDate(date);
      
      // Build entries object - only include types that are explicitly tracked
      const activityEntries: { [typeId: string]: ActivityEntry } = {};
      for (const typeId of trackedTypes) {
        const value = entries[typeId] ?? 0;
        activityEntries[typeId] = { typeId, value };
      }

      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, entries: activityEntries }),
      });

      if (!response.ok) {
        throw new Error('Failed to save activity');
      }

      onSave(dateStr, activityEntries);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save activity:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsSubmitting(true);
    
    try {
      const dateStr = formatDate(date);
      const response = await fetch(`/api/activities?date=${dateStr}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete activity');
      }

      onDelete();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to delete activity:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedDate = formatDialogDate(date);
  
  // Get all types that have entries (including deleted types for viewing)
  const typesWithExistingEntries = existingActivity?.entries 
    ? Object.keys(existingActivity.entries)
        .map(typeId => activityTypes[typeId])
        .filter(Boolean)
    : [];
  
  // Combine active types with any deleted types that have existing entries
  const allRelevantTypes = [
    ...activeTypes,
    ...typesWithExistingEntries.filter(t => t.deleted && !activeTypes.find(at => at.id === t.id))
  ];

  // Check if this is a new entry (no existing activity)
  const isNewEntry = !existingActivity;

  // For existing entries, separate tracked and untracked types
  const trackedTypesList = allRelevantTypes.filter(type => trackedTypes.has(type.id));
  const untrackedTypesList = allRelevantTypes.filter(type => !trackedTypes.has(type.id));

  // Get entries with their types for view mode
  const entriesWithTypes = existingActivity?.entries 
    ? Object.entries(existingActivity.entries)
        .map(([typeId, entry]) => ({
          type: activityTypes[typeId],
          value: entry.value,
        }))
        .filter(item => item.type)
        .sort((a, b) => a.type.order - b.type.order)
    : [];

  // View mode content
  const viewContent = (
    <>
      <div className="space-y-3 py-4">
        {entriesWithTypes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No activities logged for this day.</p>
            <button
              type="button"
              onClick={() => setMode('edit')}
              className="mt-4 px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Add activities
            </button>
          </div>
        ) : (
          entriesWithTypes.map(({ type, value }) => (
            <ActivityViewCard
              key={type.id}
              type={type}
              value={value}
            />
          ))
        )}
      </div>
    </>
  );

  // View mode footer - simplified, just Close button
  const viewFooter = (
    <div className="flex items-center justify-end gap-2 w-full">
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className={cn(
          "px-6 py-2 rounded-lg text-sm font-medium transition-all",
          "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        Close
      </button>
    </div>
  );

  // Edit button icon for view mode header
  const editIconButton = mode === 'view' && existingActivity ? (
    <button
      type="button"
      onClick={() => setMode('edit')}
      className="absolute right-4 top-4 w-8 h-8 rounded-full border-2 border-border hover:border-foreground flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
      aria-label="Edit activity"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
        <path d="m15 5 4 4"/>
      </svg>
    </button>
  ) : null;

  // Edit mode content
  const editContent = (
    <div className="space-y-4 py-4">
      {activeTypes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No activity types defined yet.</p>
          <p className="text-sm">Add activity types in settings to start tracking.</p>
        </div>
      ) : isNewEntry ? (
        // For new entries, show all activity types directly (no accordion)
        <div className="space-y-3">
          {allRelevantTypes.map((type) => (
            <ActivityTypeCard
              key={type.id}
              type={type}
              value={entries[type.id]}
              isTracked={trackedTypes.has(type.id)}
              onChange={(value) => handleEntryChange(type.id, value)}
              onToggleTracked={(tracked) => handleToggleTracked(type.id, tracked)}
            />
          ))}
        </div>
      ) : (
        // For existing entries in edit mode, show tracked first, then accordion for untracked
        <>
          {/* Tracked types */}
          {trackedTypesList.length > 0 && (
            <div className="space-y-3">
              {trackedTypesList.map((type) => (
                <ActivityTypeCard
                  key={type.id}
                  type={type}
                  value={entries[type.id]}
                  isTracked={true}
                  onChange={(value) => handleEntryChange(type.id, value)}
                  onToggleTracked={(tracked) => handleToggleTracked(type.id, tracked)}
                />
              ))}
            </div>
          )}

          {/* Accordion for untracked types */}
          {untrackedTypesList.length > 0 && (
            <div className={cn(trackedTypesList.length > 0 && "border-t border-border pt-4")}>
              <button
                type="button"
                onClick={() => setShowUnsetTypes(!showUnsetTypes)}
                className="w-full flex items-center justify-between py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>
                  {untrackedTypesList.length} untracked {untrackedTypesList.length === 1 ? 'activity' : 'activities'}
                </span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className={cn(
                    "transition-transform duration-200",
                    showUnsetTypes && "rotate-180"
                  )}
                >
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>
              
              {showUnsetTypes && (
                <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  {untrackedTypesList.map((type) => (
                    <ActivityTypeCard
                      key={type.id}
                      type={type}
                      value={entries[type.id]}
                      isTracked={false}
                      onChange={(value) => handleEntryChange(type.id, value)}
                      onToggleTracked={(tracked) => handleToggleTracked(type.id, tracked)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Show message if no tracked types yet */}
          {trackedTypesList.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No activities logged yet. Expand above to add.
            </div>
          )}
        </>
      )}
    </div>
  );

  // Edit mode footer
  const editFooter = (
    <div className="flex items-center justify-between gap-2 w-full">
      {existingActivity && onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
        >
          Delete
        </button>
      )}
      <div className="flex-1" />
      <button
        type="button"
        onClick={() => {
          if (existingActivity) {
            // Reset to original values and go back to view mode
            const initialEntries: { [typeId: string]: number | undefined } = {};
            const initialTracked = new Set<string>();
            for (const typeId in existingActivity.entries) {
              initialEntries[typeId] = existingActivity.entries[typeId].value;
              initialTracked.add(typeId);
            }
            setEntries(initialEntries);
            setTrackedTypes(initialTracked);
            setMode('view');
          } else {
            onOpenChange(false);
          }
        }}
        disabled={isSubmitting}
        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSave}
        disabled={activeTypes.length === 0 || isSubmitting}
        className={cn(
          "px-6 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed",
          "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        {isSubmitting ? 'Saving...' : 'Save'}
      </button>
    </div>
  );

  const title = mode === 'view' ? 'Activity Summary' : 'Log Activity';
  const content = mode === 'view' ? viewContent : editContent;
  const footer = mode === 'view' ? viewFooter : editFooter;

  // Use Drawer on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <div className="relative">
            <DrawerHeader className="text-left">
              <DrawerTitle>{title}</DrawerTitle>
              <DrawerDescription>{formattedDate}</DrawerDescription>
            </DrawerHeader>
            {editIconButton}
          </div>
          <div className="px-4 overflow-y-auto flex-1">
            {content}
          </div>
          <DrawerFooter className="flex-row">
            {footer}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto" hideCloseButton>
        {editIconButton}
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{formattedDate}</DialogDescription>
        </DialogHeader>
        {content}
        <DialogFooter className="flex-row">
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
