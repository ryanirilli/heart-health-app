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
  effectiveValue: number | undefined;
  displayStatus: GoalDisplayStatus;
  daysRemaining: number | null;
  isEvaluationDay: boolean;
  isSliderType: boolean;
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

/**
 * Get the start of the week (Monday) for a given date string.
 */
function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const day = date.getDay();
  // Adjust for Monday start (0 = Sunday, so we need to go back 6 days, 1 = Monday = 0 days back, etc.)
  const daysToSubtract = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - daysToSubtract);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Get the start of the month for a given date string.
 */
function getMonthStart(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Calculate average value for a goal over a specific period.
 * Used for slider-type activities where we want the average instead of sum.
 * 
 * @param goal - The goal to calculate for
 * @param allActivities - All activities
 * @param startDate - Start of the period (inclusive)
 * @param endDate - End of the period (inclusive)
 * @returns Object with sum, count, and average
 */
function getAverageValueForPeriod(
  goal: Goal,
  allActivities: ActivityMap | undefined,
  startDate: string,
  endDate: string
): { sum: number; count: number; average: number } {
  if (!allActivities) return { sum: 0, count: 0, average: 0 };
  
  let sum = 0;
  let count = 0;
  
  for (const [dateStr, activity] of Object.entries(allActivities)) {
    if (dateStr >= startDate && dateStr <= endDate) {
      const value = activity.entries?.[goal.activityTypeId]?.value;
      if (value !== undefined) {
        sum += value;
        count++;
      }
    }
  }
  
  return {
    sum,
    count,
    average: count > 0 ? sum / count : 0,
  };
}

/**
 * Get the effective value for goal comparison based on activity type.
 * For slider types, returns the average over the period.
 * For other types (increment, buttonGroup), returns the sum.
 */
function getEffectiveValueForGoal(
  goal: Goal,
  activityType: ActivityTypeMap[string] | undefined,
  allActivities: ActivityMap | undefined,
  dateStr: string
): number {
  if (!allActivities || !activityType) return 0;
  
  const isSlider = activityType.uiType === 'slider';
  
  // Determine the period based on goal date type
  let startDate: string;
  let endDate: string;
  
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  switch (goal.dateType) {
    case 'daily':
      // For daily goals, just use the single day value
      return allActivities[dateStr]?.entries?.[goal.activityTypeId]?.value ?? 0;
      
    case 'weekly':
      // Week starts on Monday, ends on Sunday (dateStr)
      startDate = getWeekStart(dateStr);
      endDate = dateStr;
      break;
      
    case 'monthly':
      // Month starts on 1st, ends on last day (dateStr)
      startDate = getMonthStart(dateStr);
      endDate = dateStr;
      break;
      
    case 'by_date':
      // From goal creation to target date (or today if before target)
      startDate = goal.createdAt || todayStr;
      endDate = todayStr < (goal.targetDate || todayStr) ? todayStr : (goal.targetDate || todayStr);
      break;
      
    case 'date_range':
      // From start date to end date (or today if before end)
      startDate = goal.startDate || todayStr;
      endDate = todayStr < (goal.endDate || todayStr) ? todayStr : (goal.endDate || todayStr);
      break;
      
    default:
      return 0;
  }
  
  const { sum, average } = getAverageValueForPeriod(goal, allActivities, startDate, endDate);
  
  // For slider types, use average; for others, use sum
  return isSlider ? average : sum;
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
      
      if (goal.dateType === 'daily') {
        // For daily goals, use single day value
        isMet = isGoalMet(goal, activityValue, activityType);
      } else if (activityType) {
        // For non-daily goals, calculate effective value based on activity type
        // Slider types use average, others use sum
        const goalType = getGoalType(activityType);
        const effectiveValue = getEffectiveValueForGoal(goal, activityType, allActivities, dateStr);
        
        if (goalType === 'negative') {
          // For negative goals (less is better), check if value exceeds target
          // For slider (average): if average > target, goal is failed
          // For sum: if cumulative > target, goal is failed
          if (activityType.uiType !== 'slider' && effectiveValue > goal.targetValue) {
            // Only fail immediately for sum-based goals (can't undo past activities)
            isFailed = true;
          } else if (isEvaluationDay || expired) {
            // On evaluation day or after, check if goal is met
            isMet = effectiveValue <= goal.targetValue;
          }
        } else if (goalType === 'positive') {
          // For positive goals (more is better), check on evaluation day
          if (isEvaluationDay || expired) {
            isMet = effectiveValue >= goal.targetValue;
          }
        } else {
          // Neutral - only check on evaluation day
          if (isEvaluationDay || expired) {
            isMet = effectiveValue === goal.targetValue;
          }
        }
      }
      
      let displayStatus: GoalDisplayStatus;
      if (isMet) {
        displayStatus = 'met';
      } else if (isFailed || expired) {
        displayStatus = 'missed';
      } else if (isEvaluationDay && goal.dateType !== 'daily') {
        // Daily goals don't get special "evaluation day" treatment - 
        // they're either met (green) or not (muted)
        displayStatus = 'evaluation_day';
      } else {
        displayStatus = 'in_progress';
      }
      
      // Calculate effective value for non-daily goals
      const isSliderType = activityType?.uiType === 'slider';
      const effectiveValue = goal.dateType === 'daily' 
        ? activityValue 
        : getEffectiveValueForGoal(goal, activityType, allActivities, dateStr);

      return {
        goal,
        activityValue,
        effectiveValue,
        displayStatus,
        daysRemaining,
        isEvaluationDay,
        isSliderType,
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
        {goalsWithStatus.map(({ goal, activityValue, effectiveValue, displayStatus, daysRemaining, isEvaluationDay, isSliderType }) => (
          <GoalStatusItem
            key={goal.id}
            goal={goal}
            activityValue={activityValue}
            effectiveValue={effectiveValue}
            displayStatus={displayStatus}
            daysRemaining={daysRemaining}
            isEvaluationDay={isEvaluationDay}
            isSliderType={isSliderType}
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
  effectiveValue: number | undefined;
  displayStatus: GoalDisplayStatus;
  daysRemaining: number | null;
  isEvaluationDay: boolean;
  isSliderType: boolean;
  activityType?: ActivityTypeMap[string];
}

function GoalStatusItem({
  goal,
  activityValue,
  effectiveValue,
  displayStatus,
  daysRemaining,
  isEvaluationDay,
  isSliderType,
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
      // For non-daily slider goals, show average
      if (isSliderType && goal.dateType !== 'daily') {
        const avgValue = effectiveValue !== undefined 
          ? formatValueWithUnit(Math.round(effectiveValue * 10) / 10, activityType)
          : '0';
        const targetValue = formatValueWithUnit(goal.targetValue, activityType);
        return `Avg: ${avgValue} / ${targetValue}`;
      }
      
      // For daily goals or non-slider types, show current/cumulative value
      const currentValue = goal.dateType === 'daily'
        ? (activityValue !== undefined ? formatValueWithUnit(activityValue, activityType) : '0')
        : (effectiveValue !== undefined ? formatValueWithUnit(effectiveValue, activityType) : '0');
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
          {displayStatus === 'evaluation_day' && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Last Day
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
