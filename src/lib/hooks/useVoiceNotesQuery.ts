"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import posthog from "posthog-js";

export interface ExtractedActivity {
  activityTypeId: string | null;
  suggestedName: string;
  suggestedUnit: string;
  suggestedUiType: string;
  suggestedGoalType: 'positive' | 'negative' | 'neutral';
  value: number;
}

export interface ExtractedActivities {
  activities: ExtractedActivity[];
  note: string;
}

export interface VoiceNote {
  id: string;
  date: string;
  storagePath: string;
  durationSeconds: number;
  signedUrl?: string;
  transcription?: string;
  transcriptionStatus?: 'pending' | 'completed' | 'failed';
  extractedActivities?: ExtractedActivities;
}

export interface VoiceNoteMap {
  [date: string]: VoiceNote;
}

const VOICE_NOTES_QUERY_KEY = ["voice-notes"];

async function fetchVoiceNotes(): Promise<VoiceNoteMap> {
  const response = await fetch("/api/voice-notes");
  if (!response.ok) {
    throw new Error("Failed to fetch voice notes");
  }
  return response.json();
}

interface SaveVoiceNoteParams {
  date: string;
  audioBlob: Blob;
  durationSeconds: number;
}

export interface StreamingStatus {
  status: 'parsing' | 'uploading' | 'saving' | 'transcribing' | 'extracting' | 'finalizing' | 'complete' | 'error';
  message: string;
  data?: VoiceNote;
  statusCode?: number;
}

async function saveVoiceNote({ date, audioBlob, durationSeconds }: SaveVoiceNoteParams): Promise<VoiceNote> {
  const formData = new FormData();
  formData.append("date", date);
  formData.append("audio", audioBlob, `voice-note.${audioBlob.type.split('/')[1] || 'webm'}`);
  formData.append("duration", durationSeconds.toString());

  const response = await fetch("/api/voice-notes", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to save voice note");
  }

  return response.json();
}

/**
 * Stream-based voice note save that provides real-time status updates
 */
async function saveVoiceNoteWithStreaming(
  { date, audioBlob, durationSeconds }: SaveVoiceNoteParams,
  onStatusUpdate: (status: StreamingStatus) => void
): Promise<VoiceNote> {
  const fileExtension = audioBlob.type.split('/')[1] || 'webm';
  const startTime = performance.now();
  let lastStepTime = startTime;

  posthog.capture('voice_note_save_start', {
    date,
    duration: durationSeconds,
    fileSize: audioBlob.size,
    fileType: audioBlob.type,
  });

  const formData = new FormData();
  formData.append("date", date);
  formData.append("audio", audioBlob, `voice-note.${fileExtension}`);
  formData.append("duration", durationSeconds.toString());

  try {
    const response = await fetch("/api/voice-notes/stream", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to save voice note");
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let finalResult: VoiceNote | null = null;
    let lastStatus = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split('\n').filter(line => line.startsWith('data: '));

      for (const line of lines) {
        try {
          const jsonStr = line.replace('data: ', '');
          const status: StreamingStatus = JSON.parse(jsonStr);
          onStatusUpdate(status);

          // Track step duration
          if (status.status !== lastStatus) {
            const now = performance.now();
            const stepDuration = now - lastStepTime;
            
            if (lastStatus) {
                posthog.capture('voice_note_save_step_complete', {
                    step: lastStatus,
                    duration_ms: stepDuration,
                });
            }
            
            lastStatus = status.status;
            lastStepTime = now;
          }

          if (status.status === 'complete' && status.data) {
            finalResult = status.data;
            const totalDuration = performance.now() - startTime;
            posthog.capture('voice_note_save_complete', {
                total_duration_ms: totalDuration,
                audio_duration: durationSeconds,
            });
          } else if (status.status === 'error') {
            throw new Error(status.message);
          }
        } catch (e) {
          // Ignore parse errors for incomplete chunks
          if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
            throw e;
          }
        }
      }
    }

    if (!finalResult) {
      throw new Error("No result received from stream");
    }

    return finalResult;
  } catch (error) {
    const totalDuration = performance.now() - startTime;
    posthog.capture('voice_note_save_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        total_duration_ms: totalDuration,
    });
    throw error;
  }
}

async function deleteVoiceNote(date: string): Promise<void> {
  const response = await fetch(`/api/voice-notes?date=${encodeURIComponent(date)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete voice note");
  }
}

export function useVoiceNotes() {
  const queryClient = useQueryClient();

  // Query for fetching all voice notes
  const { data: voiceNotes = {}, isLoading } = useQuery<VoiceNoteMap>({
    queryKey: VOICE_NOTES_QUERY_KEY,
    queryFn: fetchVoiceNotes,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation for saving a voice note
  const saveMutation = useMutation({
    mutationFn: saveVoiceNote,
    onSuccess: (newVoiceNote) => {
      // Update cache with new voice note
      queryClient.setQueryData<VoiceNoteMap>(VOICE_NOTES_QUERY_KEY, (old) => ({
        ...old,
        [newVoiceNote.date]: newVoiceNote,
      }));
    },
    onError: (error) => {
      console.error("Failed to save voice note:", error);
    },
  });

  // Mutation for deleting a voice note
  const deleteMutation = useMutation({
    mutationFn: deleteVoiceNote,
    onMutate: async (date) => {
      // Optimistic update: remove from cache immediately
      await queryClient.cancelQueries({ queryKey: VOICE_NOTES_QUERY_KEY });
      const previousNotes = queryClient.getQueryData<VoiceNoteMap>(VOICE_NOTES_QUERY_KEY);
      
      queryClient.setQueryData<VoiceNoteMap>(VOICE_NOTES_QUERY_KEY, (old) => {
        if (!old) return {};
        const updated = { ...old };
        delete updated[date];
        return updated;
      });

      return { previousNotes };
    },
    onError: (error, date, context) => {
      console.error("Failed to delete voice note:", error);
      // Rollback on error
      if (context?.previousNotes) {
        queryClient.setQueryData(VOICE_NOTES_QUERY_KEY, context.previousNotes);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: VOICE_NOTES_QUERY_KEY });
    },
  });

  const save = useCallback(
    (date: string, audioBlob: Blob, durationSeconds: number) => {
      return saveMutation.mutateAsync({ date, audioBlob, durationSeconds });
    },
    [saveMutation]
  );

  // Streaming save with status callback
  const saveWithStreaming = useCallback(
    async (
      date: string,
      audioBlob: Blob,
      durationSeconds: number,
      onStatusUpdate: (status: StreamingStatus) => void
    ) => {
      const result = await saveVoiceNoteWithStreaming(
        { date, audioBlob, durationSeconds },
        onStatusUpdate
      );
      // Update cache with new voice note
      queryClient.setQueryData<VoiceNoteMap>(VOICE_NOTES_QUERY_KEY, (old) => ({
        ...old,
        [result.date]: result,
      }));
      return result;
    },
    [queryClient]
  );

  const remove = useCallback(
    (date: string) => {
      return deleteMutation.mutateAsync(date);
    },
    [deleteMutation]
  );

  return {
    voiceNotes,
    isLoading,
    saveVoiceNote: save,
    saveVoiceNoteWithStreaming: saveWithStreaming,
    deleteVoiceNote: remove,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Hook to get a single voice note for a specific date
export function useVoiceNoteForDate(date: string) {
  const { voiceNotes, isLoading, saveVoiceNote, saveVoiceNoteWithStreaming, deleteVoiceNote, isSaving, isDeleting } = useVoiceNotes();
  
  return {
    voiceNote: voiceNotes[date],
    isLoading,
    saveVoiceNote: (audioBlob: Blob, durationSeconds: number) => saveVoiceNote(date, audioBlob, durationSeconds),
    saveVoiceNoteWithStreaming: (
      audioBlob: Blob,
      durationSeconds: number,
      onStatusUpdate: (status: StreamingStatus) => void
    ) => saveVoiceNoteWithStreaming(date, audioBlob, durationSeconds, onStatusUpdate),
    deleteVoiceNote: () => deleteVoiceNote(date),
    isSaving,
    isDeleting,
  };
}
