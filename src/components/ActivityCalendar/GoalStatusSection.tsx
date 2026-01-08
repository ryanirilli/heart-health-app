'use client';

import { useMemo } from 'react';
import { Star, Check, Clock, Ban } from 'lucide-react';
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
import { ActivityTypeMap, formatValueWithUnit, getGoalType } from '@/lib/activityTypes';
import { Activity, ActivityMap } from '@/lib/activities';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGoals } from '@/components/Goals';

interface GoalStatusSectionProps {
  dateStr: string;
  goals: GoalMap;
  activityTypes: ActivityTypeMap;
  activity?: Activity;
  /** All activities - needed for cumulative goal calculations */
  allActivities?: ActivityMap;
}

type GoalDisplayStatus = 'met' | 'in_progress' | 'evaluation_day' | 'missed';

interface GoalWithStatus {
  goal: Goal;
  activityValue: number | undefined;
  displayStatus: GoalDisplayStatus;
  daysRemaining: number | null;
  isEvaluationDay: boolean;
}

/**
 * Calculate cumulative value for a goal from creation date to today.
 * Used for "by_date" goals to check if the goal is still achievable.
 */
function getCumulativeValue(
  goal: Goal,
  allActivities: ActivityMap | undefined
): number {
  if (!allActivities || !goal.createdAt) return 0;
  
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  let total = 0;
  for (const [dateStr, activity] of Object.entries(allActivities)) {
    // Only count activities from goal creation to today
    if (dateStr >= goal.createdAt && dateStr <= todayStr) {
      const value = activity.entries?.[goal.activityTypeId]?.value;
      if (value !== undefined) {
        total += value;
      }
    }
  }
  return total;
}

export function GoalStatusSection({
  dateStr,
  goals,
  activityTypes,
  activity,
  allActivities,
}: GoalStatusSectionProps) {
  const goalsWithStatus = useMemo(() => {
    const relevantGoals = getRelevantGoalsForDate(goals, dateStr);
    
    return relevantGoals.map((goal): GoalWithStatus => {
      const activityType = activityTypes[goal.activityTypeId];
      const activityValue = activity?.entries?.[goal.activityTypeId]?.value;
      const isEvaluationDay = shouldShowGoalIndicator(goal, dateStr);
      // Check if expired relative to TODAY (not the card's date)
      const expired = isGoalExpired(goal);
      // Always calculate days remaining from today, not from the card's date
      const daysRemaining = getDaysUntilGoal(goal);
      
      // Determine goal status based on goal type
      let isMet = false;
      let isFailed = false;
      
      if (goal.dateType === 'by_date' && activityType) {
        const goalType = getGoalType(activityType);
        const cumulativeValue = getCumulativeValue(goal, allActivities);
        
        if (goalType === 'negative') {
          // For negative goals (less is better), check if cumulative exceeds target
          // If cumulative > target, the goal is failed (can't undo past activities)
          if (cumulativeValue > goal.targetValue) {
            isFailed = true;
          } else if (isEvaluationDay || expired) {
            // On evaluation day or after, check if goal is met
            isMet = cumulativeValue <= goal.targetValue;
          }
        } else if (goalType === 'positive') {
          // For positive goals (more is better), check cumulative on evaluation day
          if (isEvaluationDay || expired) {
            isMet = cumulativeValue >= goal.targetValue;
          }
        } else {
          // Neutral - only check on evaluation day
          if (isEvaluationDay || expired) {
            isMet = cumulativeValue === goal.targetValue;
          }
        }
      } else {
        // For non-by_date goals, use single day value
        isMet = isGoalMet(goal, activityValue, activityType);
      }
      
      let displayStatus: GoalDisplayStatus;
      if (isMet) {
        displayStatus = 'met';
      } else if (isFailed || expired) {
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
  }, [goals, dateStr, activity, activityTypes, allActivities]);

  if (goalsWithStatus.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
        <span className="text-sm font-medium text-muted-foreground">
          Goals
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
        return <Ban className="h-5 w-5" />;
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
          statusIcon: 'bg-transparent text-slate-500',
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
    // For missed goals, show encouraging message based on goal type
    if (displayStatus === 'missed') {
      switch (goal.dateType) {
        case 'daily':
          return 'Try again tomorrow';
        case 'weekly':
          return 'Try again next week';
        case 'monthly':
          return 'Try again next month';
        case 'by_date':
        case 'date_range':
        default:
          return 'Ready to set a new goal?';
      }
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
  
  // Only show Update Goal button for by_date and date_range goals
  const showUpdateButton = displayStatus === 'missed' && 
    (goal.dateType === 'by_date' || goal.dateType === 'date_range');

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

      {/* Update Goal button - only for by_date and date_range goals */}
      {showUpdateButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openEditDialog(goal)}
          className="flex-shrink-0 text-xs text-muted-foreground"
        >
          Update Goal
        </Button>
      )}
    </div>
  );
}
