/**
 * Goals generator - creates goals for demo users
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getDaysAgoStr } from '../utils/dates';
import type { GoalDateType, GoalTrackingType, GoalIcon } from '../../../src/lib/goals';
import type { ActivityTypeWithDbId } from './activity-types';

export interface GoalTemplate {
  id: string;
  activityTypeId: string; // Template ID (e.g., 'demo_water_intake')
  name: string;
  targetValue: number;
  icon: GoalIcon;
  dateType: GoalDateType;
  trackingType: GoalTrackingType;
  /** Days ago when goal was created (relative to today) */
  createdDaysAgo: number;
  /** For by_date goals: days ago for target date */
  targetDaysAgo?: number;
  /** For date_range goals: days ago for start date */
  startDaysAgo?: number;
  /** For date_range goals: days ago for end date */
  endDaysAgo?: number;
}

interface DbGoal {
  user_id: string;
  activity_type_id: string;
  name: string;
  target_value: number;
  icon: string;
  date_type: string;
  tracking_type: string;
  created_at: string;
  target_date: string | null;
  start_date: string | null;
  end_date: string | null;
}

// ============================================================================
// GOAL TEMPLATES BY LEVEL
// ============================================================================

const JUST_STARTED_GOALS: GoalTemplate[] = [
  {
    id: 'demo_goal_hydration',
    activityTypeId: 'demo_water_intake',
    name: 'Daily Hydration',
    targetValue: 8,
    icon: 'hydration',
    dateType: 'daily',
    trackingType: 'sum',
    createdDaysAgo: 5,
  },
];

const ONE_MONTH_GOALS: GoalTemplate[] = [
  ...JUST_STARTED_GOALS.map((g) => ({ ...g, createdDaysAgo: 25 })),
  {
    id: 'demo_goal_exercise',
    activityTypeId: 'demo_exercise_minutes',
    name: 'Weekly Exercise',
    targetValue: 150,
    icon: 'fitness',
    dateType: 'weekly',
    trackingType: 'sum',
    createdDaysAgo: 20,
  },
  {
    id: 'demo_goal_medication',
    activityTypeId: 'demo_took_medication',
    name: 'Medication Streak',
    targetValue: 1,
    icon: 'health',
    dateType: 'daily',
    trackingType: 'absolute',
    createdDaysAgo: 18,
  },
];

const SIX_MONTH_GOALS: GoalTemplate[] = [
  // Active recurring goals (created earlier)
  {
    id: 'demo_goal_hydration',
    activityTypeId: 'demo_water_intake',
    name: 'Daily Hydration',
    targetValue: 8,
    icon: 'hydration',
    dateType: 'daily',
    trackingType: 'sum',
    createdDaysAgo: 170,
  },
  {
    id: 'demo_goal_exercise',
    activityTypeId: 'demo_exercise_minutes',
    name: 'Weekly Exercise',
    targetValue: 150,
    icon: 'fitness',
    dateType: 'weekly',
    trackingType: 'sum',
    createdDaysAgo: 160,
  },
  {
    id: 'demo_goal_medication',
    activityTypeId: 'demo_took_medication',
    name: 'Medication Streak',
    targetValue: 1,
    icon: 'health',
    dateType: 'daily',
    trackingType: 'absolute',
    createdDaysAgo: 150,
  },
  {
    id: 'demo_goal_walk',
    activityTypeId: 'demo_morning_walk',
    name: 'Morning Walk Habit',
    targetValue: 150, // 5 walks x 30 min = 150 min
    icon: 'cardio',
    dateType: 'weekly',
    trackingType: 'sum',
    createdDaysAgo: 120,
  },
  // Completed past goal (date_range)
  {
    id: 'demo_goal_sleep_challenge',
    activityTypeId: 'demo_sleep_quality',
    name: '30-Day Sleep Challenge',
    targetValue: 7,
    icon: 'sleep',
    dateType: 'date_range',
    trackingType: 'average',
    createdDaysAgo: 60,
    startDaysAgo: 60,
    endDaysAgo: 31,
  },
];

const ONE_YEAR_GOALS: GoalTemplate[] = [
  // Active recurring goals (created at start of year)
  {
    id: 'demo_goal_hydration',
    activityTypeId: 'demo_water_intake',
    name: 'Daily Hydration',
    targetValue: 8,
    icon: 'hydration',
    dateType: 'daily',
    trackingType: 'sum',
    createdDaysAgo: 360,
  },
  {
    id: 'demo_goal_exercise',
    activityTypeId: 'demo_exercise_minutes',
    name: 'Weekly Exercise',
    targetValue: 150,
    icon: 'fitness',
    dateType: 'weekly',
    trackingType: 'sum',
    createdDaysAgo: 350,
  },
  {
    id: 'demo_goal_medication',
    activityTypeId: 'demo_took_medication',
    name: 'Medication Streak',
    targetValue: 1,
    icon: 'health',
    dateType: 'daily',
    trackingType: 'absolute',
    createdDaysAgo: 340,
  },
  {
    id: 'demo_goal_walk',
    activityTypeId: 'demo_morning_walk',
    name: 'Morning Walk Habit',
    targetValue: 150, // 5 walks x 30 min = 150 min
    icon: 'cardio',
    dateType: 'weekly',
    trackingType: 'sum',
    createdDaysAgo: 300,
  },
  {
    id: 'demo_goal_mood',
    activityTypeId: 'demo_mood',
    name: 'Monthly Mood Average',
    targetValue: 4,
    icon: 'mindfulness',
    dateType: 'monthly',
    trackingType: 'average',
    createdDaysAgo: 280,
  },
  {
    id: 'demo_goal_alcohol',
    activityTypeId: 'demo_alcoholic_drinks',
    name: 'Limit Alcohol Monthly',
    targetValue: 8,
    icon: 'challenge',
    dateType: 'monthly',
    trackingType: 'sum',
    createdDaysAgo: 200,
  },
  // Completed past goal (date_range) - achieved
  {
    id: 'demo_goal_sleep_challenge',
    activityTypeId: 'demo_sleep_quality',
    name: '30-Day Sleep Challenge',
    targetValue: 7,
    icon: 'sleep',
    dateType: 'date_range',
    trackingType: 'average',
    createdDaysAgo: 150,
    startDaysAgo: 150,
    endDaysAgo: 121,
  },
  // Past goal (by_date) - missed
  {
    id: 'demo_goal_water_challenge',
    activityTypeId: 'demo_water_intake',
    name: '300 Glasses Challenge',
    targetValue: 300,
    icon: 'milestone',
    dateType: 'by_date',
    trackingType: 'sum',
    createdDaysAgo: 100,
    targetDaysAgo: 70, // Target was 70 days ago (missed)
  },
];

/**
 * Get goal templates for a specific level
 */
export function getGoalsForLevel(level: string): GoalTemplate[] {
  switch (level) {
    case 'new-user':
      return [];
    case 'just-started':
      return JUST_STARTED_GOALS;
    case 'one-month':
      return ONE_MONTH_GOALS;
    case 'six-months':
      return SIX_MONTH_GOALS;
    case 'one-year':
      return ONE_YEAR_GOALS;
    default:
      return [];
  }
}

/**
 * Build a map of template ID to database UUID
 */
function buildActivityTypeIdMap(activityTypes: ActivityTypeWithDbId[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const at of activityTypes) {
    map.set(at.id, at.dbId);
  }
  return map;
}

/**
 * Convert goal template to database format
 * Note: We omit the id field and let the database generate a UUID
 */
function templateToDbFormat(
  template: GoalTemplate,
  userId: string,
  activityTypeIdMap: Map<string, string>
): DbGoal {
  const dbActivityTypeId = activityTypeIdMap.get(template.activityTypeId);
  if (!dbActivityTypeId) {
    throw new Error(`Activity type not found for goal: ${template.activityTypeId}`);
  }

  return {
    user_id: userId,
    activity_type_id: dbActivityTypeId,
    name: template.name,
    target_value: template.targetValue,
    icon: template.icon,
    date_type: template.dateType,
    tracking_type: template.trackingType,
    created_at: getDaysAgoStr(template.createdDaysAgo),
    target_date: template.targetDaysAgo !== undefined ? getDaysAgoStr(template.targetDaysAgo) : null,
    start_date: template.startDaysAgo !== undefined ? getDaysAgoStr(template.startDaysAgo) : null,
    end_date: template.endDaysAgo !== undefined ? getDaysAgoStr(template.endDaysAgo) : null,
  };
}

/**
 * Create goals for a demo user based on their level
 * @param activityTypes - Activity types with their Supabase-generated dbId
 */
export async function createGoals(
  supabase: SupabaseClient,
  userId: string,
  level: string,
  activityTypes: ActivityTypeWithDbId[]
): Promise<GoalTemplate[]> {
  const templates = getGoalsForLevel(level);

  if (templates.length === 0) {
    return [];
  }

  const activityTypeIdMap = buildActivityTypeIdMap(activityTypes);
  const dbRecords = templates.map((t) => templateToDbFormat(t, userId, activityTypeIdMap));

  const { error } = await supabase.from('goals').insert(dbRecords);

  if (error) {
    throw new Error(`Failed to create goals: ${error.message}`);
  }

  return templates;
}
