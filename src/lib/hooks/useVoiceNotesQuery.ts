"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export interface VoiceNote {
  id: string;
  date: string;
  storagePath: string;
  durationSeconds: number;
  signedUrl?: string;
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
    deleteVoiceNote: remove,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Hook to get a single voice note for a specific date
export function useVoiceNoteForDate(date: string) {
  const { voiceNotes, isLoading, saveVoiceNote, deleteVoiceNote, isSaving, isDeleting } = useVoiceNotes();
  
  return {
    voiceNote: voiceNotes[date],
    isLoading,
    saveVoiceNote: (audioBlob: Blob, durationSeconds: number) => saveVoiceNote(date, audioBlob, durationSeconds),
    deleteVoiceNote: () => deleteVoiceNote(date),
    isSaving,
    isDeleting,
  };
}
