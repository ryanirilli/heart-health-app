// Goal definitions and utilities
import {
  Target,
  Dumbbell,
  Heart,
  Apple,
  Brain,
  Droplets,
  Moon,
  Zap,
  Activity,
  Repeat,
  Trophy,
  Flame,
  type LucideIcon,
} from 'lucide-react';

// =============================================================================
// GOAL ICON SYSTEM
// =============================================================================

/**
 * Abstract semantic icon identifiers for goals.
 * These are decoupled from the actual icon library - the mapping is done in code.
 * This allows changing icon libraries without database migrations.
 */
export type GoalIcon =
  | 'target'      // Achievement/goal
  | 'fitness'     // Exercise/workout
  | 'health'      // Heart/wellness
  | 'nutrition'   // Food/diet
  | 'mindfulness' // Meditation/calm
  | 'hydration'   // Water intake
  | 'sleep'       // Rest/recovery
  | 'strength'    // Muscle/power
  | 'cardio'      // Running/endurance
  | 'habit'       // Recurring/routine
  | 'milestone'   // Achievement marker
  | 'challenge';  // Competition/push

/** All available goal icons */
export const GOAL_ICONS: GoalIcon[] = [
  'target',
  'fitness',
  'health',
  'nutrition',
  'mindfulness',
  'hydration',
  'sleep',
  'strength',
  'cardio',
  'habit',
  'milestone',
  'challenge',
];

/** Human-readable labels for goal icons */
export const GOAL_ICON_LABELS: Record<GoalIcon, string> = {
  target: 'Target',
  fitness: 'Fitness',
  health: 'Health',
  nutrition: 'Nutrition',
  mindfulness: 'Mindfulness',
  hydration: 'Hydration',
  sleep: 'Sleep',
  strength: 'Strength',
  cardio: 'Cardio',
  habit: 'Habit',
  milestone: 'Milestone',
  challenge: 'Challenge',
};

/**
 * Icon registry - maps abstract GoalIcon to actual icon components.
 * Update this mapping when changing icon libraries.
 */
export const GOAL_ICON_MAP: Record<GoalIcon, LucideIcon> = {
  target: Target,
  fitness: Dumbbell,
  health: Heart,
  nutrition: Apple,
  mindfulness: Brain,
  hydration: Droplets,
  sleep: Moon,
  strength: Zap,
  cardio: Activity,
  habit: Repeat,
  milestone: Trophy,
  challenge: Flame,
};

/** Get the icon component for a goal icon identifier */
export function getGoalIconComponent(icon: GoalIcon): LucideIcon {
  return GOAL_ICON_MAP[icon] ?? GOAL_ICON_MAP.target;
}

/** Check if a string is a valid GoalIcon */
export function isValidGoalIcon(icon: string): icon is GoalIcon {
  return GOAL_ICONS.includes(icon as GoalIcon);
}

// =============================================================================
// GOAL DATE TYPES
// =============================================================================

/**
 * Date type determines how the goal's timeframe is defined:
 * - 'daily': Repeating daily goal
 * - 'weekly': Repeating weekly goal
 * - 'monthly': Repeating monthly goal
 * - 'by_date': One-time goal with a target completion date
 * - 'date_range': Goal with specific start and end dates
 */
export type GoalDateType = 'daily' | 'weekly' | 'monthly' | 'by_date' | 'date_range';

/** All available goal date types */
export const GOAL_DATE_TYPES: GoalDateType[] = [
  'daily',
  'weekly',
  'monthly',
  'by_date',
  'date_range',
];

/** Human-readable labels for goal date types */
export const GOAL_DATE_TYPE_LABELS: Record<GoalDateType, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  by_date: 'By Date',
  date_range: 'Date Range',
};

/** Descriptions for goal date types */
export const GOAL_DATE_TYPE_DESCRIPTIONS: Record<GoalDateType, string> = {
  daily: 'Repeat every day',
  weekly: 'Repeat every week',
  monthly: 'Repeat every month',
  by_date: 'Complete by a specific date',
  date_range: 'Active during a specific period',
};

// =============================================================================
// GOAL TYPES
// =============================================================================

/** Goal entity as used in the application */
export interface Goal {
  id: string;
  activityTypeId: string;
  name: string;
  targetValue: number;
  icon: GoalIcon;
  dateType: GoalDateType;
  targetDate?: string;
  startDate?: string;
  endDate?: string;
}

/** Map of goals by ID */
export interface GoalMap {
  [id: string]: Goal;
}

// =============================================================================
// UTILITIES
// =============================================================================

/** Generate a unique ID for a new goal */
export function generateGoalId(): string {
  return crypto.randomUUID();
}

/** Create a default goal with sensible defaults */
export function createDefaultGoal(partial: Partial<Goal> = {}): Goal {
  return {
    id: generateGoalId(),
    activityTypeId: '',
    name: '',
    targetValue: 1,
    icon: 'target',
    dateType: 'daily',
    ...partial,
  };
}

/**
 * Check if a date is the last day of its month.
 */
function isLastDayOfMonth(dateStr: string): boolean {
  const date = new Date(dateStr + 'T12:00:00'); // Use noon to avoid timezone issues
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  return nextDay.getDate() === 1;
}

/**
 * Check if a date is a Sunday (end of week, week starts Monday).
 */
function isSunday(dateStr: string): boolean {
  const date = new Date(dateStr + 'T12:00:00');
  return date.getDay() === 0; // 0 = Sunday
}

/**
 * Check if a goal should show a star indicator on a given date.
 * This determines when the goal is "evaluated" or shown as a milestone.
 * 
 * - daily: every day
 * - weekly: only on Sundays (end of week, Mon-Sun)
 * - monthly: only on last day of month
 * - by_date: only on the target date itself (milestone)
 * - date_range: every day within the range
 */
export function shouldShowGoalIndicator(goal: Goal, dateStr: string): boolean {
  switch (goal.dateType) {
    case 'daily':
      // Daily goals show every day
      return true;
    case 'weekly':
      // Weekly goals only show on Sunday (end of week)
      return isSunday(dateStr);
    case 'monthly':
      // Monthly goals only show on last day of month
      return isLastDayOfMonth(dateStr);
    case 'by_date':
      // By-date goals only show on the target date (milestone)
      return goal.targetDate === dateStr;
    case 'date_range':
      // Date range goals show every day within the range
      if (!goal.startDate || !goal.endDate) return false;
      return dateStr >= goal.startDate && dateStr <= goal.endDate;
    default:
      return false;
  }
}

/**
 * Check if a goal is relevant for a given date (for showing in day view).
 * This is broader than shouldShowGoalIndicator - it includes goals that
 * are "in progress" even if not being evaluated on that specific day.
 * 
 * - daily: always relevant
 * - weekly: relevant any day of any week
 * - monthly: relevant any day of any month
 * - by_date: relevant from now until target date (countdown)
 * - date_range: relevant within the range
 */
export function isGoalRelevantForDate(goal: Goal, dateStr: string): boolean {
  switch (goal.dateType) {
    case 'daily':
    case 'weekly':
    case 'monthly':
      // Recurring goals are always relevant
      return true;
    case 'by_date':
      // Relevant until target date (inclusive) - for countdown display
      return goal.targetDate ? dateStr <= goal.targetDate : false;
    case 'date_range':
      // Relevant within the range
      if (!goal.startDate || !goal.endDate) return false;
      return dateStr >= goal.startDate && dateStr <= goal.endDate;
    default:
      return false;
  }
}

/**
 * Get goals that should show a star indicator on a given date.
 */
export function getGoalsWithIndicatorForDate(goals: GoalMap, dateStr: string): Goal[] {
  return Object.values(goals).filter(goal => shouldShowGoalIndicator(goal, dateStr));
}

/**
 * Get all goals that are relevant for a given date (for day view display).
 */
export function getRelevantGoalsForDate(goals: GoalMap, dateStr: string): Goal[] {
  return Object.values(goals).filter(goal => isGoalRelevantForDate(goal, dateStr));
}

/**
 * Calculate days remaining until a goal's target date.
 * Returns null for goals without a target date.
 */
export function getDaysUntilGoal(goal: Goal, fromDateStr: string): number | null {
  if (goal.dateType !== 'by_date' || !goal.targetDate) return null;
  
  const from = new Date(fromDateStr + 'T12:00:00');
  const target = new Date(goal.targetDate + 'T12:00:00');
  const diffTime = target.getTime() - from.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Check if a goal's target date has passed.
 */
export function isGoalExpired(goal: Goal, dateStr: string): boolean {
  if (goal.dateType === 'by_date' && goal.targetDate) {
    return dateStr > goal.targetDate;
  }
  if (goal.dateType === 'date_range' && goal.endDate) {
    return dateStr > goal.endDate;
  }
  return false;
}

import { ActivityType, getGoalType, GoalType } from './activityTypes';

/**
 * Check if a goal is met for a given activity value.
 * 
 * The comparison depends on the activity type's goal type:
 * - 'positive' (more is better): value >= targetValue means goal is met
 * - 'negative' (less is better): value <= targetValue means goal is met
 * - 'neutral': value === targetValue means goal is met (exact match)
 * 
 * @param goal - The goal to check
 * @param activityValue - The current activity value (undefined if no activity logged)
 * @param activityType - The activity type (needed to determine if more or less is better)
 */
export function isGoalMet(
  goal: Goal, 
  activityValue: number | undefined,
  activityType?: ActivityType
): boolean {
  if (activityValue === undefined) return false;
  
  // Determine the goal type from the activity type
  const goalType: GoalType = activityType ? getGoalType(activityType) : 'positive';
  
  switch (goalType) {
    case 'negative':
      // Less is better - goal is met when value is at or below target
      return activityValue <= goal.targetValue;
    case 'neutral':
      // Exact match required
      return activityValue === goal.targetValue;
    case 'positive':
    default:
      // More is better - goal is met when value is at or above target
      return activityValue >= goal.targetValue;
  }
}

/** Validate a goal has required fields */
export function validateGoal(goal: Goal): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!goal.name.trim()) {
    errors.push('Goal name is required');
  }

  if (!goal.activityTypeId) {
    errors.push('Activity type is required');
  }

  if (goal.targetValue < 0) {
    errors.push('Target value cannot be negative');
  }

  if (!isValidGoalIcon(goal.icon)) {
    errors.push('Invalid icon selected');
  }

  // Validate date fields based on date type
  if (goal.dateType === 'by_date' && !goal.targetDate) {
    errors.push('Target date is required for "By Date" goals');
  }

  if (goal.dateType === 'date_range') {
    if (!goal.startDate) {
      errors.push('Start date is required for "Date Range" goals');
    }
    if (!goal.endDate) {
      errors.push('End date is required for "Date Range" goals');
    }
    if (goal.startDate && goal.endDate && goal.endDate < goal.startDate) {
      errors.push('End date must be after start date');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

