"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { formatDate, ActivityEntry, Activity, hasActivityData } from "@/lib/activities";
import { useActivities, useActivityTypes } from "./ActivityProvider";
import { formatDialogDate, ActivityViewCard } from "./ActivityFormContent";
import { DayContentView, DayContentEdit } from "./DayContent";
import { CalendarTile, CalendarDateHeader } from "./CalendarDateHeader";
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
import { NoteEditorContent, NoteEditorFooter } from "./NoteEditor";
import { VoiceNoteEditorContent, VoiceNoteEditorFooter } from "./VoiceNoteEditor";
import { useVoiceNoteForDate } from "@/lib/hooks/useVoiceNotesQuery";
import { useFeatureFlag, FEATURE_FLAGS } from "@/lib/hooks/useFeatureFlag";
import { ActivitySuggestions } from "./ActivitySuggestions";
import { ExtractedActivity } from "@/lib/hooks/useVoiceNotesQuery";

type FormMode = "view" | "edit" | "note" | "voiceNote" | "activitySuggestions";

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
        <CalendarDateHeader date={date} />
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
        <CalendarDateHeader date={date} />
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
        <CalendarDateHeader date={date} />
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
          <CalendarDateHeader date={date} />
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
  const { activities, updateActivity, saveNote, deleteActivity, isSaving, isDeleting } =
    useActivities();
  const { activeTypes, activityTypes, openSettingsToAdd } = useActivityTypes();
  const { goals } = useGoals();
  
  // Feature flag for voice notes
  const voiceNotesEnabled = useFeatureFlag(FEATURE_FLAGS.VOICE_NOTES);

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
  // Note text for the note input mode
  const [noteText, setNoteText] = useState("");
  // Track animation direction for note mode transitions (1 = forward/right, -1 = back/left)
  const [noteSlideDirection, setNoteSlideDirection] = useState<1 | -1>(1);
  // Track the mode we came from when entering note or voice note mode
  const [modeBeforeNote, setModeBeforeNote] = useState<"view" | "edit">("view");
  // Voice note preview state (for save button in footer)
  const [hasVoiceNotePreview, setHasVoiceNotePreview] = useState(false);
  const voiceNotePreviewRef = useRef<{ blob: Blob; duration: number } | null>(null);

  // Reset state when selectedDate changes or activity data loads
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
    
    // Determine initial mode based on whether there are actual activity entries
    // (not just a note). For today/new entries, stay in edit mode.
    const hasActivityEntries = existingActivity?.entries && Object.keys(existingActivity.entries).length > 0;
    
    // Only reset mode if we're not in note/voiceNote/activitySuggestions mode (to preserve manual mode changes)
    // This prevents the effect from overriding mode changes when deleting notes/voice notes
    if (mode !== 'note' && mode !== 'voiceNote' && mode !== 'activitySuggestions') {
      setMode(hasActivityEntries ? "view" : "edit");
    }
    
    // Reset other state
    setShowPastDayForm(false);
    setNoteText(existingActivity?.note ?? "");
  }, [selectedDateStr, existingActivity]); // Don't add mode to dependencies - it would cause infinite loop

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
    // Switch to view mode after saving
    setMode("view");
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

  // Note mode handlers
  const handleOpenNoteMode = useCallback(() => {
    setNoteText(existingActivity?.note ?? "");
    setModeBeforeNote(mode as "view" | "edit"); // Remember where we came from
    setNoteSlideDirection(1); // Going forward (to note)
    setMode("note");
  }, [existingActivity?.note, mode]);

  const handleSaveNote = useCallback(() => {
    const trimmedNote = noteText.trim();
    saveNote(selectedDateStr, trimmedNote || undefined);
    setNoteSlideDirection(-1); // Going back
    setMode(modeBeforeNote); // Return to where we came from
  }, [noteText, saveNote, selectedDateStr, modeBeforeNote]);

  const handleCancelNote = useCallback(() => {
    setNoteText(existingActivity?.note ?? "");
    setNoteSlideDirection(-1); // Going back
    setMode(modeBeforeNote); // Return to where we came from
  }, [existingActivity?.note, modeBeforeNote]);

  const handleDeleteNote = useCallback(() => {
    saveNote(selectedDateStr, ""); // Empty string deletes the note
    setNoteText("");
    setNoteSlideDirection(-1); // Going back
    setMode(modeBeforeNote); // Return to where we came from
  }, [saveNote, selectedDateStr, modeBeforeNote]);

  // Voice note hook and handlers
  const {
    voiceNote: existingVoiceNote,
    saveVoiceNote,
    deleteVoiceNote,
    isSaving: isVoiceNoteSaving,
    isDeleting: isVoiceNoteDeleting,
  } = useVoiceNoteForDate(selectedDateStr);

  const handleOpenVoiceNoteMode = useCallback(() => {
    setModeBeforeNote(mode as "view" | "edit");
    setNoteSlideDirection(1); // Going forward
    setHasVoiceNotePreview(false);
    voiceNotePreviewRef.current = null;
    setMode("voiceNote");
  }, [mode]);

  const handleCancelVoiceNote = useCallback(() => {
    setNoteSlideDirection(-1); // Going back
    setHasVoiceNotePreview(false);
    voiceNotePreviewRef.current = null;
    setMode(modeBeforeNote);
  }, [modeBeforeNote]);

  const handleSaveVoiceNote = useCallback(async (audioBlob: Blob, durationSeconds: number) => {
    try {
      const result = await saveVoiceNote(audioBlob, durationSeconds);
      setHasVoiceNotePreview(false);
      voiceNotePreviewRef.current = null;

      // Check if we have extracted activities to show suggestions
      if (result?.extractedActivities && result.extractedActivities.activities.length > 0) {
        // Transition to activity suggestions mode
        setNoteSlideDirection(1); // Going forward to suggestions
        setMode("activitySuggestions");
      } else {
        // No activities extracted, just go back
        setNoteSlideDirection(-1); // Going back
        setMode(modeBeforeNote);
      }
    } catch (error) {
      console.error('Failed to save voice note:', error);
      // Still go back on error
      setHasVoiceNotePreview(false);
      voiceNotePreviewRef.current = null;
      setNoteSlideDirection(-1);
      setMode(modeBeforeNote);
    }
  }, [saveVoiceNote, modeBeforeNote, saveNote, selectedDateStr]);

  const handleDeleteVoiceNote = useCallback(async () => {
    await deleteVoiceNote();
    // Don't go back - stay in voice note mode so user can record a new one
    // Just clear the slide direction since we're not animating
    setNoteSlideDirection(1);
  }, [deleteVoiceNote]);

  // Callback to track when preview is available (for footer save button)
  const handleVoiceNotePreviewChange = useCallback((blob: Blob | null, duration: number) => {
    if (blob) {
      voiceNotePreviewRef.current = { blob, duration };
      setHasVoiceNotePreview(true);
    } else {
      voiceNotePreviewRef.current = null;
      setHasVoiceNotePreview(false);
    }
  }, []);

  const handleSaveVoiceNoteFromFooter = useCallback(async () => {
    if (voiceNotePreviewRef.current) {
      await handleSaveVoiceNote(voiceNotePreviewRef.current.blob, voiceNotePreviewRef.current.duration);
    }
  }, [handleSaveVoiceNote]);

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
      onNoteClick={handleOpenNoteMode}
      fullBleedBorder={true}
      allActivities={activities}
      voiceNoteUrl={existingVoiceNote?.signedUrl}
      voiceNoteDuration={existingVoiceNote?.durationSeconds}
      onVoiceNoteClick={voiceNotesEnabled ? handleOpenVoiceNoteMode : undefined}
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
      onNoteClick={handleOpenNoteMode}
      onVoiceNoteClick={voiceNotesEnabled ? handleOpenVoiceNoteMode : undefined}
      voiceNoteUrl={existingVoiceNote?.signedUrl}
      voiceNoteDuration={existingVoiceNote?.durationSeconds}
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
  // For today with no saved activity, only show Save (no Cancel/Delete)
  const showCancelDelete = hasActivityData(existingActivity) || showPastDayForm;
  const editFooter = (
    <div className="flex items-center justify-between gap-2 w-full">
      {showCancelDelete && existingActivity && (
        <ConfirmDeleteButton
          onDelete={handleDelete}
          disabled={isSaving}
          isDeleting={isDeleting}
        />
      )}
      <div className="flex-1" />
      {showCancelDelete && (
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

  // Note input content using shared component
  const noteContent = (
    <NoteEditorContent
      noteText={noteText}
      onNoteChange={setNoteText}
    />
  );

  // Note mode footer using shared component
  const noteFooter = (
    <NoteEditorFooter
      onCancel={handleCancelNote}
      onSave={handleSaveNote}
      onDelete={handleDeleteNote}
      hasExistingNote={!!existingActivity?.note}
      isSaving={isSaving}
      isDeleting={isDeleting}
    />
  );

  // Voice note content using VoiceNoteEditorContent
  const voiceNoteContent = (
    <VoiceNoteEditorContent
      existingAudioUrl={existingVoiceNote?.signedUrl}
      existingDuration={existingVoiceNote?.durationSeconds}
      existingTranscription={existingVoiceNote?.transcription}
      existingTranscriptionStatus={existingVoiceNote?.transcriptionStatus}
      onSave={handleSaveVoiceNote}
      onDelete={existingVoiceNote ? handleDeleteVoiceNote : undefined}
      isSaving={isVoiceNoteSaving}
      isDeleting={isVoiceNoteDeleting}
      onPreviewChange={handleVoiceNotePreviewChange}
    />
  );

  // Voice note mode footer
  const voiceNoteFooter = (
    <VoiceNoteEditorFooter
      onCancel={handleCancelVoiceNote}
      onSave={hasVoiceNotePreview ? handleSaveVoiceNoteFromFooter : undefined}
      onDelete={undefined} // Delete only available in header badge
      hasExistingVoiceNote={!!existingVoiceNote}
      hasPreview={hasVoiceNotePreview}
      isSaving={isVoiceNoteSaving}
      isDeleting={isVoiceNoteDeleting}
    />
  );

  // Activity suggestions handlers
  const handleAcceptSuggestions = useCallback(async (acceptedActivities: ExtractedActivity[]) => {
    // First, create any new activity types
    for (const activity of acceptedActivities) {
      if (activity.activityTypeId === null) {
        // Create new activity type
        try {
          const response = await fetch('/api/activity-types', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: crypto.randomUUID(),
              name: activity.suggestedName,
              unit: activity.suggestedUnit,
              pluralize: true,
              goalType: activity.suggestedGoalType,
              uiType: activity.suggestedUiType,
              order: Object.keys(activityTypes).length,
            }),
          });
          if (!response.ok) {
            console.error('Failed to create new activity type:', activity.suggestedName);
            continue;
          }
          const newType = await response.json();
          activity.activityTypeId = newType.id; // Update for use below
        } catch (error) {
          console.error('Error creating activity type:', error);
          continue;
        }
      }
    }

    // Apply accepted activities to entries state
    const newEntries = { ...entries };
    const newTracked = new Set(trackedTypes);

    for (const activity of acceptedActivities) {
      if (activity.activityTypeId) {
        newEntries[activity.activityTypeId] = activity.value;
        newTracked.add(activity.activityTypeId);
      }
    }

    setEntries(newEntries);
    setTrackedTypes(newTracked);

    // Apply extracted note if present but DO NOT save it as the main note
    // The user requested we don't overwrite the main note with the transcription
    if (existingVoiceNote?.extractedActivities?.note) {
      // We might want to use this localized state for something else, or just ignore it
      // For now, we won't update noteText or call saveNote
    }

    // Save the accepted activities to the database
    const activityEntries: { [typeId: string]: ActivityEntry } = {};
    for (const typeId of newTracked) {
      const value = newEntries[typeId] ?? 0;
      activityEntries[typeId] = { typeId, value };
    }
    await updateActivity(selectedDateStr, activityEntries);

    // Transition to view mode since activities are now saved
    setNoteSlideDirection(-1); // Going back
    setMode('view');
  }, [entries, trackedTypes, activityTypes, existingVoiceNote, saveNote, selectedDateStr, updateActivity]);

  const handleSkipSuggestions = useCallback(() => {
    // Just go back to previous mode

    setNoteSlideDirection(-1);
    setMode(modeBeforeNote);
  }, [existingVoiceNote, saveNote, selectedDateStr, modeBeforeNote]);

  // Activity suggestions content
  const activitySuggestionsContent = existingVoiceNote?.extractedActivities ? (
    <ActivitySuggestions
      extractedActivities={existingVoiceNote.extractedActivities}
      existingActivityTypes={activityTypes}
      onAcceptAll={handleAcceptSuggestions}
      onSkipAll={handleSkipSuggestions}
    />
  ) : null;

  // Determine if we should show the empty past day card
  // Show it for past days with no activity, unless user has clicked to log
  const shouldShowEmptyPastCard =
    isNewEntry && isCurrentlyPast && !showPastDayForm;

  // Select content based on mode
  const content =
    mode === "view" ? viewContent :
    mode === "note" ? noteContent :
    mode === "voiceNote" ? voiceNoteContent :
    mode === "activitySuggestions" ? activitySuggestionsContent :
    editContent;

  // Select footer based on mode
  // Hide footer when there are no activity types (show CTA instead) in edit mode
  const footer =
    mode === "view" ? null :
    mode === "note" ? noteFooter :
    mode === "voiceNote" ? voiceNoteFooter :
    mode === "activitySuggestions" ? null : // Suggestions component has its own footer
    activeTypes.length === 0 ? null : editFooter;

  // Only enable drag/swipe on mobile when no activity items are open (tracked) and not in note/voice note/suggestions mode
  const isMobile = useIsMobile();
  const hasOpenItems = mode === "edit" && trackedTypes.size > 0;
  const canSwipe = isMobile && !hasOpenItems && mode !== "note" && mode !== "voiceNote" && mode !== "activitySuggestions";

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
    <Card className="relative overflow-hidden">
      <CardHeader className="p-4 pt-4">
        <div className="absolute top-3 right-3 flex gap-1">
          {editButton}
        </div>
        <CalendarDateHeader
          date={selectedDate}
          title={
            mode === "note"
              ? (existingActivity?.note ? "Edit Note" : "Add Note")
              : mode === "voiceNote"
              ? (existingVoiceNote ? "Voice Note" : "Record Voice Note")
              : mode === "activitySuggestions"
              ? "Review Activity Suggestions"
              : title
          }
          badge={
            mode === "note" && existingActivity?.note ? (
              <ConfirmDeleteButton
                onDelete={handleDeleteNote}
                disabled={isSaving}
                isDeleting={isDeleting}
              />
            ) : isCurrentlyToday && mode !== "note" && mode !== "voiceNote" && mode !== "activitySuggestions" ? (
              <Badge variant="today">Today</Badge>
            ) : undefined
          }
        />
      </CardHeader>

      <CardContent className="px-4 py-2 pb-4">
        <AnimatePresence mode="popLayout" initial={false} custom={noteSlideDirection}>
          <motion.div
            key={mode === "note" ? "note" : mode === "voiceNote" ? "voiceNote" : mode === "activitySuggestions" ? "activitySuggestions" : "main"}
            custom={noteSlideDirection}
            variants={{
              initial: (direction: number) => ({ x: direction * 100, opacity: 0 }),
              animate: { x: 0, opacity: 1 },
              exit: (direction: number) => ({ x: direction * -100, opacity: 0 }),
            }}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ 
              duration: 0.7, 
              ease: [0.16, 1, 0.3, 1] // Custom ease-out with long tail
            }}
          >
            {content}
          </motion.div>
        </AnimatePresence>
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
