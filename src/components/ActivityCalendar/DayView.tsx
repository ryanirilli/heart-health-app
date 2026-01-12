"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { formatDate, ActivityEntry, Activity } from "@/lib/activities";
import { useActivities, useActivityTypes } from "./ActivityProvider";
import { formatDialogDate, ActivityViewCard } from "./ActivityFormContent";
import { DayContentView, DayContentEdit } from "./DayContent";
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
} from "@/components/ui/card";
import { Pencil, Loader2, Plus } from "lucide-react";
import { ActivityType } from "@/lib/activityTypes";
import { useGoals } from "@/components/Goals";

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

// Shared Add button component with dashed border style
export function AddButton({
  onClick,
  label = "Add",
  className,
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full py-8 rounded-xl",
        "border border-dashed border-muted-foreground/25",
        "bg-muted/30",
        "flex items-center justify-center gap-2",
        "text-muted-foreground",
        "hover:border-muted-foreground/40 hover:bg-muted/50",
        "transition-colors duration-200",
        "cursor-pointer",
        className
      )}
    >
      <Plus className="h-5 w-5" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

// Skeleton card for future dates
function SkeletonDayCard({ date }: { date: Date }) {
  return (
    <Card className="opacity-25">
      <CardHeader className="p-4 pt-4">
        <DateTile date={date} />
        <CardTitle className="text-sm font-medium text-muted-foreground mt-2">
          Tomorrow
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-2 pb-4">
        <div className="space-y-2">
          <div className="h-10 bg-muted rounded-lg animate-pulse" />
          <div className="h-10 bg-muted rounded-lg animate-pulse" />
          <div className="h-10 bg-muted rounded-lg animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

// Clickable skeleton card for future dates (next day preview)
function ClickableSkeletonDayCard({
  date,
  onClick,
}: {
  date: Date;
  onClick?: () => void;
}) {
  return (
    <Card
      className={cn(
        "opacity-25 transition-all duration-200",
        onClick && "cursor-not-allowed"
      )}
      onClick={onClick}
    >
      <CardHeader className="p-4 pt-4">
        <DateTile date={date} />
        <CardTitle className="text-sm font-medium text-muted-foreground mt-2">
          Tomorrow
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-2 pb-4">
        <div className="space-y-2">
          <div className="h-10 bg-muted rounded-lg animate-pulse" />
          <div className="h-10 bg-muted rounded-lg animate-pulse" />
          <div className="h-10 bg-muted rounded-lg animate-pulse" />
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
  return (
    <Card>
      <CardHeader className="p-4 pt-4">
        <DateTile date={date} />
      </CardHeader>
      <CardContent className="px-4 py-2 pb-4">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            No Activity
          </CardTitle>
        </div>
        <AddButton onClick={onLogActivity} />
      </CardContent>
    </Card>
  );
}

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
function CalendarTile({ date }: { date: Date }) {
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
function DateTile({ date }: { date: Date }) {
  const dayOfWeek = getDayOfWeek(date);

  return (
    <div className="flex items-center gap-3">
      <CalendarTile date={date} />
      <h2 className="text-2xl font-bold text-foreground tracking-tight">
        {dayOfWeek}
      </h2>
    </div>
  );
}

// Preview card for adjacent days (clickable to navigate)
function PreviewDayCard({
  date,
  activity,
  activityTypes,
  onClick,
}: {
  date: Date;
  activity: Activity | undefined;
  activityTypes: { [id: string]: ActivityType };
  onClick?: () => void;
}) {
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
    <Card
      className={cn(
        "opacity-50 transition-all duration-200",
        onClick && "cursor-pointer hover:opacity-80 hover:scale-[1.02]"
      )}
      onClick={onClick}
    >
      <CardHeader className="p-4 pt-4">
        <div className="flex flex-col items-start gap-2">
          <DateTile date={date} />
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {activity ? "Activity Summary" : "No Activity"}
            </CardTitle>
            {isCurrentlyToday && <Badge variant="today">Today</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 py-2 pb-4">
        {entriesWithTypes.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-xs">No activities logged.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entriesWithTypes.map(({ type, value }) => (
              <ActivityViewCard key={type.id} type={type} value={value} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
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
  const { activeTypes, activityTypes, openSettingsToAdd } = useActivityTypes();
  const { goals } = useGoals();

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

  const isNewEntry = !existingActivity;
  const isPending = isSaving || isDeleting;
  const title = mode === "view" ? "Activity Summary" : "Log Activity";

  // View mode content using shared component
  const viewContent = (
    <DayContentView
      dateStr={selectedDateStr}
      activity={existingActivity}
      activityTypes={activityTypes}
      goals={goals}
      onEditClick={() => setMode("edit")}
      fullBleedBorder={true}
      allActivities={activities}
    />
  );

  // Edit mode content using shared component
  const editContent = (
    <DayContentEdit
      dateStr={selectedDateStr}
      activity={existingActivity}
      activeTypes={activeTypes}
      activityTypes={activityTypes}
      entries={entries}
      trackedTypes={trackedTypes}
      onEntryChange={handleEntryChange}
      onToggleTracked={handleToggleTracked}
      onOpenSettings={openSettingsToAdd}
    />
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

  // Handle mobile swipe gesture
  const handleMobileDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset, velocity } = info;
      const swipeConfidenceThreshold = 10000;
      const swipePower = Math.abs(offset.x) * velocity.x;

      // Check if swipe is strong enough or far enough
      if (offset.x < -SWIPE_THRESHOLD || swipePower < -swipeConfidenceThreshold) {
        // Swiped Left -> Next Day (User moving forward in time)
        if (canGoNext) onNextDay();
      } else if (offset.x > SWIPE_THRESHOLD || swipePower > swipeConfidenceThreshold) {
        // Swiped Right -> Previous Day (User moving backward in time)
        onPreviousDay();
      }
    },
    [canGoNext, onNextDay, onPreviousDay]
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
    <Card className="relative">
      <CardHeader className="p-4 pt-4">
        <div className="absolute top-3 right-3">{editButton}</div>
        <DateTile date={selectedDate} />
      </CardHeader>

      <CardContent className="px-4 py-2 pb-4">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {isCurrentlyToday && <Badge variant="today">Today</Badge>}
        </div>
        {content}
      </CardContent>

      {footer && <CardFooter className="px-4 pt-4 pb-4">{footer}</CardFooter>}
    </Card>
  );

  // Animation config
  // slideDirection="left" = going forward in time (next day) = content enters from RIGHT
  // slideDirection="right" = going backward in time (prev day) = content enters from LEFT
  const slideOffset = 300;

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
      {/* Large screens: Three-column layout with animation */}
      <div className="hidden lg:block overflow-hidden">
        <AnimatePresence
          mode="popLayout"
          initial={false}
          custom={slideDirection}
        >
          <motion.div
            key={selectedDateStr}
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
              onClick={onPreviousDay}
            />

            {/* Current day (main interactive card) */}
            {mainCard}

            {/* Next day */}
            {isNextFuture ? (
              <ClickableSkeletonDayCard date={nextDate} />
            ) : (
              <PreviewDayCard
                date={nextDate}
                activity={nextActivity}
                activityTypes={activityTypes}
                onClick={canGoNext ? onNextDay : undefined}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Medium screens: Two-column layout (current + next day) */}
      <div className="hidden md:block lg:hidden overflow-hidden">
        <AnimatePresence
          mode="popLayout"
          initial={false}
          custom={slideDirection}
        >
          <motion.div
            key={selectedDateStr}
            custom={slideDirection}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            className="grid grid-cols-2 gap-4 items-start"
          >
            {/* Current day (main interactive card) */}
            {mainCard}

            {/* Next day */}
            {isNextFuture ? (
              <ClickableSkeletonDayCard date={nextDate} />
            ) : (
              <PreviewDayCard
                date={nextDate}
                activity={nextActivity}
                activityTypes={activityTypes}
                onClick={canGoNext ? onNextDay : undefined}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mobile: Single card with swipe gesture (flashcard-style animation) */}
      {/* Mobile: Single card with swipe gesture (flashcard-style animation) */}
      <div className="md:hidden overflow-hidden relative">
        <AnimatePresence
          mode="popLayout"
          initial={false}
          custom={slideDirection}
        >
          <motion.div
            key={selectedDateStr}
            custom={slideDirection}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            drag={canSwipe ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleMobileDragEnd}
            style={{
              touchAction: canSwipe ? "pan-y" : "auto",
            }}
          >
            {mainCard}
          </motion.div>
        </AnimatePresence>

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
