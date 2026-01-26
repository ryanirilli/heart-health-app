"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Activity, ActivityEntry, hasActivityData, formatDate } from "@/lib/activities";
import { useActivityTypes, useActivities } from "./ActivityProvider";
import { useGoals } from "@/components/Goals";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";
import { formatDialogDate } from "./ActivityFormContent";
import { DayContentView, DayContentEdit } from "./DayContent";
import { CalendarDateHeader } from "./CalendarDateHeader";
import { NoteEditorContent, NoteEditorFooter } from "./NoteEditor";
import { Button } from "@/components/ui/button";
import { Pencil, Loader2 } from "lucide-react";
import { useDayActivity } from "./useDayActivity";
import { VoiceNoteEditorContent, VoiceNoteEditorFooter } from "./VoiceNoteEditor";
import { ActivitySuggestions } from "./ActivitySuggestions";
import { ExtractedActivity } from "@/lib/hooks/useVoiceNotesQuery";
import { UIType } from "@/lib/activityTypes";
import { ActivityContentAnimator } from "./ActivityContentAnimator";

interface ActivityEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  existingActivity?: Activity; // Kept for interface compatibility but hook loads it
  onSave?: (date: string, entries: { [typeId: string]: ActivityEntry }) => void; // Deprecated/Unused
  onDelete?: () => void; // Deprecated/Unused
  isSaving?: boolean;
  isDeleting?: boolean;
}

export function ActivityEntryDialog(props: ActivityEntryDialogProps) {
  const isMobile = useIsMobile();

  // We conditionally render the inner form only when open to prevent
  // 365 instances of useDayActivity (and its queries) running simultaneously.
  // The Dialog/Drawer wrapper stays mounted but content is conditional.

  if (isMobile) {
    return (
      <Drawer open={props.open} onOpenChange={props.onOpenChange}>
        <DrawerContent className="max-h-[85vh] flex flex-col">
           {props.open && <ActivityEntryForm {...props} isMobile={true} />}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        className="sm:max-w-md max-h-[85vh] overflow-y-auto flex flex-col"
        hideCloseButton
      >
        {props.open && <ActivityEntryForm {...props} isMobile={false} />}
      </DialogContent>
    </Dialog>
  );
}

function ActivityEntryForm({
  date,
  onOpenChange,
  isMobile
}: ActivityEntryDialogProps & { isMobile: boolean }) {
  const { activities } = useActivities();
  const { activeTypes, activityTypes, openSettingsToAdd } = useActivityTypes();
  const { goals } = useGoals();

  const formattedDate = formatDialogDate(date);

  // Hook handles all data/state
  const {
      selectedDateStr,
      existingActivity,
      mode,
      entries,
      trackedTypes,
      noteText,
      setNoteText,
      setMode,
      noteSlideDirection,
      
      existingVoiceNote,
      isSaving,
      isDeleting,
      isVoiceNoteSaving,
      isVoiceNoteDeleting,
      streamingStatus,
      hasVoiceNotePreview,
      
      handleEntryChange,
      handleToggleTracked,
      handleSave,
      handleDelete,
      handleCancel,
      
      handleOpenNoteMode,
      handleSaveNote,
      handleCancelNote,
      handleDeleteNote,
      
      handleOpenVoiceNoteMode,
      handleCancelVoiceNote,
      handleVoiceNotePreviewChange,
      handleSaveVoiceNote,
      handleDeleteVoiceNote,
      handleSaveVoiceNoteFromFooter,
      
      handleAcceptSuggestions,
      handleSkipSuggestions
  } = useDayActivity(date);

  const isPending = isSaving || isDeleting;
  
  // Custom wrapper for Save to close dialog on successful save
  const handleSaveWrapper = async () => {
    await handleSave();
    onOpenChange(false);
  };
  
  // Custom wrapper for Cancel
  // If editing an existing activity, cancel resets changes (stays open in view mode or closes?)
  // DayView behavior: stays in Mode View.
  // Dialog behavior: Maybe user expects it to close or go to View mode.
  // Let's mimic DayView: Go to View mode. 
  // But if it was New Entry, DayView hides form. Dialog should Close.
  const handleCancelWrapper = () => {
    handleCancel(); // Hook resets state / sets mode
    if (!existingActivity) {
      onOpenChange(false);
    }
  };

  const hasData = hasActivityData(existingActivity);

  // Title Logic
  const getTitle = () => {
    if (mode === "note") return existingActivity?.note ? "Edit Note" : "Add Note";
    if (mode === "voiceNote") return existingVoiceNote ? "Voice Note" : "Record Voice Note";
    if (mode === "activitySuggestions") return "Review Suggestions";
    return mode === "view" ? "Activity Summary" : "Log Activity";
  };
  const title = getTitle();

  // -- Content Components --

  const viewContent = (
    <DayContentView
      dateStr={selectedDateStr}
      activity={existingActivity}
      activityTypes={activityTypes}
      goals={goals}
      onEditClick={() => setMode("edit")}
      onNoteClick={handleOpenNoteMode}
      fullBleedBorder={true}
      containerPadding={isMobile ? 4 : 6}
      allActivities={activities}
      voiceNoteUrl={existingVoiceNote?.signedUrl}
      voiceNoteDuration={existingVoiceNote?.durationSeconds}
      onVoiceNoteClick={handleOpenVoiceNoteMode}
    />
  );

  const editContent = (
    <div className="space-y-4 py-4">
      <DayContentEdit
        dateStr={selectedDateStr}
        activity={existingActivity}
        activeTypes={activeTypes}
        activityTypes={activityTypes}
        entries={entries}
        trackedTypes={trackedTypes}
        onEntryChange={handleEntryChange}
        onToggleTracked={handleToggleTracked}
        onOpenSettings={() => {
            // Close dialog to go to settings? Or just navigate?
            // openSettingsToAdd navigates to settings page likely.
            onOpenChange(false);
            openSettingsToAdd();
        }}
        onNoteClick={handleOpenNoteMode}
        onVoiceNoteClick={handleOpenVoiceNoteMode}
        voiceNoteUrl={existingVoiceNote?.signedUrl}
        voiceNoteDuration={existingVoiceNote?.durationSeconds}
      />
    </div>
  );

  const noteContent = (
    <div className="space-y-4 py-4">
      <NoteEditorContent
        noteText={noteText}
        onNoteChange={setNoteText}
      />
    </div>
  );

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

  const activitySuggestionsContent = existingVoiceNote?.extractedActivities ? (
    <ActivitySuggestions
      extractedActivities={existingVoiceNote.extractedActivities}
      existingActivityTypes={activityTypes}
      onAcceptAll={handleAcceptSuggestions}
      onSkipAll={handleSkipSuggestions}
    />
  ) : null;

  // -- Footers --

  const editFooter = (
    <div className="flex items-center justify-between gap-2 w-full">
      {hasData && (
        <ConfirmDeleteButton
          onDelete={handleDelete}
          disabled={isSaving}
          isDeleting={isDeleting}
        />
      )}
      <div className="flex-1" />
      {hasData && (
        <Button
          variant="muted"
          size="sm"
          onClick={handleCancelWrapper} // Use Wrapper
          disabled={isPending}
        >
          Cancel
        </Button>
      )}
      <Button
        size="pill"
        onClick={handleSaveWrapper} // Use Wrapper
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

  const voiceNoteFooter = (
    <VoiceNoteEditorFooter
      onCancel={handleCancelVoiceNote}
      onSave={hasVoiceNotePreview ? handleSaveVoiceNoteFromFooter : undefined}
      onDelete={undefined}
      hasExistingVoiceNote={!!existingVoiceNote}
      hasPreview={hasVoiceNotePreview}
      isSaving={isVoiceNoteSaving || !!streamingStatus}
      isDeleting={isVoiceNoteDeleting}
      streamingStatus={streamingStatus}
    />
  );

  // -- Selection Logic --

  const content =
    mode === "view" ? viewContent :
    mode === "note" ? noteContent :
    mode === "voiceNote" ? voiceNoteContent :
    mode === "activitySuggestions" ? activitySuggestionsContent :
    editContent;

  const footer =
    mode === "view" ? null :
    mode === "note" ? noteFooter :
    mode === "voiceNote" ? voiceNoteFooter :
    mode === "activitySuggestions" ? null :
    activeTypes.length === 0 ? null : editFooter;

  // Header Elements
  const editIconButton = mode === "view" && hasData ? (
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => setMode("edit")}
        className="absolute right-4 top-4"
        aria-label="Edit activity"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    ) : null;

  // Render
  const headerContent = (
    <div className="relative">
      <CalendarDateHeader 
        date={date}
        title={title}
      />
      <span className="sr-only">{formattedDate}</span>
      {editIconButton}
    </div>
  );

  if (isMobile) {
     return (
        <>
            <DrawerHeader className="text-left pb-2">
                <DrawerTitle className="sr-only">{title}</DrawerTitle>
                {headerContent}
            </DrawerHeader>
            <div className={`px-4 overflow-y-auto flex-1 ${!footer ? 'pb-4' : ''}`}>
                <ActivityContentAnimator mode={mode} customDirection={noteSlideDirection}>
                    {content}
                </ActivityContentAnimator>
            </div>
            {footer && <DrawerFooter className="flex-row">{footer}</DrawerFooter>}
        </>
     )
  }

  // Desktop
  return (
    <>
        <DialogHeader className="pb-2">
            <DialogTitle className="sr-only">{title}</DialogTitle>
            {headerContent}
        </DialogHeader>
        <ActivityContentAnimator mode={mode} customDirection={noteSlideDirection}>
             {content}
        </ActivityContentAnimator>
        {footer && <DialogFooter className="flex-row items-center p-0 pt-2">{footer}</DialogFooter>}
    </>
  );
}

