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
  fullWidth?: boolean;
}

export function PillToggle<T extends string>({
  options,
  value,
  onValueChange,
  layoutId,
  className,
  size = 'md',
  fullWidth = false,
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

  // Find the index of the active option for positioning the indicator
  const activeIndex = options.findIndex(opt => opt.value === optimisticValue);

  return (
    <div
      className={cn(
        'relative flex items-center gap-0.5 rounded-full bg-muted p-1 border border-border',
        fullWidth && 'w-full',
        className
      )}
    >
      {/* Animated background indicator */}
      <motion.div
        className="absolute bg-primary rounded-full"
        initial={false}
        animate={{
          left: `calc(${(activeIndex / options.length) * 100}% + 4px)`,
          width: `calc(${100 / options.length}% - 6px)`,
        }}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
        style={{
          top: 4,
          bottom: 4,
        }}
        layoutId={layoutId}
      />
      
      {options.map((option) => {
        const isActive = optimisticValue === option.value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            onClick={() => handleClick(option.value)}
            className={cn(
              'relative z-10 flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
              fullWidth && 'flex-1',
              isActive
                ? 'text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-pressed={isActive}
          >
            {Icon && <Icon className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} />}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

