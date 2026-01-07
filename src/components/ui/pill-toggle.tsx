'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PillToggleOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface PillToggleProps<T extends string> {
  options: PillToggleOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  layoutId: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function PillToggle<T extends string>({
  options,
  value,
  onValueChange,
  layoutId,
  className,
  size = 'md',
}: PillToggleProps<T>) {
  // Track optimistic value for immediate visual feedback during transitions
  const [optimisticValue, setOptimisticValue] = React.useState(value);
  
  // Sync optimistic value when actual value changes (transition completes)
  React.useEffect(() => {
    setOptimisticValue(value);
  }, [value]);

  const handleClick = (newValue: T) => {
    // Update visual state immediately for smooth animation
    setOptimisticValue(newValue);
    // Then trigger the actual state change (may be wrapped in startTransition)
    onValueChange(newValue);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 rounded-full bg-muted p-1 border border-border',
        className
      )}
    >
      {options.map((option) => {
        const isActive = optimisticValue === option.value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            onClick={() => handleClick(option.value)}
            className={cn(
              'relative flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
              isActive
                ? 'text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-pressed={isActive}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 bg-primary rounded-full"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            {Icon && <Icon className={cn('relative z-10', size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} />}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

