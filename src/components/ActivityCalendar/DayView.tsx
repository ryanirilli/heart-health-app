'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { formatDate, ActivityEntry } from '@/lib/activities';
import { useActivities, useActivityTypes } from './ActivityProvider';
import { 
  formatDialogDate, 
  EntryInput, 
  ActivityTypeCard, 
  ActivityViewCard 
} from './ActivityFormContent';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useIsMobile } from '@/lib/hooks/useMediaQuery';

type FormMode = 'view' | 'edit';

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
  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
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
    },
    [canGoNext, onPreviousDay, onNextDay]
  );
  
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
            <div className={cn(trackedTypesList.length > 0 && "pt-2")}>
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
