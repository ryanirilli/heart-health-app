'use client';

import { useMemo } from 'react';
import { Star, Check, Clock, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Goal, 
  GoalMap, 
  getRelevantGoalsForDate, 
  isGoalMet, 
  getGoalIconComponent,
  getDaysUntilGoal,
  isGoalExpired,
  shouldShowGoalIndicator,
} from '@/lib/goals';
import { ActivityTypeMap, formatValueWithUnit } from '@/lib/activityTypes';
import { Activity } from '@/lib/activities';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGoals } from '@/components/Goals';

interface GoalStatusSectionProps {
  dateStr: string;
  goals: GoalMap;
  activityTypes: ActivityTypeMap;
  activity?: Activity;
}

type GoalDisplayStatus = 'met' | 'in_progress' | 'evaluation_day' | 'missed';

interface GoalWithStatus {
  goal: Goal;
  activityValue: number | undefined;
  displayStatus: GoalDisplayStatus;
  daysRemaining: number | null;
  isEvaluationDay: boolean;
}

export function GoalStatusSection({
  dateStr,
  goals,
  activityTypes,
  activity,
}: GoalStatusSectionProps) {
  const goalsWithStatus = useMemo(() => {
    const relevantGoals = getRelevantGoalsForDate(goals, dateStr);
    
    return relevantGoals.map((goal): GoalWithStatus => {
      const activityType = activityTypes[goal.activityTypeId];
      const activityValue = activity?.entries?.[goal.activityTypeId]?.value;
      const isMet = isGoalMet(goal, activityValue, activityType);
      const isEvaluationDay = shouldShowGoalIndicator(goal, dateStr);
      const expired = isGoalExpired(goal, dateStr);
      // Always calculate days remaining from today, not from the card's date
      const daysRemaining = getDaysUntilGoal(goal);
      
      let displayStatus: GoalDisplayStatus;
      if (isMet) {
        displayStatus = 'met';
      } else if (expired) {
        displayStatus = 'missed';
      } else if (isEvaluationDay) {
        displayStatus = 'evaluation_day';
      } else {
        displayStatus = 'in_progress';
      }
      
      return {
        goal,
        activityValue,
        displayStatus,
        daysRemaining,
        isEvaluationDay,
      };
    });
  }, [goals, dateStr, activity, activityTypes]);

  if (goalsWithStatus.length === 0) {
    return null;
  }

  // Count goals by status
  const metCount = goalsWithStatus.filter(g => g.displayStatus === 'met').length;
  const totalCount = goalsWithStatus.length;

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
        <span className="text-sm font-medium text-muted-foreground">
          Goals ({metCount}/{totalCount} on track)
        </span>
      </div>

      {/* Goal Items */}
      <div className="space-y-2">
        {goalsWithStatus.map(({ goal, activityValue, displayStatus, daysRemaining, isEvaluationDay }) => (
          <GoalStatusItem
            key={goal.id}
            goal={goal}
            activityValue={activityValue}
            displayStatus={displayStatus}
            daysRemaining={daysRemaining}
            isEvaluationDay={isEvaluationDay}
            activityType={activityTypes[goal.activityTypeId]}
          />
        ))}
      </div>
    </div>
  );
}

interface GoalStatusItemProps {
  goal: Goal;
  activityValue: number | undefined;
  displayStatus: GoalDisplayStatus;
  daysRemaining: number | null;
  isEvaluationDay: boolean;
  activityType?: ActivityTypeMap[string];
}

function GoalStatusItem({
  goal,
  activityValue,
  displayStatus,
  daysRemaining,
  isEvaluationDay,
  activityType,
}: GoalStatusItemProps) {
  const { openEditDialog } = useGoals();
  const IconComponent = getGoalIconComponent(goal.icon);

  const getStatusIcon = () => {
    switch (displayStatus) {
      case 'met':
        return <Check className="h-3.5 w-3.5" />;
      case 'missed':
        return <RefreshCw className="h-3.5 w-3.5" />;
      case 'evaluation_day':
        return <Star className="h-3.5 w-3.5" />;
      case 'in_progress':
      default:
        return <Clock className="h-3.5 w-3.5" />;
    }
  };

  const getStatusStyles = () => {
    switch (displayStatus) {
      case 'met':
        return {
          container: 'bg-green-500/10 border-green-500/30',
          statusIcon: 'bg-green-500 text-white',
          goalIcon: 'bg-green-500/20',
          goalIconColor: 'text-green-600',
          textColor: 'text-green-700 dark:text-green-400',
        };
      case 'missed':
        // Softer, more encouraging styling - not alarming red
        return {
          container: 'bg-slate-500/10 border-slate-500/30',
          statusIcon: 'bg-slate-500 text-white',
          goalIcon: 'bg-slate-500/20',
          goalIconColor: 'text-slate-600',
          textColor: 'text-slate-700 dark:text-slate-400',
        };
      case 'evaluation_day':
        return {
          container: 'bg-amber-500/10 border-amber-500/30',
          statusIcon: 'bg-amber-500 text-white',
          goalIcon: 'bg-amber-500/20',
          goalIconColor: 'text-amber-600',
          textColor: 'text-amber-700 dark:text-amber-400',
        };
      case 'in_progress':
      default:
        return {
          container: 'bg-muted/30 border-border',
          statusIcon: 'bg-muted text-muted-foreground',
          goalIcon: 'bg-muted',
          goalIconColor: 'text-muted-foreground',
          textColor: 'text-foreground',
        };
    }
  };

  const styles = getStatusStyles();

  const getSubtitle = () => {
    // For missed goals, show encouraging message
    if (displayStatus === 'missed') {
      return 'Ready to try again?';
    }
    
    // For "by_date" goals not on evaluation day, show countdown (always from today)
    if (goal.dateType === 'by_date' && daysRemaining !== null && !isEvaluationDay) {
      if (daysRemaining === 0) {
        return 'Due today';
      } else if (daysRemaining === 1) {
        return '1 day remaining';
      } else if (daysRemaining > 0) {
        return `${daysRemaining} days remaining`;
      }
    }

    // For evaluation days or other goal types, show progress
    if (activityType) {
      const currentValue = activityValue !== undefined 
        ? formatValueWithUnit(activityValue, activityType)
        : '0';
      const targetValue = formatValueWithUnit(goal.targetValue, activityType);
      return `${currentValue} / ${targetValue}`;
    }
    
    return `${activityValue ?? 0} / ${goal.targetValue}`;
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border',
        styles.container
      )}
    >
      {/* Status Icon */}
      <div className={cn(
        'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center',
        styles.statusIcon
      )}>
        {getStatusIcon()}
      </div>

      {/* Goal Icon */}
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
        styles.goalIcon
      )}>
        <IconComponent className={cn('h-4 w-4', styles.goalIconColor)} />
      </div>

      {/* Goal Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn('text-sm font-medium truncate', styles.textColor)}>
            {goal.name}
          </p>
          {isEvaluationDay && displayStatus !== 'met' && displayStatus !== 'missed' && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Evaluation Day
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {getSubtitle()}
        </p>
      </div>

      {/* Update Goal button for missed goals */}
      {displayStatus === 'missed' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => openEditDialog(goal)}
          className="flex-shrink-0 text-xs"
        >
          Update Goal
        </Button>
      )}
    </div>
  );
}
