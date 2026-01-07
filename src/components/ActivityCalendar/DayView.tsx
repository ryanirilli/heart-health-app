"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { formatDate, ActivityEntry, Activity } from "@/lib/activities";
import { useActivities, useActivityTypes } from "./ActivityProvider";
import {
  formatDialogDate,
  ActivityTypeCard,
  ActivityViewCard,
} from "./ActivityFormContent";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, PanInfo, useAnimation } from "framer-motion";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Pencil, Loader2, Settings, Plus } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ActivityType } from "@/lib/activityTypes";

type FormMode = "view" | "edit";

const SWIPE_THRESHOLD = 50;

// Helper to check if a date is today
function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

// Helper to check if a date is in the future
function isFuture(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate > today;
}

// Helper to check if a date is in the past (before today)
function isPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate < today;
}

// Helper to add days to a date
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Skeleton card for future dates
function SkeletonDayCard({ date }: { date: Date }) {
  const formattedDate = formatDialogDate(date);

  return (
    <Card className="opacity-25">
      <CardHeader className="p-4 pt-3">
        <CardTitle className="text-lg">Tomorrow</CardTitle>
        <CardDescription>{formattedDate}</CardDescription>
      </CardHeader>
      <CardContent className="px-4 py-2 pb-4">
        <div className="space-y-3">
          <div className="h-12 bg-muted rounded-lg animate-pulse" />
          <div className="h-12 bg-muted rounded-lg animate-pulse" />
          <div className="h-12 bg-muted rounded-lg animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

// Empty past day card - tap to log
function EmptyPastDayCard({
  date,
  onLogActivity,
}: {
  date: Date;
  onLogActivity: () => void;
}) {
  const formattedDate = formatDialogDate(date);

  return (
    <Card>
      <CardHeader className="p-4 pt-3">
        <CardTitle className="text-lg">No Activity</CardTitle>
        <CardDescription>{formattedDate}</CardDescription>
      </CardHeader>
      <CardContent className="px-4 py-2 pb-4">
        <button
          onClick={onLogActivity}
          className={cn(
            "w-full py-8 rounded-xl",
            "border-2 border-dashed border-muted-foreground/25",
            "bg-muted/30",
            "flex flex-col items-center justify-center gap-2",
            "text-muted-foreground",
            "hover:border-muted-foreground/40 hover:bg-muted/50",
            "transition-colors duration-200",
            "cursor-pointer"
          )}
        >
          <Plus className="h-6 w-6" />
          <span className="text-sm font-medium">Log activity for this day</span>
        </button>
      </CardContent>
    </Card>
  );
}

// Preview card for adjacent days (non-interactive)
function PreviewDayCard({
  date,
  activity,
  activityTypes,
}: {
  date: Date;
  activity: Activity | undefined;
  activityTypes: { [id: string]: ActivityType };
}) {
  const formattedDate = formatDialogDate(date);
  const isCurrentlyToday = isToday(date);

  const entriesWithTypes = useMemo(() => {
    if (!activity?.entries) return [];
    return Object.entries(activity.entries)
      .map(([typeId, entry]) => ({
        type: activityTypes[typeId],
        value: entry.value,
      }))
      .filter((item) => item.type)
      .sort((a, b) => a.type.order - b.type.order);
  }, [activity, activityTypes]);

  return (
    <Card className="opacity-30">
      <CardHeader className="p-4 pt-3">
        <CardTitle className="text-lg">
          {activity ? "Activity Summary" : "No Activity"}
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          {formattedDate}
          {isCurrentlyToday && <Badge variant="today">Today</Badge>}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 py-2 pb-4">
        {entriesWithTypes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No activities logged.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entriesWithTypes.map(({ type, value }) => (
              <ActivityViewCard key={type.id} type={type} value={value} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Empty state component when no activity types are defined
function EmptyActivityTypesState() {
  const { openSettingsToAdd } = useActivityTypes();

  return (
    <div className="text-center py-8">
      <p className="text-muted-foreground">No activity types defined yet.</p>
      <p className="text-sm text-muted-foreground mb-4">
        Add activity types to start tracking.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={openSettingsToAdd}
        className="gap-2 rounded-full"
      >
        <Settings className="h-4 w-4" />
        Add Activity Type
      </Button>
    </div>
  );
}

interface DayViewProps {
  selectedDate: Date;
  slideDirection: "left" | "right";
  onPreviousDay: () => void;
  onNextDay: () => void;
  canGoNext: boolean;
}

export function DayView({
  selectedDate,
  slideDirection,
  onPreviousDay,
  onNextDay,
  canGoNext,
}: DayViewProps) {
  const { activities, updateActivity, deleteActivity, isSaving, isDeleting } =
    useActivities();
  const { activeTypes, activityTypes } = useActivityTypes();

  const selectedDateStr = useMemo(
    () => formatDate(selectedDate),
    [selectedDate]
  );
  const existingActivity = activities[selectedDateStr];
  const formattedDate = formatDialogDate(selectedDate);

  const isCurrentlyToday = isToday(selectedDate);
  const isCurrentlyPast = isPast(selectedDate);

  // All hooks must be called unconditionally
  const [mode, setMode] = useState<FormMode>("edit");
  const [entries, setEntries] = useState<{
    [typeId: string]: number | undefined;
  }>({});
  const [trackedTypes, setTrackedTypes] = useState<Set<string>>(new Set());
  // Track if user explicitly wants to log activity for a past day with no existing activity
  const [showPastDayForm, setShowPastDayForm] = useState(false);

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
    setMode(existingActivity ? "view" : "edit");
    setShowPastDayForm(false); // Reset when navigating to a new day
  }, [existingActivity, selectedDateStr]);

  const handleEntryChange = useCallback(
    (typeId: string, value: number | undefined) => {
      setEntries((prev) => ({
        ...prev,
        [typeId]: value,
      }));
    },
    []
  );

  const handleToggleTracked = useCallback(
    (typeId: string, tracked: boolean) => {
      setTrackedTypes((prev) => {
        const next = new Set(prev);
        if (tracked) {
          next.add(typeId);
          setEntries((prevEntries) => {
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
    },
    []
  );

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
      setMode("view");
    } else {
      // For new entries on past days, hide the form and show the empty state again
      setShowPastDayForm(false);
    }
  }, [existingActivity]);

  const handleLogPastDay = useCallback(() => {
    setShowPastDayForm(true);
  }, []);

  // Compute derived values
  const typesWithExistingEntries = useMemo(() => {
    if (!existingActivity?.entries) return [];
    return Object.keys(existingActivity.entries)
      .map((typeId) => activityTypes[typeId])
      .filter(Boolean);
  }, [existingActivity, activityTypes]);

  const allRelevantTypes = useMemo(
    () => [
      ...activeTypes,
      ...typesWithExistingEntries.filter(
        (t) => t.deleted && !activeTypes.find((at) => at.id === t.id)
      ),
    ],
    [activeTypes, typesWithExistingEntries]
  );

  const isNewEntry = !existingActivity;
  const trackedTypesList = allRelevantTypes.filter((type) =>
    trackedTypes.has(type.id)
  );
  const untrackedTypesList = allRelevantTypes.filter(
    (type) => !trackedTypes.has(type.id)
  );

  const entriesWithTypes = useMemo(() => {
    if (!existingActivity?.entries) return [];
    return Object.entries(existingActivity.entries)
      .map(([typeId, entry]) => ({
        type: activityTypes[typeId],
        value: entry.value,
      }))
      .filter((item) => item.type)
      .sort((a, b) => a.type.order - b.type.order);
  }, [existingActivity, activityTypes]);

  const isPending = isSaving || isDeleting;
  const title = mode === "view" ? "Activity Summary" : "Log Activity";

  // View mode content
  const viewContent = (
    <div className="space-y-3">
      {entriesWithTypes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No activities logged for this day.</p>
          <Button
            variant="muted"
            size="sm"
            onClick={() => setMode("edit")}
            className="mt-4"
          >
            Add activities
          </Button>
        </div>
      ) : (
        entriesWithTypes.map(({ type, value }) => (
          <ActivityViewCard key={type.id} type={type} value={value} />
        ))
      )}
    </div>
  );

  // Edit mode content
  const editContent = (
    <div className="space-y-4">
      {activeTypes.length === 0 ? (
        <EmptyActivityTypesState />
      ) : isNewEntry ? (
        <div className="space-y-3">
          {allRelevantTypes.map((type) => (
            <ActivityTypeCard
              key={type.id}
              type={type}
              value={entries[type.id]}
              isTracked={trackedTypes.has(type.id)}
              onChange={(value) => handleEntryChange(type.id, value)}
              onToggleTracked={(tracked) =>
                handleToggleTracked(type.id, tracked)
              }
              isNewEntry={true}
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
                  onToggleTracked={(tracked) =>
                    handleToggleTracked(type.id, tracked)
                  }
                  isNewEntry={false}
                />
              ))}
            </div>
          )}

          {untrackedTypesList.length > 0 && (
            <Accordion
              type="single"
              collapsible
              className={cn(trackedTypesList.length > 0 && "pt-2")}
            >
              <AccordionItem value="untracked">
                <AccordionTrigger>
                  {untrackedTypesList.length} untracked{" "}
                  {untrackedTypesList.length === 1 ? "activity" : "activities"}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {untrackedTypesList.map((type) => (
                      <ActivityTypeCard
                        key={type.id}
                        type={type}
                        value={entries[type.id]}
                        isTracked={false}
                        onChange={(value) => handleEntryChange(type.id, value)}
                        onToggleTracked={(tracked) =>
                          handleToggleTracked(type.id, tracked)
                        }
                        isNewEntry={false}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
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
  const editButton =
    mode === "view" && existingActivity ? (
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => setMode("edit")}
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
      {(existingActivity || showPastDayForm) && (
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
        ) : (
          "Save"
        )}
      </Button>
    </div>
  );

  // Determine if we should show the empty past day card
  // Show it for past days with no activity, unless user has clicked to log
  const shouldShowEmptyPastCard =
    isNewEntry && isCurrentlyPast && !showPastDayForm;

  const content = mode === "view" ? viewContent : editContent;
  // Hide footer when there are no activity types (show CTA instead)
  const footer =
    mode === "view" || activeTypes.length === 0 ? null : editFooter;

  // Only enable drag/swipe on mobile when no activity items are open (tracked)
  const isMobile = useIsMobile();
  const hasOpenItems = mode === "edit" && trackedTypes.size > 0;
  const canSwipe = isMobile && !hasOpenItems;

  // Mobile swipe animation controls (similar to flashcard pattern)
  const mobileControls = useAnimation();

  // Initialize controls on mount
  useEffect(() => {
    mobileControls.set({ x: 0, y: 0, opacity: 1, rotate: 0 });
  }, [mobileControls]);

  // Handle mobile swipe gesture
  const handleMobileDragEnd = useCallback(
    async (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset } = info;
      const absX = Math.abs(offset.x);

      if (absX > SWIPE_THRESHOLD) {
        const isSwipeLeft = offset.x < 0;
        const isSwipeRight = offset.x > 0;

        // Check if we can navigate in the swiped direction
        if ((isSwipeLeft && !canGoNext) || (!isSwipeLeft && !isSwipeRight)) {
          // Can't navigate, spring back
          mobileControls.start({
            x: 0,
            rotate: 0,
            transition: { type: "spring", stiffness: 300 },
          });
          return;
        }

        // Animate card off screen
        await mobileControls.start({
          x: isSwipeLeft ? -window.innerWidth : window.innerWidth,
          rotate: isSwipeLeft ? -15 : 15,
          opacity: 0,
          transition: { duration: 0.25, ease: "easeIn" },
        });

        // Navigate to new day
        if (isSwipeRight) {
          onPreviousDay();
        } else if (isSwipeLeft && canGoNext) {
          onNextDay();
        }

        // Instantly reset position to opposite side (still hidden)
        mobileControls.set({
          x: isSwipeLeft ? window.innerWidth : -window.innerWidth,
          rotate: 0,
          opacity: 0,
        });

        // Animate new card in from the side
        await mobileControls.start({
          x: 0,
          opacity: 1,
          transition: { duration: 0.25, ease: "easeOut" },
        });
      } else {
        // Not enough swipe, spring back
        mobileControls.start({
          x: 0,
          rotate: 0,
          transition: { type: "spring", stiffness: 300 },
        });
      }
    },
    [canGoNext, mobileControls, onNextDay, onPreviousDay]
  );

  // Calculate previous and next dates for desktop preview
  const previousDate = useMemo(() => addDays(selectedDate, -1), [selectedDate]);
  const nextDate = useMemo(() => addDays(selectedDate, 1), [selectedDate]);
  const previousDateStr = formatDate(previousDate);
  const nextDateStr = formatDate(nextDate);
  const previousActivity = activities[previousDateStr];
  const nextActivity = activities[nextDateStr];
  const isNextFuture = isFuture(nextDate);

  // Main card content
  const mainCard = shouldShowEmptyPastCard ? (
    <EmptyPastDayCard date={selectedDate} onLogActivity={handleLogPastDay} />
  ) : (
    <Card>
      <CardHeader className="relative flex-row items-start justify-between space-y-0 p-4 pr-3 pt-3">
        <div className="flex-1 text-center md:text-left space-y-1">
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription className="flex items-center justify-center md:justify-start gap-2">
            {formattedDate}
            {isCurrentlyToday && <Badge variant="today">Today</Badge>}
          </CardDescription>
        </div>
        {editButton}
      </CardHeader>

      <CardContent className="px-4 py-2 pb-4">{content}</CardContent>

      {footer && <CardFooter className="px-4 pt-4 pb-4">{footer}</CardFooter>}
    </Card>
  );

  // Animation config
  // slideDirection="left" = going forward in time (next day) = content enters from RIGHT
  // slideDirection="right" = going backward in time (prev day) = content enters from LEFT
  const slideOffset = 300;

  // Create a composite key that includes the direction
  // This ensures each animation instance "remembers" its direction
  const animationKey = `${selectedDateStr}-${slideDirection}`;

  // Custom variants that respond to slideDirection passed via custom prop
  const variants = {
    enter: (direction: "left" | "right") => ({
      x: direction === "left" ? slideOffset : -slideOffset,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: "left" | "right") => ({
      x: direction === "left" ? -slideOffset : slideOffset,
      opacity: 0,
    }),
  };

  // Smooth spring animation
  const transition = {
    x: { type: "spring" as const, stiffness: 400, damping: 35 },
    opacity: { duration: 0.2 },
  };

  return (
    <>
      {/* Desktop: Three-column layout with animation */}
      <div className="hidden md:block overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={animationKey}
            custom={slideDirection}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            className="grid grid-cols-[1fr_1.2fr_1fr] gap-4 items-start"
          >
            {/* Previous day */}
            <PreviewDayCard
              date={previousDate}
              activity={previousActivity}
              activityTypes={activityTypes}
            />

            {/* Current day (main interactive card) */}
            {mainCard}

            {/* Next day */}
            {isNextFuture ? (
              <SkeletonDayCard date={nextDate} />
            ) : (
              <PreviewDayCard
                date={nextDate}
                activity={nextActivity}
                activityTypes={activityTypes}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mobile: Single card with swipe gesture (flashcard-style animation) */}
      <div className="md:hidden overflow-hidden relative">
        <motion.div
          animate={mobileControls}
          drag={canSwipe ? "x" : false}
          onDragEnd={handleMobileDragEnd}
          className="touch-none"
          style={{
            touchAction: canSwipe ? "pan-y" : "auto",
          }}
        >
          {mainCard}
        </motion.div>

        {/* Swipe hint */}
        {canSwipe && (
          <div className="mt-4 text-center text-xs text-muted-foreground/50">
            Swipe to navigate between days
          </div>
        )}
      </div>
    </>
  );
}
