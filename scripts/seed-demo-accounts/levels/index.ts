/**
 * Level configurations - unified exports for all demo levels
 *
 * Each level is defined by:
 * - Activity types to create
 * - Goals to set
 * - Days of activity data to generate
 * - Check-ins to create
 * - Notes frequency
 *
 * The actual data templates are in the data/ and generators/ directories.
 * This file just provides a unified interface for the main script.
 */

import type { DemoLevel } from '../config';

export interface LevelSummary {
  level: DemoLevel;
  activityTypesCount: number;
  goalsCount: number;
  daysOfData: number;
  checkInsCount: number;
  description: string;
}

export const LEVEL_SUMMARIES: Record<DemoLevel, LevelSummary> = {
  'new-user': {
    level: 'new-user',
    activityTypesCount: 0,
    goalsCount: 0,
    daysOfData: 0,
    checkInsCount: 0,
    description: 'Empty account - just signed up',
  },
  'just-started': {
    level: 'just-started',
    activityTypesCount: 3,
    goalsCount: 1,
    daysOfData: 7,
    checkInsCount: 0,
    description: 'First week with basic tracking',
  },
  'one-month': {
    level: 'one-month',
    activityTypesCount: 5,
    goalsCount: 3,
    daysOfData: 30,
    checkInsCount: 2,
    description: 'One month of building habits',
  },
  'six-months': {
    level: 'six-months',
    activityTypesCount: 6,
    goalsCount: 5,
    daysOfData: 180,
    checkInsCount: 5,
    description: 'Six months of consistent tracking',
  },
  'one-year': {
    level: 'one-year',
    activityTypesCount: 7,
    goalsCount: 8,
    daysOfData: 365,
    checkInsCount: 10,
    description: 'Full year - all features utilized',
  },
};

export function getLevelSummary(level: DemoLevel): LevelSummary {
  return LEVEL_SUMMARIES[level];
}

export function getAllLevels(): DemoLevel[] {
  return ['new-user', 'just-started', 'one-month', 'six-months', 'one-year'];
}
