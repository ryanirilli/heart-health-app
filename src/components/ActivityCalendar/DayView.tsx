'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { formatDate, Activity, ActivityEntry } from '@/lib/activities';
import { ActivityType, formatValueWithUnit, getGoalType, getButtonOptionLabel } from '@/lib/activityTypes';
import pluralizeLib from 'pluralize-esm';
const { plural } = pluralizeLib;
import { useActivities, useActivityTypes } from './ActivityProvider';
import { formatDialogDate } from './ActivityFormContent';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import { cn } from '@/lib/utils';
import { motion, PanInfo, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/lib/hooks/useMediaQuery';

type FormMode = 'view' | 'edit';

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
    const progress = ((currentValue - minValue) / (maxValue - minValue)) * 100;
    
    return (
      <div className="space-y-3">
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
          className="activity-slider"
          style={{ '--slider-progress': `${progress}%` } as React.CSSProperties}
        />
      </div>
    );
  }

  if (type.uiType === 'buttonGroup') {
    const options = type.buttonOptions ?? [];
    
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              if (currentValue === option.value) {
                onChange(0);
              } else {
                onChange(option.value);
              }
            }}
            disabled={disabled}
            className={cn(
              "flex-1 min-w-[80px] py-2.5 px-3 rounded-full border-2 text-sm font-medium transition-all",
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
      <div
        className={cn(
          "w-full flex items-center gap-2 p-4 text-left transition-colors",
          !isDisabled && !isTracked && "hover:bg-muted/50 cursor-pointer",
          isDisabled && "opacity-50"
        )}
        onClick={() => !isDisabled && !isTracked && onToggleTracked(true)}
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
          <ConfirmDeleteButton
            onDelete={() => onToggleTracked(false)}
            disabled={isDisabled}
            confirmLabel="Remove?"
          />
        )}
      </div>
      
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

function ActivityViewCard({ 
  type, 
  value 
}: { 
  type: ActivityType; 
  value: number;
}) {
  const goalType = getGoalType(type);
  
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

const SWIPE_THRESHOLD = 50;

// Helper to check if a date is today
function isToday(date: Date): boolean {
  const today = new Date();
  return date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
}

interface DayViewProps {
  selectedDate: Date;
  slideDirection: 'left' | 'right';
  onPreviousDay: () => void;
  onNextDay: () => void;
  canGoNext: boolean;
}

export function DayView({ 
  selectedDate, 
  slideDirection, 
  onPreviousDay, 
  onNextDay, 
  canGoNext 
}: DayViewProps) {
  const { activities, updateActivity, deleteActivity, isSaving, isDeleting } = useActivities();
  const { activeTypes, activityTypes } = useActivityTypes();
  
  const selectedDateStr = useMemo(() => formatDate(selectedDate), [selectedDate]);
  const existingActivity = activities[selectedDateStr];
  const formattedDate = formatDialogDate(selectedDate);
  
  const isCurrentlyToday = isToday(selectedDate);

  // All hooks must be called unconditionally
  const [mode, setMode] = useState<FormMode>('edit');
  const [entries, setEntries] = useState<{ [typeId: string]: number | undefined }>({});
  const [trackedTypes, setTrackedTypes] = useState<Set<string>>(new Set());
  const [showUnsetTypes, setShowUnsetTypes] = useState(false);

  // Reset state when existingActivity or selectedDate changes
  useEffect(() => {
    const initialEntries: { [typeId: string]: number | undefined } = {};
    const initialTracked = new Set<string>();
    
    if (existingActivity?.entries) {
      for (const typeId in existingActivity.entries) {
        initialEntries[typeId] = existingActivity.entries[typeId].value;
        initialTracked.add(typeId);
      }
    }
    
    setEntries(initialEntries);
    setTrackedTypes(initialTracked);
    setShowUnsetTypes(false);
    setMode(existingActivity ? 'view' : 'edit');
  }, [existingActivity, selectedDateStr]);
  
  // Handle swipe gesture completion (mobile only)
  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    const absX = Math.abs(offset.x);
    const absVelocity = Math.abs(velocity.x);
    
    // Consider both distance and velocity for swipe detection
    const isSwipe = absX > SWIPE_THRESHOLD || absVelocity > 500;
    
    if (isSwipe) {
      if (offset.x > 0) {
        // Swiped right → go to previous day (always allowed)
        onPreviousDay();
      } else {
        // Swiped left → go to next day (only if not at today)
        if (canGoNext) {
          onNextDay();
        }
      }
    }
  }, [canGoNext, onPreviousDay, onNextDay]);
  
  // Animation variants for AnimatePresence
  const slideVariants = {
    enter: (direction: 'left' | 'right') => ({
      x: direction === 'left' ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: 'left' | 'right') => ({
      x: direction === 'left' ? -300 : 300,
      opacity: 0,
    }),
  };

  const handleEntryChange = useCallback((typeId: string, value: number | undefined) => {
    setEntries(prev => ({
      ...prev,
      [typeId]: value,
    }));
  }, []);

  const handleToggleTracked = useCallback((typeId: string, tracked: boolean) => {
    setTrackedTypes(prev => {
      const next = new Set(prev);
      if (tracked) {
        next.add(typeId);
        setEntries(prevEntries => {
          if (prevEntries[typeId] === undefined) {
            return { ...prevEntries, [typeId]: 0 };
          }
          return prevEntries;
        });
      } else {
        next.delete(typeId);
      }
      return next;
    });
  }, []);

  const handleSave = useCallback(() => {
    const activityEntries: { [typeId: string]: ActivityEntry } = {};
    for (const typeId of trackedTypes) {
      const value = entries[typeId] ?? 0;
      activityEntries[typeId] = { typeId, value };
    }
    updateActivity(selectedDateStr, activityEntries);
  }, [trackedTypes, entries, updateActivity, selectedDateStr]);

  const handleDelete = useCallback(() => {
    deleteActivity(selectedDateStr);
  }, [deleteActivity, selectedDateStr]);

  const handleCancel = useCallback(() => {
    if (existingActivity) {
      const initialEntries: { [typeId: string]: number | undefined } = {};
      const initialTracked = new Set<string>();
      for (const typeId in existingActivity.entries) {
        initialEntries[typeId] = existingActivity.entries[typeId].value;
        initialTracked.add(typeId);
      }
      setEntries(initialEntries);
      setTrackedTypes(initialTracked);
      setMode('view');
    }
  }, [existingActivity]);

  // Compute derived values
  const typesWithExistingEntries = useMemo(() => {
    if (!existingActivity?.entries) return [];
    return Object.keys(existingActivity.entries)
      .map(typeId => activityTypes[typeId])
      .filter(Boolean);
  }, [existingActivity, activityTypes]);

  const allRelevantTypes = useMemo(() => [
    ...activeTypes,
    ...typesWithExistingEntries.filter(t => t.deleted && !activeTypes.find(at => at.id === t.id))
  ], [activeTypes, typesWithExistingEntries]);

  const isNewEntry = !existingActivity;
  const trackedTypesList = allRelevantTypes.filter(type => trackedTypes.has(type.id));
  const untrackedTypesList = allRelevantTypes.filter(type => !trackedTypes.has(type.id));

  const entriesWithTypes = useMemo(() => {
    if (!existingActivity?.entries) return [];
    return Object.entries(existingActivity.entries)
      .map(([typeId, entry]) => ({
        type: activityTypes[typeId],
        value: entry.value,
      }))
      .filter(item => item.type)
      .sort((a, b) => a.type.order - b.type.order);
  }, [existingActivity, activityTypes]);

  const isPending = isSaving || isDeleting;
  const title = mode === 'view' ? 'Activity Summary' : 'Log Activity';

  // View mode content
  const viewContent = (
    <div className="space-y-3">
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
  );

  // Edit mode content
  const editContent = (
    <div className="space-y-4">
      {activeTypes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No activity types defined yet.</p>
          <p className="text-sm">Add activity types in settings to start tracking.</p>
        </div>
      ) : isNewEntry ? (
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
        <>
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

          {trackedTypesList.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No activities logged yet. Expand above to add.
            </div>
          )}
        </>
      )}
    </div>
  );

  // Edit button for view mode
  const editButton = mode === 'view' && existingActivity ? (
    <button
      type="button"
      onClick={() => setMode('edit')}
      className="w-8 h-8 rounded-full border-2 border-border hover:border-foreground flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
      aria-label="Edit activity"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
        <path d="m15 5 4 4"/>
      </svg>
    </button>
  ) : null;

  // Edit mode footer
  const editFooter = (
    <div className="flex items-center justify-between gap-2 w-full">
      {existingActivity && (
        <ConfirmDeleteButton
          onDelete={handleDelete}
          disabled={isSaving}
          isDeleting={isDeleting}
        />
      )}
      <div className="flex-1" />
      {existingActivity && (
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      )}
      <button
        type="button"
        onClick={handleSave}
        disabled={activeTypes.length === 0 || isPending}
        className={cn(
          "px-6 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed",
          "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        {isSaving ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Saving...
          </span>
        ) : 'Save'}
      </button>
    </div>
  );

  const content = mode === 'view' ? viewContent : editContent;
  const footer = mode === 'view' ? null : editFooter;

  // Only enable drag/swipe on mobile
  const isMobile = useIsMobile();

  return (
    <div className="relative overflow-hidden">
      {/* Swipeable Card with AnimatePresence for smooth transitions */}
      <AnimatePresence mode="popLayout" custom={slideDirection}>
        <motion.div
          key={selectedDateStr}
          custom={slideDirection}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          drag={isMobile ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className={cn(
            "bg-card rounded-xl p-6 border border-border shadow-sm",
            isMobile && "touch-none"
          )}
        >
          <div className="space-y-4">
            {/* Header */}
            <div className="relative flex items-start justify-between">
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-lg font-semibold text-foreground">
                  {title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {formattedDate}
                  {isCurrentlyToday && (
                    <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      Today
                    </span>
                  )}
                </p>
              </div>
              {editButton}
            </div>

            {/* Content */}
            <div className="py-2">
              {content}
            </div>

            {/* Footer */}
            {footer && (
              <div className="pt-4 border-t border-border">
                {footer}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
      
      {/* Swipe hint - mobile only */}
      <div className="mt-4 text-center text-xs text-muted-foreground/50 md:hidden">
        Swipe to navigate between days
      </div>
    </div>
  );
}
