'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { formatDate, ActivityEntry } from '@/lib/activities';
import { useActivities, useActivityTypes } from './ActivityProvider';
import { 
  formatDialogDate, 
  ActivityTypeCard, 
  ActivityViewCard 
} from './ActivityFormContent';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useIsMobile } from '@/lib/hooks/useMediaQuery';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Pencil, ChevronDown, Loader2 } from 'lucide-react';

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

  // Track if this is the initial mount to skip animation
  const [isInitialMount, setIsInitialMount] = useState(true);
  
  // After first render, allow animations
  useEffect(() => {
    // Use a small timeout to ensure the initial render completes without animation
    const timer = setTimeout(() => {
      setIsInitialMount(false);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

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
          <Button
            variant="muted"
            size="sm"
            onClick={() => setMode('edit')}
            className="mt-4"
          >
            Add activities
          </Button>
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
              <Button
                variant="muted"
                size="sm"
                onClick={() => setShowUnsetTypes(!showUnsetTypes)}
                className="w-full justify-between"
              >
                <span>
                  {untrackedTypesList.length} untracked {untrackedTypesList.length === 1 ? 'activity' : 'activities'}
                </span>
                <ChevronDown 
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    showUnsetTypes && "rotate-180"
                  )}
                />
              </Button>
              
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
    <Button
      variant="outline"
      size="icon-sm"
      onClick={() => setMode('edit')}
      aria-label="Edit activity"
    >
      <Pencil className="h-3.5 w-3.5" />
    </Button>
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
        <Button
          variant="muted"
          size="sm"
          onClick={handleCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
      )}
      <Button
        size="pill"
        onClick={handleSave}
        disabled={activeTypes.length === 0 || isPending}
      >
        {isSaving ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </span>
        ) : 'Save'}
      </Button>
    </div>
  );

  const content = mode === 'view' ? viewContent : editContent;
  const footer = mode === 'view' ? null : editFooter;

  // Only enable drag/swipe on mobile when no activity items are open (tracked)
  // In view mode, always allow swipe. In edit mode, only allow if no items are being edited.
  const isMobile = useIsMobile();
  const hasOpenItems = mode === 'edit' && trackedTypes.size > 0;
  const canSwipe = isMobile && !hasOpenItems;

  return (
    <div className="relative overflow-hidden">
      {/* Swipeable Card with AnimatePresence for smooth transitions */}
      <AnimatePresence mode="popLayout" custom={slideDirection}>
        <motion.div
          key={selectedDateStr}
          custom={slideDirection}
          variants={slideVariants}
          initial={isInitialMount ? "center" : "enter"}
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          drag={canSwipe ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className={cn(canSwipe && "touch-none")}
        >
          <Card>
            <CardHeader className="relative flex-row items-start justify-between space-y-0 pb-2">
              <div className="flex-1 text-center md:text-left space-y-1">
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription className="flex items-center justify-center md:justify-start gap-2">
                  {formattedDate}
                  {isCurrentlyToday && (
                    <Badge variant="today">Today</Badge>
                  )}
                </CardDescription>
              </div>
              {editButton}
            </CardHeader>

            <CardContent className="py-2">
              {content}
            </CardContent>

            {footer && (
              <CardFooter className="pt-4">
                {footer}
              </CardFooter>
            )}
          </Card>
        </motion.div>
      </AnimatePresence>
      
      {/* Swipe hint - mobile only when swipe is enabled */}
      {canSwipe && (
        <div className="mt-4 text-center text-xs text-muted-foreground/50 md:hidden">
          Swipe to navigate between days
        </div>
      )}
    </div>
  );
}
