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
  /** @deprecated layoutId is no longer used - animations are handled internally */
  layoutId?: string;
  className?: string;
  size?: 'sm' | 'md';
  /** When true, buttons expand equally to fill container width */
  fullWidth?: boolean;
}

export function PillToggle<T extends string>({
  options,
  value,
  onValueChange,
  layoutId: _layoutId,
  className,
  size = 'md',
  fullWidth = false,
}: PillToggleProps<T>) {
  // layoutId is intentionally unused - it was causing animation issues
  // when drawers/modals with transforms were opened/closed
  void _layoutId;
  // Track optimistic value for immediate visual feedback during transitions
  const [optimisticValue, setOptimisticValue] = React.useState(value);
  
  // Refs for measuring button positions (only used when not fullWidth)
  const containerRef = React.useRef<HTMLDivElement>(null);
  const buttonRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = React.useState({ left: 0, width: 0 });
  
  // Sync optimistic value when actual value changes (transition completes)
  React.useEffect(() => {
    setOptimisticValue(value);
  }, [value]);

  // Measure button positions for non-fullWidth mode
  React.useEffect(() => {
    if (fullWidth) return;
    
    const activeIndex = options.findIndex(opt => opt.value === optimisticValue);
    const button = buttonRefs.current[activeIndex];
    const container = containerRef.current;
    
    if (button && container) {
      const containerRect = container.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      
      setIndicatorStyle({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
      });
    }
  }, [optimisticValue, options, fullWidth]);

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
      ref={containerRef}
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
        animate={fullWidth ? {
          // For fullWidth, use percentage-based positioning (equal-width buttons)
          left: `calc(${(activeIndex / options.length) * 100}% + 4px)`,
          width: `calc(${100 / options.length}% - 6px)`,
        } : {
          // For non-fullWidth, use measured pixel positions
          left: indicatorStyle.left,
          width: indicatorStyle.width,
        }}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
        style={{
          top: 4,
          bottom: 4,
        }}
      />
      
      {options.map((option, index) => {
        const isActive = optimisticValue === option.value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            ref={(el) => { buttonRefs.current[index] = el; }}
            onClick={() => handleClick(option.value)}
            className={cn(
              'relative z-10 flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
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

