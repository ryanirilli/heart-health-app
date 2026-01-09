'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Goal,
  getGoalIconComponent,
  GOAL_DATE_TYPE_LABELS,
} from '@/lib/goals';
import { ActivityType, formatValueWithUnit } from '@/lib/activityTypes';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface GoalCardProps {
  goal: Goal;
  activityType?: ActivityType;
  onClick?: () => void;
}

export function GoalCard({ goal, activityType, onClick }: GoalCardProps) {
  const IconComponent = getGoalIconComponent(goal.icon);

  const formatDateInfo = () => {
    switch (goal.dateType) {
      case 'daily':
      case 'weekly':
      case 'monthly':
        return GOAL_DATE_TYPE_LABELS[goal.dateType];
      case 'by_date':
        return goal.targetDate 
          ? `By ${format(parseISO(goal.targetDate), 'MMM d, yyyy')}`
          : 'By date';
      case 'date_range':
        if (goal.startDate && goal.endDate) {
          return `${format(parseISO(goal.startDate), 'MMM d')} - ${format(parseISO(goal.endDate), 'MMM d, yyyy')}`;
        }
        return 'Date range';
      default:
        return '';
    }
  };

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
        'active:scale-[0.98]'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <IconComponent className="h-5 w-5 text-primary" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{goal.name}</h3>
            
            {/* Activity Type & Target */}
            <p className="text-xs text-muted-foreground mt-0.5">
              {activityType ? (
                activityType.uiType === 'buttonGroup' 
                  ? formatValueWithUnit(goal.targetValue, activityType)
                  : `${activityType.name}: ${formatValueWithUnit(goal.targetValue, activityType)}`
              ) : (
                `Target: ${goal.targetValue}`
              )}
            </p>
          </div>

          {/* Schedule Badge - right aligned */}
          <Badge variant="secondary" className="flex-shrink-0 text-[10px]">
            {formatDateInfo()}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

