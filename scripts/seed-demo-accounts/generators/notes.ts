/**
 * Notes generator - creates activity notes for demo users
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getDaysAgoStr } from '../utils/dates';
import { pickRandom, randomInt } from '../utils/patterns';

interface DbActivityNote {
  user_id: string;
  date: string;
  note: string;
}

// Sample notes that feel authentic and personal
const POSITIVE_NOTES = [
  'Great energy today! Slept really well last night.',
  'Feeling motivated. Morning walk was beautiful.',
  'Best workout in weeks. Everything clicked.',
  'Really proud of myself for staying consistent.',
  'Good day overall. Kept all my habits.',
  'Feeling strong and focused.',
  'Amazing mood today - exercise really helps.',
  'Hit all my goals today!',
  'Productive day. Habits are becoming automatic.',
  'Celebrated a small win with friends.',
];

const NEUTRAL_NOTES = [
  'Average day. Kept going anyway.',
  'Busy but managed to log everything.',
  'Work was hectic but still tracked.',
  'Not my best day but not my worst.',
  'Steady progress. Nothing special.',
  'Just a regular day of showing up.',
  'Maintained the routine despite distractions.',
  'Traveling but kept up with basics.',
];

const REFLECTIVE_NOTES = [
  'Noticed I feel better on days I exercise.',
  'Sleep quality really affects everything.',
  'Weekend routines need work.',
  'Hydration makes a bigger difference than I thought.',
  'Morning walks set the tone for the day.',
  'Tracking helps me stay accountable.',
  'Patterns are becoming clearer.',
  'Six months ago I couldn\'t imagine being here.',
];

const CHALLENGING_NOTES = [
  'Tough day but didn\'t give up.',
  'Missed my walk but hit everything else.',
  'Stress got to me. Tomorrow is new.',
  'Didn\'t sleep well. Pushed through anyway.',
  'Social event made tracking harder.',
  'Low energy but still showed up.',
];

const MILESTONE_NOTES = [
  'One week streak!',
  'First month complete!',
  'Halfway through my challenge!',
  'New personal best today.',
  '100 days of tracking!',
  'Six months of consistency!',
  'One year anniversary coming up!',
];

/**
 * Get note configuration for a level
 */
function getLevelNoteConfig(level: string): { totalDays: number; noteFrequency: number } {
  switch (level) {
    case 'just-started':
      return { totalDays: 7, noteFrequency: 0.1 }; // Very few notes
    case 'one-month':
      return { totalDays: 30, noteFrequency: 0.15 };
    case 'six-months':
      return { totalDays: 180, noteFrequency: 0.12 };
    case 'one-year':
      return { totalDays: 365, noteFrequency: 0.1 };
    default:
      return { totalDays: 0, noteFrequency: 0 };
  }
}

/**
 * Generate a random note based on day progress
 */
function generateNote(dayIndex: number, totalDays: number): string {
  const progress = dayIndex / Math.max(1, totalDays - 1);

  // Milestone notes at specific points
  if (dayIndex === 7) return 'One week streak!';
  if (dayIndex === 30) return 'First month complete!';
  if (dayIndex === 100) return '100 days of tracking!';
  if (dayIndex === 182) return 'Six months of consistency!';
  if (dayIndex === 350) return 'Almost one year!';

  // Weight towards more positive notes as progress increases
  const weights = progress > 0.5
    ? [0.4, 0.25, 0.25, 0.1] // More positive later
    : [0.25, 0.35, 0.25, 0.15]; // More neutral early

  const categories = [POSITIVE_NOTES, NEUTRAL_NOTES, REFLECTIVE_NOTES, CHALLENGING_NOTES];
  const category = pickRandom(categories, weights);

  return pickRandom(category);
}

/**
 * Create activity notes for a demo user based on their level
 */
export async function createNotes(
  supabase: SupabaseClient,
  userId: string,
  level: string
): Promise<number> {
  const config = getLevelNoteConfig(level);

  if (config.totalDays === 0) {
    return 0;
  }

  const notes: DbActivityNote[] = [];

  // Generate notes at semi-random intervals
  for (let i = 0; i < config.totalDays; i++) {
    // Skip most days
    if (Math.random() > config.noteFrequency) continue;

    // But ensure some milestone days have notes
    const isMilestone = [7, 30, 100, 182, 350].includes(i);
    if (!isMilestone && Math.random() > 0.5) continue;

    const dateStr = getDaysAgoStr(config.totalDays - 1 - i);
    const note = generateNote(i, config.totalDays);

    notes.push({
      user_id: userId,
      date: dateStr,
      note,
    });
  }

  if (notes.length === 0) {
    return 0;
  }

  const { error } = await supabase.from('activity_notes').insert(notes);

  if (error) {
    throw new Error(`Failed to create notes: ${error.message}`);
  }

  return notes.length;
}
