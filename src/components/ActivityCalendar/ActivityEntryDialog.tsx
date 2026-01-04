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
import { Activity, ActivityEntry, formatDate } from '@/lib/activities';
import { ActivityType, formatValueWithUnit, getGoalType } from '@/lib/activityTypes';
import { useActivityTypes, useActivities } from './ActivityProvider';
import { cn } from '@/lib/utils';

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
              ? (type.unit.endsWith('s') ? type.unit : `${type.unit}s`)
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
  onChange, 
  disabled 
}: { 
  type: ActivityType; 
  value: number | undefined; 
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
}) {
  const goalType = getGoalType(type);
  
  return (
    <div 
      className={cn(
        "space-y-3 p-4 rounded-lg border",
        type.deleted 
          ? "border-border/50 bg-muted/30" 
          : "border-border"
      )}
    >
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-2 h-2 rounded-full",
          goalType === 'negative' ? "bg-chart-1" : 
          goalType === 'positive' ? "bg-chart-2" : 
          "bg-chart-3"
        )} />
        <label className="text-sm font-medium text-foreground">
          {type.name}
        </label>
        {type.deleted && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            Archived
          </span>
        )}
      </div>
      <EntryInput
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled || type.deleted}
      />
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnsetTypes, setShowUnsetTypes] = useState(false);

  // Reset state when dialog opens with new data
  useEffect(() => {
    if (open) {
      const initialEntries: { [typeId: string]: number | undefined } = {};
      
      // Initialize with existing values
      if (existingActivity?.entries) {
        for (const typeId in existingActivity.entries) {
          initialEntries[typeId] = existingActivity.entries[typeId].value;
        }
      }
      
      setEntries(initialEntries);
      setShowUnsetTypes(false);
    }
  }, [open, existingActivity]);

  const handleEntryChange = (typeId: string, value: number | undefined) => {
    setEntries(prev => ({
      ...prev,
      [typeId]: value,
    }));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    
    try {
      const dateStr = formatDate(date);
      
      // Build entries object - include entries that were explicitly set (even if 0)
      // An entry is considered "set" if:
      // 1. It existed in the original activity, OR
      // 2. It has a value > 0 (user actively set it)
      const activityEntries: { [typeId: string]: ActivityEntry } = {};
      for (const typeId in entries) {
        const value = entries[typeId];
        const wasOriginallySet = existingActivity?.entries?.[typeId] !== undefined;
        const hasValue = value !== undefined && value > 0;
        
        // Include if it was originally set (preserve 0 values) or has a new value
        if (wasOriginallySet || hasValue) {
          activityEntries[typeId] = { typeId, value: value ?? 0 };
        }
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

  // Separate types into those that were set (in the original activity) and those that weren't
  // A type is "set" if it exists in existingActivity.entries, regardless of value
  const typesWithValues = allRelevantTypes.filter(type => {
    return existingActivity?.entries?.[type.id] !== undefined;
  });
  
  const typesWithoutValues = allRelevantTypes.filter(type => {
    return existingActivity?.entries?.[type.id] === undefined;
  });

  // Check if this is a new entry (no existing activity)
  const isNewEntry = !existingActivity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
          <DialogDescription>{formattedDate}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {activeTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No activity types defined yet.</p>
              <p className="text-sm">Add activity types in settings to start tracking.</p>
            </div>
          ) : isNewEntry ? (
            // For new entries, show all types
            <div className="space-y-4">
              {allRelevantTypes.map((type) => (
                <ActivityTypeCard
                  key={type.id}
                  type={type}
                  value={entries[type.id]}
                  onChange={(value) => handleEntryChange(type.id, value)}
                />
              ))}
            </div>
          ) : (
            // For existing entries, separate set and unset types
            <>
              {/* Types with values */}
              {typesWithValues.length > 0 && (
                <div className="space-y-4">
                  {typesWithValues.map((type) => (
                    <ActivityTypeCard
                      key={type.id}
                      type={type}
                      value={entries[type.id]}
                      onChange={(value) => handleEntryChange(type.id, value)}
                    />
                  ))}
                </div>
              )}

              {/* Accordion for unset types */}
              {typesWithoutValues.length > 0 && (
                <div className="border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => setShowUnsetTypes(!showUnsetTypes)}
                    className="w-full flex items-center justify-between py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>
                      {typesWithoutValues.length} more {typesWithoutValues.length === 1 ? 'activity' : 'activities'}
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
                    <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      {typesWithoutValues.map((type) => (
                        <ActivityTypeCard
                          key={type.id}
                          type={type}
                          value={entries[type.id]}
                          onChange={(value) => handleEntryChange(type.id, value)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Show message if no values are set yet */}
              {typesWithValues.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No activities logged yet. Expand below to add.
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {existingActivity && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
            >
              Delete Entry
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
