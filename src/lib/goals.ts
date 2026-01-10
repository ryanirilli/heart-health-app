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
// GOAL TRACKING TYPES
// =============================================================================

/**
 * Tracking type determines how discrete value goals (buttonGroup/options) are evaluated:
 * - 'average': Target is compared against the average value over the period
 * - 'absolute': Target is compared against the sum/total over the period
 */
export type GoalTrackingType = 'average' | 'absolute';

/** All available tracking types */
export const GOAL_TRACKING_TYPES: GoalTrackingType[] = ['average', 'absolute'];

/** Human-readable labels for tracking types */
export const GOAL_TRACKING_TYPE_LABELS: Record<GoalTrackingType, string> = {
  average: 'Average',
  absolute: 'Absolute',
};

/** Descriptions for tracking types */
export const GOAL_TRACKING_TYPE_DESCRIPTIONS: Record<GoalTrackingType, string> = {
  average: 'Goal is met when your average value meets or exceeds the target',
  absolute: 'Goal is met only when every logged day meets the target',
};

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
  /** How discrete value goals are evaluated (average vs absolute) */
  trackingType: GoalTrackingType;
  targetDate?: string;
  startDate?: string;
  endDate?: string;
  createdAt: string; // ISO date string (YYYY-MM-DD)
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

/** Get today's date as YYYY-MM-DD string */
export function getTodayDateStr(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
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
    trackingType: 'average',
    createdAt: getTodayDateStr(),
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
 * Goals are only shown from their creation date onward.
 * 
 * - daily: from creation date onward
 * - weekly: from creation date onward
 * - monthly: from creation date onward
 * - by_date: from creation date until target date (inclusive), 
 *            BUT also shows on today if missed (so user can see and update)
 * - date_range: within the specified range (respects startDate, not createdAt),
 *               BUT also shows on today if missed
 */
export function isGoalRelevantForDate(goal: Goal, dateStr: string): boolean {
  const todayStr = getTodayDateStr();
  
  // For date_range goals, use the explicit start/end dates
  if (goal.dateType === 'date_range') {
    if (!goal.startDate || !goal.endDate) return false;
    const inRange = dateStr >= goal.startDate && dateStr <= goal.endDate;
    // Also show on today if the goal has expired (so user can update it)
    const isMissedAndToday = dateStr === todayStr && dateStr > goal.endDate;
    return inRange || isMissedAndToday;
  }
  
  // For all other goal types, don't show before creation date
  if (goal.createdAt && dateStr < goal.createdAt) {
    return false;
  }
  
  switch (goal.dateType) {
    case 'daily':
    case 'weekly':
    case 'monthly':
      // Recurring goals are relevant from creation date onward
      return true;
    case 'by_date':
      if (!goal.targetDate) return false;
      // Relevant from creation until target date (inclusive)
      const beforeOrOnTarget = dateStr <= goal.targetDate;
      // Also show on today if the goal has expired (so user can update it)
      const isMissedAndToday = dateStr === todayStr && dateStr > goal.targetDate;
      return beforeOrOnTarget || isMissedAndToday;
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
 * Calculate days remaining until a goal's evaluation date.
 * Always calculates from the given date (or today if not provided).
 * 
 * - by_date: days until target date
 * - weekly: days until Sunday (end of week, Mon-Sun)
 * - monthly: days until last day of month
 * - daily: always 0 (evaluated same day)
 * - date_range: days until end date
 * 
 * Returns null for goals that don't have a clear end date.
 */
export function getDaysUntilGoal(goal: Goal, fromDateStr?: string): number | null {
  const fromDate = fromDateStr 
    ? new Date(fromDateStr + 'T12:00:00')
    : new Date();
  fromDate.setHours(12, 0, 0, 0); // Use noon to avoid timezone issues
  
  let targetDate: Date;
  
  switch (goal.dateType) {
    case 'by_date':
      if (!goal.targetDate) return null;
      targetDate = new Date(goal.targetDate + 'T12:00:00');
      break;
      
    case 'weekly':
      // Calculate days until Sunday (end of week)
      // Sunday = 0, Monday = 1, ..., Saturday = 6
      const dayOfWeek = fromDate.getDay();
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      targetDate = new Date(fromDate);
      targetDate.setDate(targetDate.getDate() + daysUntilSunday);
      break;
      
    case 'monthly':
      // Calculate days until last day of month
      targetDate = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 0, 12, 0, 0);
      break;
      
    case 'date_range':
      if (!goal.endDate) return null;
      targetDate = new Date(goal.endDate + 'T12:00:00');
      break;
      
    case 'daily':
      return 0; // Daily goals are always evaluated same day
      
    default:
      return null;
  }
  
  const diffTime = targetDate.getTime() - fromDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Check if a goal's target date has passed (relative to TODAY, not the card's date).
 * This ensures consistent "missed" status regardless of which day you're viewing.
 */
export function isGoalExpired(goal: Goal): boolean {
  const todayStr = getTodayDateStr();
  
  if (goal.dateType === 'by_date' && goal.targetDate) {
    return todayStr > goal.targetDate;
  }
  if (goal.dateType === 'date_range' && goal.endDate) {
    return todayStr > goal.endDate;
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

