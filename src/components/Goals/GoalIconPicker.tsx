'use client';

import { cn } from '@/lib/utils';
import {
  GoalIcon,
  GOAL_ICONS,
  GOAL_ICON_LABELS,
  getGoalIconComponent,
} from '@/lib/goals';

interface GoalIconPickerProps {
  value: GoalIcon;
  onChange: (icon: GoalIcon) => void;
  className?: string;
}

export function GoalIconPicker({ value, onChange, className }: GoalIconPickerProps) {
  return (
    <div className={cn('grid grid-cols-4 gap-2', className)}>
      {GOAL_ICONS.map((iconKey) => {
        const IconComponent = getGoalIconComponent(iconKey);
        const isSelected = value === iconKey;

        return (
          <button
            key={iconKey}
            type="button"
            onClick={() => onChange(iconKey)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 transition-all',
              'hover:bg-accent hover:border-accent-foreground/20',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              isSelected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground'
            )}
            title={GOAL_ICON_LABELS[iconKey]}
          >
            <IconComponent className="h-5 w-5" />
            <span className="text-[10px] font-medium truncate w-full text-center">
              {GOAL_ICON_LABELS[iconKey]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

