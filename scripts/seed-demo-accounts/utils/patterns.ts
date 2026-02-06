/**
 * Pattern utilities for generating realistic demo data
 * Uses seeded random for reproducible results
 */

import { isWeekend, getDayIndex } from './dates';

// Simple seeded random number generator (Mulberry32)
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Create a seeded random generator with a fixed seed for reproducibility
const seededRandom = mulberry32(42);

/**
 * Get a seeded random number between 0 and 1
 */
export function random(): number {
  return seededRandom();
}

/**
 * Get a seeded random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

/**
 * Get a seeded random float between min and max
 */
export function randomFloat(min: number, max: number): number {
  return random() * (max - min) + min;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Check if an event should occur based on probability (0-1)
 */
export function shouldOccur(probability: number): boolean {
  return random() < probability;
}

/**
 * Generate a value with natural variance
 * @param base Base value
 * @param variance Maximum variance (±)
 */
export function withVariance(base: number, variance: number): number {
  return base + (random() - 0.5) * 2 * variance;
}

/**
 * Generate days to skip (gaps in data)
 * @param totalDays Total number of days
 * @param gapProbability Probability of skipping a day (0-1)
 * @param maxConsecutiveGap Maximum consecutive days to skip
 */
export function generateGaps(
  totalDays: number,
  gapProbability: number,
  maxConsecutiveGap: number = 3
): number[] {
  const gaps: number[] = [];
  let consecutiveGaps = 0;

  for (let i = 0; i < totalDays; i++) {
    if (consecutiveGaps >= maxConsecutiveGap) {
      consecutiveGaps = 0;
      continue;
    }

    if (shouldOccur(gapProbability)) {
      gaps.push(i);
      consecutiveGaps++;
    } else {
      consecutiveGaps = 0;
    }
  }

  return gaps;
}

export interface PatternConfig {
  /** Base value at the start */
  baseValue: number;
  /** Value improvement over time (added linearly) */
  improvement: number;
  /** Day-to-day variance (±) */
  variance: number;
  /** Weekend boost (added on weekends) */
  weekendBoost: number;
  /** Minimum allowed value */
  min: number;
  /** Maximum allowed value */
  max: number;
  /** New year resolution boost (first 30 days) */
  newYearBoost?: number;
}

/**
 * Generate a value following realistic patterns
 */
export function generatePatternValue(
  dateStr: string,
  startDateStr: string,
  totalDays: number,
  config: PatternConfig
): number {
  const dayIndex = getDayIndex(startDateStr, dateStr);
  const progress = dayIndex / Math.max(1, totalDays - 1);

  // Base value with improvement trend
  let value = config.baseValue + config.improvement * progress;

  // Weekend boost
  if (isWeekend(dateStr)) {
    value += config.weekendBoost;
  }

  // New year boost (first 30 days)
  if (config.newYearBoost && dayIndex < 30) {
    value += config.newYearBoost * (1 - dayIndex / 30);
  }

  // Natural variance
  value = withVariance(value, config.variance);

  // Clamp to bounds
  return clamp(Math.round(value), config.min, config.max);
}

/**
 * Generate a boolean value with trending probability
 * @param dayIndex Current day index
 * @param totalDays Total days
 * @param startProbability Starting probability
 * @param endProbability Ending probability
 */
export function generateTrendingBoolean(
  dayIndex: number,
  totalDays: number,
  startProbability: number,
  endProbability: number
): boolean {
  const progress = dayIndex / Math.max(1, totalDays - 1);
  const probability = startProbability + (endProbability - startProbability) * progress;
  return shouldOccur(probability);
}

/**
 * Pick a random item from an array with optional weights
 */
export function pickRandom<T>(items: T[], weights?: number[]): T {
  if (!weights) {
    return items[Math.floor(random() * items.length)];
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let threshold = random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    threshold -= weights[i];
    if (threshold <= 0) {
      return items[i];
    }
  }

  return items[items.length - 1];
}

/**
 * Generate mood value (1-5) with realistic patterns
 * Mood tends to be higher on weekends and improves slightly over time
 */
export function generateMoodValue(
  dateStr: string,
  startDateStr: string,
  totalDays: number
): number {
  const dayIndex = getDayIndex(startDateStr, dateStr);
  const progress = dayIndex / Math.max(1, totalDays - 1);

  // Mood options with values: Great(5), Good(4), Okay(3), Low(2), Rough(1)
  // Weighted probabilities that improve over time
  const baseWeights = [0.15, 0.35, 0.30, 0.15, 0.05]; // Starting weights
  const improvedWeights = [0.25, 0.40, 0.25, 0.08, 0.02]; // Improved weights

  const weights = baseWeights.map(
    (base, i) => base + (improvedWeights[i] - base) * progress
  );

  // Weekend boost - increase probability of Great and Good
  if (isWeekend(dateStr)) {
    weights[0] += 0.1; // Great
    weights[1] += 0.1; // Good
    weights[2] -= 0.1; // Okay
    weights[3] -= 0.05; // Low
    weights[4] -= 0.05; // Rough
  }

  const values = [5, 4, 3, 2, 1];
  return pickRandom(values, weights);
}
