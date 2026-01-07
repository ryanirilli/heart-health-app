'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ConfirmDeleteButtonProps {
  onDelete: (e?: React.MouseEvent) => void;
  disabled?: boolean;
  isDeleting?: boolean;
  /** Time in ms before confirmation resets (default: 3000) */
  confirmTimeout?: number;
  /** Label shown during confirmation state */
  confirmLabel?: string;
  /** If true, skips confirmation and deletes immediately on first click */
  bypassConfirm?: boolean;
  className?: string;
  /** Use div with role="button" instead of button element (for nesting inside buttons) */
  asDiv?: boolean;
}

export function ConfirmDeleteButton({
  onDelete,
  disabled = false,
  isDeleting = false,
  confirmTimeout = 3000,
  confirmLabel = 'Confirm?',
  bypassConfirm = false,
  className,
  asDiv = false,
}: ConfirmDeleteButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const buttonRef = useRef<HTMLButtonElement | HTMLDivElement | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // When confirming, listen for clicks outside the button to reset state
  useEffect(() => {
    if (!isConfirming) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        // Clicked outside - reset confirmation state
        setIsConfirming(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    };

    // Use capture phase to intercept before other handlers
    document.addEventListener('click', handleClickOutside, true);
    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [isConfirming]);

  const handleClick = (e: React.MouseEvent) => {
    // Always stop propagation to prevent parent handlers (e.g., accordion toggle)
    e.stopPropagation();
    
    if (disabled || isDeleting) return;

    // If bypassing confirmation, delete immediately
    if (bypassConfirm) {
      onDelete(e);
      return;
    }

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
      onDelete(e);
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

  const content = isDeleting ? (
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
  );

  const sharedProps = {
    onClick: handleClick,
    className: cn(
      "h-8 flex items-center justify-center rounded-full bg-transparent transition-all",
      (disabled || isDeleting) && "opacity-50 cursor-not-allowed",
      !disabled && !isDeleting && "cursor-pointer",
      isConfirming
        ? "px-3 bg-destructive text-destructive-foreground"
        : "w-8 text-destructive hover:bg-destructive/10",
      className
    ),
    'aria-label': isConfirming ? 'Click again to confirm delete' : 'Delete',
    title: isConfirming ? 'Click again to confirm' : 'Delete',
  };

  if (asDiv) {
    return (
      <div
        ref={buttonRef as React.RefObject<HTMLDivElement>}
        role="button"
        tabIndex={disabled || isDeleting ? -1 : 0}
        aria-disabled={disabled || isDeleting}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick(e as unknown as React.MouseEvent);
          }
        }}
        {...sharedProps}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      ref={buttonRef as React.RefObject<HTMLButtonElement>}
      type="button"
      disabled={disabled || isDeleting}
      {...sharedProps}
    >
      {content}
    </button>
  );
}

