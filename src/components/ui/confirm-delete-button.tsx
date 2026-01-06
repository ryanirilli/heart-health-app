'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ConfirmDeleteButtonProps {
  onDelete: () => void;
  disabled?: boolean;
  isDeleting?: boolean;
  /** Time in ms before confirmation resets (default: 3000) */
  confirmTimeout?: number;
  /** Label shown during confirmation state */
  confirmLabel?: string;
  className?: string;
}

export function ConfirmDeleteButton({
  onDelete,
  disabled = false,
  isDeleting = false,
  confirmTimeout = 3000,
  confirmLabel = 'Confirm?',
  className,
}: ConfirmDeleteButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleClick = () => {
    if (disabled || isDeleting) return;

    if (!isConfirming) {
      // First click - show confirmation
      setIsConfirming(true);
      // Auto-reset after timeout
      timeoutRef.current = setTimeout(() => {
        setIsConfirming(false);
      }, confirmTimeout);
    } else {
      // Second click - actually delete
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      onDelete();
    }
  };

  // Reset confirmation state when disabled or deleting changes
  useEffect(() => {
    if (disabled || isDeleting) {
      setIsConfirming(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [disabled, isDeleting]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isDeleting}
      className={cn(
        "h-8 flex items-center justify-center rounded-full bg-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed",
        isConfirming
          ? "px-3 bg-destructive text-destructive-foreground"
          : "w-8 text-destructive hover:bg-destructive/10",
        className
      )}
      aria-label={isConfirming ? 'Click again to confirm delete' : 'Delete'}
      title={isConfirming ? 'Click again to confirm' : 'Delete'}
    >
      {isDeleting ? (
        <svg 
          className="animate-spin" 
          xmlns="http://www.w3.org/2000/svg" 
          width="18" 
          height="18" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      ) : isConfirming ? (
        <span className="flex items-center gap-1.5 px-1 text-sm font-medium">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M3 6h18"/>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            <line x1="10" x2="10" y1="11" y2="17"/>
            <line x1="14" x2="14" y1="11" y2="17"/>
          </svg>
          {confirmLabel}
        </span>
      ) : (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="18" 
          height="18" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M3 6h18"/>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          <line x1="10" x2="10" y1="11" y2="17"/>
          <line x1="14" x2="14" y1="11" y2="17"/>
        </svg>
      )}
    </button>
  );
}

