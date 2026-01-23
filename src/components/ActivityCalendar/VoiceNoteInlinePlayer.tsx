'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Play, Pause, Loader2 } from 'lucide-react';

interface VoiceNoteInlinePlayerProps {
  audioUrl: string;
  duration: number;
  className?: string;
}

/**
 * Inline voice note player component.
 * Shows play/pause button and waveform progress bar.
 */
export function VoiceNoteInlinePlayer({
  audioUrl,
  duration,
  className,
}: VoiceNoteInlinePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Format time as M:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Update progress during playback
  const updateProgress = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      const actualDuration = audioRef.current.duration;
      if (actualDuration && actualDuration > 0 && !isNaN(actualDuration)) {
        const progress = audioRef.current.currentTime / actualDuration;
        const currentTimeValue = audioRef.current.currentTime;

        // Update progress bar using transform (GPU accelerated)
        if (progressBarRef.current) {
          const scaleX = progress;
          progressBarRef.current.style.transform = `scaleX(${scaleX})`;
        }

        // Update state for time display
        setPlaybackProgress(progress);
        setCurrentTime(currentTimeValue);
      }
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleCanPlay = () => {
      setIsLoading(false);
      // If we're waiting to play and haven't started progress tracking yet, start it
      if (!audio.paused && !animationFrameRef.current) {
        updateProgress();
      }
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handlePlaying = () => {
      setIsLoading(false);
      if (!animationFrameRef.current) {
        updateProgress();
      }
    };

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);

    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
    };
  }, [updateProgress]);

  // Toggle play/pause
  const togglePlay = useCallback(async (e: React.MouseEvent) => {
    // Prevent the parent button click from firing
    e.stopPropagation();

    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      setIsLoading(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    } else {
      audioRef.current.currentTime = 0;
      setPlaybackProgress(0);
      setCurrentTime(0);
      // Reset progress bar directly
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = 'scaleX(0)';
      }
      setIsPlaying(true);
      setIsLoading(true);

      try {
        await audioRef.current.play();
        // Force start progress tracking immediately after play starts
        setIsLoading(false);
        updateProgress();
      } catch (error) {
        console.error('Failed to play audio:', error);
        setIsPlaying(false);
        setIsLoading(false);
      }
    }
  }, [isPlaying, updateProgress]);

  // Handle audio end
  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
    setIsLoading(false);
    setPlaybackProgress(0);
    setCurrentTime(0);
    // Reset progress bar directly
    if (progressBarRef.current) {
      progressBarRef.current.style.transform = 'scaleX(0)';
    }
  }, []);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onEnded={handleAudioEnded}
      />
      
      <button
        onClick={togglePlay}
        disabled={isLoading}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0",
          "bg-primary text-primary-foreground",
          "hover:bg-primary/90",
          "disabled:opacity-70"
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </button>
      
      <div className="flex-1 min-w-0">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            ref={progressBarRef}
            className="h-full w-full bg-primary origin-left"
            style={{
              transform: `scaleX(${playbackProgress})`,
              willChange: 'transform'
            }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
