/**
 * Activity type templates covering all UI types
 * These templates are used to create activity types for demo accounts
 */

import type { UIType, GoalType, ButtonOption } from '../../../src/lib/activityTypes';

export interface ActivityTypeTemplate {
  id: string;
  name: string;
  unit?: string;
  pluralize?: boolean;
  goalType: GoalType;
  uiType: UIType;
  minValue?: number;
  maxValue?: number;
  step?: number;
  buttonOptions?: ButtonOption[];
  fixedValue?: number;
  order: number;
}

/**
 * Water Intake - increment type (positive goal)
 * Tracks glasses of water per day
 */
export const WATER_INTAKE: ActivityTypeTemplate = {
  id: 'demo_water_intake',
  name: 'Water Intake',
  unit: 'glass',
  pluralize: true,
  goalType: 'positive',
  uiType: 'increment',
  minValue: 0,
  maxValue: 20,
  step: 1,
  order: 0,
};

/**
 * Sleep Quality - slider type (positive goal)
 * Rates sleep quality 1-10
 */
export const SLEEP_QUALITY: ActivityTypeTemplate = {
  id: 'demo_sleep_quality',
  name: 'Sleep Quality',
  goalType: 'positive',
  uiType: 'slider',
  minValue: 1,
  maxValue: 10,
  step: 1,
  order: 1,
};

/**
 * Mood - buttonGroup type (neutral goal)
 * Tracks daily mood with 5 options
 */
export const MOOD: ActivityTypeTemplate = {
  id: 'demo_mood',
  name: 'Mood',
  goalType: 'neutral',
  uiType: 'buttonGroup',
  buttonOptions: [
    { label: 'Great', value: 5 },
    { label: 'Good', value: 4 },
    { label: 'Okay', value: 3 },
    { label: 'Low', value: 2 },
    { label: 'Rough', value: 1 },
  ],
  order: 2,
};

/**
 * Took Medication - toggle type (positive goal)
 * Binary tracking of daily medication
 */
export const TOOK_MEDICATION: ActivityTypeTemplate = {
  id: 'demo_took_medication',
  name: 'Took Medication',
  goalType: 'positive',
  uiType: 'toggle',
  order: 3,
};

/**
 * Morning Walk - fixedValue type (positive goal)
 * Records 30-minute morning walks
 */
export const MORNING_WALK: ActivityTypeTemplate = {
  id: 'demo_morning_walk',
  name: 'Morning Walk',
  unit: 'minute',
  pluralize: true,
  goalType: 'positive',
  uiType: 'fixedValue',
  fixedValue: 30,
  order: 4,
};

/**
 * Alcoholic Drinks - increment type (negative goal)
 * Tracks drinks to limit consumption
 */
export const ALCOHOLIC_DRINKS: ActivityTypeTemplate = {
  id: 'demo_alcoholic_drinks',
  name: 'Alcoholic Drinks',
  unit: 'drink',
  pluralize: true,
  goalType: 'negative',
  uiType: 'increment',
  minValue: 0,
  maxValue: 10,
  step: 1,
  order: 5,
};

/**
 * Exercise Minutes - slider type (positive goal)
 * Tracks daily exercise duration
 */
export const EXERCISE_MINUTES: ActivityTypeTemplate = {
  id: 'demo_exercise_minutes',
  name: 'Exercise Minutes',
  unit: 'minute',
  pluralize: true,
  goalType: 'positive',
  uiType: 'slider',
  minValue: 0,
  maxValue: 120,
  step: 5,
  order: 6,
};

/**
 * All activity types in order
 */
export const ALL_ACTIVITY_TYPES: ActivityTypeTemplate[] = [
  WATER_INTAKE,
  SLEEP_QUALITY,
  MOOD,
  TOOK_MEDICATION,
  MORNING_WALK,
  ALCOHOLIC_DRINKS,
  EXERCISE_MINUTES,
];

/**
 * Get activity types for a specific demo level
 */
export function getActivityTypesForLevel(level: string): ActivityTypeTemplate[] {
  switch (level) {
    case 'new-user':
      return []; // No activity types for new user
    case 'just-started':
      return [WATER_INTAKE, SLEEP_QUALITY, MOOD]; // 3 types
    case 'one-month':
      return [WATER_INTAKE, SLEEP_QUALITY, MOOD, EXERCISE_MINUTES, TOOK_MEDICATION]; // 5 types
    case 'six-months':
      return [WATER_INTAKE, SLEEP_QUALITY, MOOD, EXERCISE_MINUTES, TOOK_MEDICATION, MORNING_WALK]; // 6 types
    case 'one-year':
      return ALL_ACTIVITY_TYPES; // All 7 types
    default:
      return [];
  }
}

/**
 * Get an activity type template by ID
 */
export function getActivityTypeById(id: string): ActivityTypeTemplate | undefined {
  return ALL_ACTIVITY_TYPES.find((type) => type.id === id);
}
