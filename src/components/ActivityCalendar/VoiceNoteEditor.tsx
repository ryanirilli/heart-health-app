'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import { cn } from '@/lib/utils';
import { ArrowLeft, Mic, Square, Play, Pause, RotateCcw, Loader2 } from 'lucide-react';

// Maximum recording duration in seconds
export const MAX_VOICE_NOTE_DURATION = 60;

type VoiceNoteState = 'idle' | 'recording' | 'preview' | 'playing';

interface VoiceNoteEditorContentProps {
  existingAudioUrl?: string;
  existingDuration?: number;
  onSave: (audioBlob: Blob, durationSeconds: number) => Promise<void>;
  onDelete?: () => Promise<void>;
  isSaving?: boolean;
  isDeleting?: boolean;
  /** Callback when preview state changes - used by parent for footer save button */
  onPreviewChange?: (blob: Blob | null, duration: number) => void;
}

/**
 * Voice note editor content component.
 * Handles recording, preview, and playback in a slide-in panel.
 */
export function VoiceNoteEditorContent({
  existingAudioUrl,
  existingDuration,
  onSave,
  onDelete,
  isSaving = false,
  isDeleting = false,
  onPreviewChange,
}: VoiceNoteEditorContentProps) {
  // State
  const [state, setState] = useState<VoiceNoteState>(existingAudioUrl ? 'idle' : 'idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  // Ref to track current recording time (avoids stale closure in onstop callback)
  const recordingTimeRef = useRef(0);

  const isPending = isSaving || isDeleting;
  const hasExisting = !!existingAudioUrl;
  
  // Detect iOS non-Safari browsers (which don't support getUserMedia)
  const isIOSNonSafari = typeof navigator !== 'undefined' && 
    /iPad|iPhone|iPod/.test(navigator.userAgent) && 
    !(/Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(navigator.userAgent));

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [previewUrl]);

  // Format time as M:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        const url = URL.createObjectURL(blob);
        // Use ref for accurate time (state would be stale due to closure)
        const finalDuration = Math.max(1, recordingTimeRef.current); // At least 1 second
        setPreviewUrl(url);
        setPreviewBlob(blob);
        setPreviewDuration(finalDuration);
        setState('preview');
        
        // Notify parent that preview is available
        onPreviewChange?.(blob, finalDuration);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100);
      setState('recording');
      setRecordingTime(0);
      recordingTimeRef.current = 0;

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          recordingTimeRef.current = newTime; // Keep ref in sync
          if (newTime >= MAX_VOICE_NOTE_DURATION) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);

    } catch (err) {
      console.error('Failed to start recording:', err);
      
      // Provide specific error messages based on error type
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Microphone access denied. Please allow microphone access in your browser settings and try again.');
        } else if (err.name === 'NotFoundError') {
          setError('No microphone found. Please connect a microphone and try again.');
        } else if (err.name === 'NotSupportedError' || err.name === 'SecurityError') {
          // This typically happens when not on HTTPS
          setError('Voice recording requires a secure connection (HTTPS). Please ensure you\'re accessing the app via HTTPS.');
        } else {
          setError(`Microphone error: ${err.message}`);
        }
      } else {
        setError('Failed to access microphone. Please check your browser settings.');
      }
    }
  }, [onPreviewChange]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Retry recording
  const retryRecording = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewBlob(null);
    setPreviewDuration(0);
    setRecordingTime(0);
    setState('idle');
    // Notify parent that preview is cleared
    onPreviewChange?.(null, 0);
  }, [previewUrl, onPreviewChange]);

  // Play/pause preview
  const togglePlayPreview = useCallback(() => {
    if (!audioRef.current) return;

    if (state === 'playing') {
      audioRef.current.pause();
      setState('preview');
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    } else {
      audioRef.current.play();
      setState('playing');
      
      // Update progress
      const updateProgress = () => {
        if (audioRef.current) {
          setPlaybackProgress(audioRef.current.currentTime / audioRef.current.duration);
          if (!audioRef.current.paused) {
            animationFrameRef.current = requestAnimationFrame(updateProgress);
          }
        }
      };
      updateProgress();
    }
  }, [state]);

  // Play/pause existing audio
  const togglePlayExisting = useCallback(() => {
    if (!audioRef.current) return;

    if (state === 'playing') {
      audioRef.current.pause();
      setState('idle');
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setState('playing');
      
      const updateProgress = () => {
        if (audioRef.current) {
          setPlaybackProgress(audioRef.current.currentTime / audioRef.current.duration);
          if (!audioRef.current.paused) {
            animationFrameRef.current = requestAnimationFrame(updateProgress);
          }
        }
      };
      updateProgress();
    }
  }, [state]);

  // Handle audio end
  const handleAudioEnded = useCallback(() => {
    setState(previewUrl ? 'preview' : 'idle');
    setPlaybackProgress(0);
  }, [previewUrl]);

  // Save voice note
  const handleSave = useCallback(async () => {
    if (!previewBlob) return;
    await onSave(previewBlob, previewDuration);
    retryRecording(); // Reset state after save
  }, [previewBlob, previewDuration, onSave, retryRecording]);

  // Render existing voice note player
  if (hasExisting && !previewUrl) {
    return (
      <div className="space-y-4">
        <audio
          ref={audioRef}
          src={existingAudioUrl}
          onEnded={handleAudioEnded}
        />
        
        <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
          <button
            onClick={togglePlayExisting}
            disabled={isPending}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90",
              "disabled:opacity-50"
            )}
          >
            {state === 'playing' ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </button>
          
          <div className="flex-1">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-100"
                style={{ width: `${playbackProgress * 100}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {existingDuration ? formatTime(existingDuration) : '0:00'}
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground text-center">
          Delete this voice note to record a new one.
        </p>
      </div>
    );
  }

  // Render recording/preview UI
  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Idle state - record button */}
      {state === 'idle' && !previewUrl && (
        <div className="flex flex-col items-center gap-4 py-8">
          {isIOSNonSafari ? (
            <>
              <div className="w-20 h-20 rounded-full flex items-center justify-center bg-muted">
                <Mic className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center px-4">
                Voice recording is only supported in Safari on iOS. Please open this app in Safari to record voice notes.
              </p>
            </>
          ) : (
            <>
              <button
                onClick={startRecording}
                disabled={isPending}
                className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center transition-all",
                  "bg-primary text-primary-foreground",
                  "hover:bg-primary/90 hover:scale-105",
                  "disabled:opacity-50 disabled:hover:scale-100"
                )}
              >
                <Mic className="h-8 w-8" />
              </button>
              <p className="text-sm text-muted-foreground">
                Tap to record (max {MAX_VOICE_NOTE_DURATION}s)
              </p>
            </>
          )}
        </div>
      )}

      {/* Recording state */}
      {state === 'recording' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="relative">
            {/* Pulsing rings */}
            <div className="absolute inset-0 animate-ping rounded-full bg-destructive/30" style={{ animationDuration: '1.5s' }} />
            <div className="absolute inset-0 animate-ping rounded-full bg-destructive/20" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
            
            <button
              onClick={stopRecording}
              className={cn(
                "relative w-20 h-20 rounded-full flex items-center justify-center transition-all",
                "bg-destructive text-destructive-foreground",
                "hover:bg-destructive/90"
              )}
            >
              <Square className="h-6 w-6" />
            </button>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-mono font-bold">
              {formatTime(recordingTime)}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatTime(MAX_VOICE_NOTE_DURATION - recordingTime)} remaining
            </div>
          </div>
        </div>
      )}

      {/* Preview state */}
      {(state === 'preview' || state === 'playing') && previewUrl && (
        <div className="space-y-4">
          <audio
            ref={audioRef}
            src={previewUrl}
            onEnded={handleAudioEnded}
          />
          
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
            <button
              onClick={togglePlayPreview}
              disabled={isPending}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                "bg-primary text-primary-foreground",
                "hover:bg-primary/90",
                "disabled:opacity-50"
              )}
            >
              {state === 'playing' ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </button>
            
            <div className="flex-1">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-100"
                  style={{ width: `${playbackProgress * 100}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {formatTime(previewDuration)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={retryRecording}
              disabled={isPending}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface VoiceNoteEditorFooterProps {
  onCancel: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  hasExistingVoiceNote: boolean;
  hasPreview: boolean;
  isSaving?: boolean;
  isDeleting?: boolean;
}

/**
 * Voice note editor footer with Back, Delete, and Save buttons.
 */
export function VoiceNoteEditorFooter({
  onCancel,
  onSave,
  onDelete,
  hasExistingVoiceNote,
  hasPreview,
  isSaving = false,
  isDeleting = false,
}: VoiceNoteEditorFooterProps) {
  const isPending = isSaving || isDeleting;

  return (
    <div className="flex items-center justify-between gap-2 w-full">
      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        disabled={isPending}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>
      <div className="flex items-center gap-2">
        {hasExistingVoiceNote && onDelete && (
          <ConfirmDeleteButton
            onDelete={onDelete}
            disabled={isSaving}
            isDeleting={isDeleting}
          />
        )}
        {hasPreview && onSave && (
          <Button
            size="pill"
            onClick={onSave}
            disabled={isPending}
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
        )}
      </div>
    </div>
  );
}
