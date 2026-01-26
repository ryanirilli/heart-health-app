import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ActivityEntry, formatDate, hasActivityData } from "@/lib/activities";
import { useActivities, useActivityTypes } from "./ActivityProvider";
import { useVoiceNoteForDate, ExtractedActivity } from "@/lib/hooks/useVoiceNotesQuery";
import { useCreateActivityType } from "@/lib/hooks/useActivityTypesQuery";
import { UIType } from "@/lib/activityTypes";

export type FormMode = "view" | "edit" | "note" | "voiceNote" | "activitySuggestions";

export function useDayActivity(date: Date) {
  const { activities, updateActivity, saveNote, deleteActivity, isSaving, isDeleting } = useActivities();
  const { activityTypes } = useActivityTypes();
  const createActivityTypeMutation = useCreateActivityType();

  const selectedDateStr = useMemo(() => formatDate(date), [date]);
  const existingActivity = activities[selectedDateStr];

  // State
  const [mode, setMode] = useState<FormMode>("edit");
  const [entries, setEntries] = useState<{ [typeId: string]: number | undefined }>({});
  const [trackedTypes, setTrackedTypes] = useState<Set<string>>(new Set());
  const [showPastDayForm, setShowPastDayForm] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSlideDirection, setNoteSlideDirection] = useState<1 | -1>(1);
  const [modeBeforeNote, setModeBeforeNote] = useState<"view" | "edit">("view");
  const [hasVoiceNotePreview, setHasVoiceNotePreview] = useState(false);
  const voiceNotePreviewRef = useRef<{ blob: Blob; duration: number } | null>(null);
  const [streamingStatus, setStreamingStatus] = useState<string | null>(null);

  // Ref to track current mode for effect usage without dependency
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Initialize state from existing activity
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

    // Initial mode determination logic
    // We only reset mode if generic entry conditions met, to avoid overriding user interaction
    // Only reset if NOT in a sub-flow (note/voice)
    const currentMode = modeRef.current;
    if (currentMode !== 'note' && currentMode !== 'voiceNote' && currentMode !== 'activitySuggestions') {
        const hasActivityEntries = existingActivity?.entries && Object.keys(existingActivity.entries).length > 0;
        setMode(hasActivityEntries ? "view" : "edit");
    }

    setShowPastDayForm(false);
    setNoteText(existingActivity?.note ?? "");
  }, [selectedDateStr, existingActivity]);

  // Voice Note Hook
  const {
    voiceNote: existingVoiceNote,
    saveVoiceNoteWithStreaming,
    deleteVoiceNote,
    isSaving: isVoiceNoteSaving,
    isDeleting: isVoiceNoteDeleting,
  } = useVoiceNoteForDate(selectedDateStr);

  // -- Handlers --

  const handleEntryChange = useCallback((typeId: string, value: number | undefined) => {
    setEntries((prev) => ({ ...prev, [typeId]: value }));
  }, []);

  const handleToggleTracked = useCallback((typeId: string, tracked: boolean) => {
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
  }, []);

  const handleSave = useCallback(async () => {
    const activityEntries: { [typeId: string]: ActivityEntry } = {};
    for (const typeId of trackedTypes) {
      const value = entries[typeId] ?? 0;
      activityEntries[typeId] = { typeId, value };
    }
    await updateActivity(selectedDateStr, activityEntries);
    setMode("view");
    setShowPastDayForm(false);
  }, [trackedTypes, entries, updateActivity, selectedDateStr]);

  const handleDelete = useCallback(() => {
    deleteActivity(selectedDateStr);
    // After delete, we might want to stay in edit mode or show empty view?
    // DayView logic implicitly shows empty view if !existingActivity
  }, [deleteActivity, selectedDateStr]);

  const handleCancel = useCallback(() => {
    if (existingActivity) {
      // Revert
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
      setShowPastDayForm(false);
      // For DayView this shows "EmptyPastDayCard". 
      // For Dialog this might mean closing the dialog? 
      // The hook doesn't control dialog open/close directly, but allows the consumer to know "cancel" happened.
      // We might need a "requestClose" callback or similar? 
      // Actually, for Dialog, handleCancel usually means "Close" if no data.
      // We can expose an "isEmpty" flag.
    }
  }, [existingActivity]);

  const handleLogPastDay = useCallback(() => {
    setShowPastDayForm(true);
    setMode("edit");
  }, []);

  // -- Note Handlers --

  const handleOpenNoteMode = useCallback(() => {
    setNoteText(existingActivity?.note ?? "");
    setModeBeforeNote(mode as "view" | "edit");
    setNoteSlideDirection(1);
    setMode("note");
  }, [existingActivity?.note, mode]);

  const handleSaveNote = useCallback(() => {
    const trimmedNote = noteText.trim();
    saveNote(selectedDateStr, trimmedNote || undefined);
    setNoteSlideDirection(-1);
    setMode(modeBeforeNote);
  }, [noteText, saveNote, selectedDateStr, modeBeforeNote]);

  const handleCancelNote = useCallback(() => {
    setNoteText(existingActivity?.note ?? "");
    setNoteSlideDirection(-1);
    setMode(modeBeforeNote);
  }, [existingActivity?.note, modeBeforeNote]);

  const handleDeleteNote = useCallback(() => {
    saveNote(selectedDateStr, "");
    setNoteText("");
    setNoteSlideDirection(-1);
    setMode(modeBeforeNote);
  }, [saveNote, selectedDateStr, modeBeforeNote]);

  // -- Voice Note Handlers --

  const handleOpenVoiceNoteMode = useCallback(() => {
    setModeBeforeNote(mode as "view" | "edit");
    setNoteSlideDirection(1);
    setHasVoiceNotePreview(false);
    voiceNotePreviewRef.current = null;
    setStreamingStatus(null);
    setMode("voiceNote");
  }, [mode]);

  const handleCancelVoiceNote = useCallback(() => {
    setNoteSlideDirection(-1);
    setHasVoiceNotePreview(false);
    voiceNotePreviewRef.current = null;
    setMode(modeBeforeNote);
  }, [modeBeforeNote]);

  const handleVoiceNotePreviewChange = useCallback((blob: Blob | null, duration: number) => {
    if (blob) {
      voiceNotePreviewRef.current = { blob, duration };
      setHasVoiceNotePreview(true);
    } else {
      voiceNotePreviewRef.current = null;
      setHasVoiceNotePreview(false);
    }
  }, []);

  const handleSaveVoiceNote = useCallback(async (audioBlob: Blob, durationSeconds: number) => {
    try {
      setStreamingStatus("Starting...");
      
      const result = await saveVoiceNoteWithStreaming(audioBlob, durationSeconds, (status) => {
        switch (status.status) {
          case 'uploading': setStreamingStatus("Uploading..."); break;
          case 'saving': setStreamingStatus("Saving..."); break;
          case 'transcribing': setStreamingStatus("Transcribing..."); break;
          case 'extracting': setStreamingStatus("Analyzing..."); break;
          case 'finalizing': setStreamingStatus("Finishing..."); break;
          case 'complete': setStreamingStatus("Done!"); break;
          case 'error': setStreamingStatus("Error"); break;
        }
      });
      
      setHasVoiceNotePreview(false);
      voiceNotePreviewRef.current = null;
      setStreamingStatus(null);

      if (result?.extractedActivities && result.extractedActivities.activities.length > 0) {
        setNoteSlideDirection(1);
        setMode("activitySuggestions");
      } else {
        setNoteSlideDirection(-1);
        setMode(modeBeforeNote);
      }
    } catch (error) {
      console.error('Failed to save voice note:', error);
      setHasVoiceNotePreview(false);
      voiceNotePreviewRef.current = null;
      setStreamingStatus(null);
      setNoteSlideDirection(-1);
      setMode(modeBeforeNote);
    }
  }, [saveVoiceNoteWithStreaming, modeBeforeNote]);

  const handleDeleteVoiceNote = useCallback(async () => {
    await deleteVoiceNote();
    setNoteSlideDirection(1); // Stay in/re-enter voice note mode logic
  }, [deleteVoiceNote]);

  const handleSaveVoiceNoteFromFooter = useCallback(async () => {
    if (voiceNotePreviewRef.current) {
      await handleSaveVoiceNote(voiceNotePreviewRef.current.blob, voiceNotePreviewRef.current.duration);
    }
  }, [handleSaveVoiceNote]);

  // -- Activity Suggestions Handlers --

  const handleAcceptSuggestions = useCallback(async (acceptedActivities: ExtractedActivity[]) => {
    // Create new types first
    for (const activity of acceptedActivities) {
      if (activity.activityTypeId === null) {
        try {
          const newTypeId = crypto.randomUUID();
          await createActivityTypeMutation.mutateAsync({
            id: newTypeId,
            name: activity.suggestedName,
            unit: activity.suggestedUnit,
            pluralize: true,
            goalType: activity.suggestedGoalType,
            uiType: activity.suggestedUiType as UIType,
            order: Object.keys(activityTypes).length,
            deleted: false,
          });
          activity.activityTypeId = newTypeId;
        } catch (error) {
          console.error('Error creating activity type:', error);
          continue;
        }
      }
    }

    // Merge entries
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

    // Save
    const activityEntries: { [typeId: string]: ActivityEntry } = {};
    for (const typeId of newTracked) {
      const value = newEntries[typeId] ?? 0;
      activityEntries[typeId] = { typeId, value };
    }
    await updateActivity(selectedDateStr, activityEntries);

    setNoteSlideDirection(-1);
    setMode('view');
  }, [entries, trackedTypes, activityTypes, selectedDateStr, updateActivity, createActivityTypeMutation]);

  const handleSkipSuggestions = useCallback(() => {
    setNoteSlideDirection(-1);
    setMode(modeBeforeNote);
  }, [modeBeforeNote]);

  return {
    // State
    selectedDateStr,
    existingActivity,
    mode, 
    setMode,
    entries,
    trackedTypes,
    showPastDayForm,
    noteText,
    setNoteText,
    noteSlideDirection,
    hasVoiceNotePreview,
    streamingStatus,
    
    // Derived
    existingVoiceNote,
    isSaving,
    isDeleting,
    isVoiceNoteSaving,
    isVoiceNoteDeleting,

    // Actions
    handleEntryChange,
    handleToggleTracked,
    handleSave,
    handleDelete,
    handleCancel,
    handleLogPastDay,
    
    // Note Actions
    handleOpenNoteMode,
    handleSaveNote,
    handleCancelNote,
    handleDeleteNote,
    
    // Voice Note Actions
    handleOpenVoiceNoteMode,
    handleCancelVoiceNote,
    handleVoiceNotePreviewChange,
    handleSaveVoiceNote,
    handleDeleteVoiceNote,
    handleSaveVoiceNoteFromFooter,
    
    // Suggestions Actions
    handleAcceptSuggestions,
    handleSkipSuggestions,
  };
}
