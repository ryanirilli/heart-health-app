/**
 * Activities generator - creates activity entries with realistic patterns
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { generateDateRange, getDaysAgoStr, isWeekend, getDayIndex } from '../utils/dates';
import {
  generatePatternValue,
  generateMoodValue,
  generateGaps,
  shouldOccur,
  type PatternConfig,
} from '../utils/patterns';
import type { ActivityTypeWithDbId } from './activity-types';

interface DbActivity {
  user_id: string;
  activity_type_id: string;
  date: string;
  value: number;
}

// ============================================================================
// PATTERN CONFIGS FOR EACH ACTIVITY TYPE
// ============================================================================

const WATER_INTAKE_PATTERN: PatternConfig = {
  baseValue: 5,
  improvement: 3, // Improves from 5 to 8 over time
  variance: 2,
  weekendBoost: 1,
  min: 2,
  max: 15,
  newYearBoost: 2,
};

const SLEEP_QUALITY_PATTERN: PatternConfig = {
  baseValue: 5,
  improvement: 2, // Improves from 5 to 7 over time
  variance: 1.5,
  weekendBoost: 1,
  min: 1,
  max: 10,
};

const EXERCISE_MINUTES_PATTERN: PatternConfig = {
  baseValue: 15,
  improvement: 30, // Improves from 15 to 45 over time
  variance: 15,
  weekendBoost: 15, // More exercise on weekends
  min: 0,
  max: 120,
  newYearBoost: 10,
};

const ALCOHOLIC_DRINKS_PATTERN: PatternConfig = {
  baseValue: 2,
  improvement: -1.5, // Decreases from 2 to 0.5 over time (improvement for negative goal)
  variance: 1,
  weekendBoost: 1, // Slightly more on weekends
  min: 0,
  max: 8,
};

// ============================================================================
// ACTIVITY GENERATION BY TYPE
// ============================================================================

function generateWaterIntakeValue(dateStr: string, startDateStr: string, totalDays: number): number {
  return generatePatternValue(dateStr, startDateStr, totalDays, WATER_INTAKE_PATTERN);
}

function generateSleepQualityValue(dateStr: string, startDateStr: string, totalDays: number): number {
  return generatePatternValue(dateStr, startDateStr, totalDays, SLEEP_QUALITY_PATTERN);
}

function generateExerciseMinutesValue(dateStr: string, startDateStr: string, totalDays: number): number {
  // Some days have no exercise
  if (!shouldOccur(0.6)) {
    return 0;
  }
  return generatePatternValue(dateStr, startDateStr, totalDays, EXERCISE_MINUTES_PATTERN);
}

function generateAlcoholicDrinksValue(dateStr: string, startDateStr: string, totalDays: number): number {
  // Most days have no drinks
  if (!shouldOccur(0.25)) {
    return 0;
  }
  return generatePatternValue(dateStr, startDateStr, totalDays, ALCOHOLIC_DRINKS_PATTERN);
}

function generateMedicationValue(dateStr: string, startDateStr: string, totalDays: number): number {
  // High adherence that improves over time
  const dayIndex = getDayIndex(startDateStr, dateStr);
  const progress = dayIndex / Math.max(1, totalDays - 1);
  const adherenceProbability = 0.85 + progress * 0.1; // 85% -> 95%
  return shouldOccur(adherenceProbability) ? 1 : 0;
}

function generateMorningWalkValue(dateStr: string, startDateStr: string, totalDays: number): number {
  // Probability increases over time, higher on weekends
  const dayIndex = getDayIndex(startDateStr, dateStr);
  const progress = dayIndex / Math.max(1, totalDays - 1);
  let probability = 0.4 + progress * 0.35; // 40% -> 75%
  if (isWeekend(dateStr)) {
    probability += 0.15;
  }
  return shouldOccur(probability) ? 1 : 0;
}

/**
 * Generate value for an activity type on a given date
 * Uses the template ID (e.g., 'demo_water_intake') for value generation logic
 */
function generateActivityValue(
  templateId: string,
  dateStr: string,
  startDateStr: string,
  totalDays: number
): number | null {
  switch (templateId) {
    case 'demo_water_intake':
      return generateWaterIntakeValue(dateStr, startDateStr, totalDays);
    case 'demo_sleep_quality':
      return generateSleepQualityValue(dateStr, startDateStr, totalDays);
    case 'demo_mood':
      return generateMoodValue(dateStr, startDateStr, totalDays);
    case 'demo_exercise_minutes':
      return generateExerciseMinutesValue(dateStr, startDateStr, totalDays);
    case 'demo_took_medication':
      return generateMedicationValue(dateStr, startDateStr, totalDays);
    case 'demo_morning_walk':
      return generateMorningWalkValue(dateStr, startDateStr, totalDays);
    case 'demo_alcoholic_drinks':
      return generateAlcoholicDrinksValue(dateStr, startDateStr, totalDays);
    default:
      return null;
  }
}

// ============================================================================
// LEVEL-SPECIFIC CONFIGURATIONS
// ============================================================================

interface LevelConfig {
  totalDays: number;
  gapProbability: number;
  maxConsecutiveGap: number;
}

function getLevelConfig(level: string): LevelConfig {
  switch (level) {
    case 'just-started':
      return { totalDays: 7, gapProbability: 0.3, maxConsecutiveGap: 2 };
    case 'one-month':
      return { totalDays: 30, gapProbability: 0.2, maxConsecutiveGap: 3 };
    case 'six-months':
      return { totalDays: 180, gapProbability: 0.15, maxConsecutiveGap: 4 };
    case 'one-year':
      return { totalDays: 365, gapProbability: 0.12, maxConsecutiveGap: 5 };
    default:
      return { totalDays: 0, gapProbability: 0, maxConsecutiveGap: 0 };
  }
}

/**
 * Create activities for a demo user based on their level and activity types
 * @param activityTypes - Activity types with their Supabase-generated dbId
 */
export async function createActivities(
  supabase: SupabaseClient,
  userId: string,
  level: string,
  activityTypes: ActivityTypeWithDbId[]
): Promise<number> {
  const config = getLevelConfig(level);

  if (config.totalDays === 0 || activityTypes.length === 0) {
    return 0;
  }

  const startDateStr = getDaysAgoStr(config.totalDays - 1);
  const gaps = generateGaps(config.totalDays, config.gapProbability, config.maxConsecutiveGap);
  const dates = generateDateRange(config.totalDays - 1, gaps);

  const activities: DbActivity[] = [];

  for (const dateStr of dates) {
    for (const activityType of activityTypes) {
      const value = generateActivityValue(
        activityType.id, // Template ID for value generation logic
        dateStr,
        startDateStr,
        config.totalDays
      );

      // Skip null values and zero values for toggle/fixedValue types
      if (value === null) continue;
      if (value === 0 && (activityType.uiType === 'toggle' || activityType.uiType === 'fixedValue')) continue;

      activities.push({
        user_id: userId,
        activity_type_id: activityType.dbId, // Use Supabase-generated UUID
        date: dateStr,
        value,
      });
    }
  }

  if (activities.length === 0) {
    return 0;
  }

  // Insert in batches to avoid hitting limits
  const BATCH_SIZE = 500;
  for (let i = 0; i < activities.length; i += BATCH_SIZE) {
    const batch = activities.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('activities').insert(batch);

    if (error) {
      throw new Error(`Failed to create activities (batch ${i / BATCH_SIZE + 1}): ${error.message}`);
    }
  }

  return activities.length;
}
