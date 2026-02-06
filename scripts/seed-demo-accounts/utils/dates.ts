/**
 * Date utilities for generating demo data
 */

import { format, subDays, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export function formatDateStr(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function getToday(): Date {
  return new Date();
}

export function getTodayStr(): string {
  return formatDateStr(getToday());
}

export function getDaysAgo(days: number): Date {
  return subDays(getToday(), days);
}

export function getDaysAgoStr(days: number): string {
  return formatDateStr(getDaysAgo(days));
}

export function getDaysFromNow(days: number): Date {
  return addDays(getToday(), days);
}

/**
 * Generate an array of date strings from startDaysAgo to today
 * @param startDaysAgo Number of days ago to start from
 * @param skipDays Optional array of day indices to skip (0-based from start)
 */
export function generateDateRange(startDaysAgo: number, skipDays: number[] = []): string[] {
  const dates: string[] = [];
  for (let i = startDaysAgo; i >= 0; i--) {
    const dayIndex = startDaysAgo - i;
    if (!skipDays.includes(dayIndex)) {
      dates.push(getDaysAgoStr(i));
    }
  }
  return dates;
}

/**
 * Get the day of week (0 = Sunday, 6 = Saturday)
 */
export function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getDay();
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(dateStr: string): boolean {
  const day = getDayOfWeek(dateStr);
  return day === 0 || day === 6;
}

/**
 * Get the start of the week (Monday) for a given date
 */
export function getWeekStartStr(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return formatDateStr(startOfWeek(date, { weekStartsOn: 1 }));
}

/**
 * Get the end of the week (Sunday) for a given date
 */
export function getWeekEndStr(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return formatDateStr(endOfWeek(date, { weekStartsOn: 1 }));
}

/**
 * Get the start of the month for a given date
 */
export function getMonthStartStr(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return formatDateStr(startOfMonth(date));
}

/**
 * Get the end of the month for a given date
 */
export function getMonthEndStr(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return formatDateStr(endOfMonth(date));
}

/**
 * Calculate the day index (0-based) from a start date
 */
export function getDayIndex(startDateStr: string, currentDateStr: string): number {
  const start = new Date(startDateStr + 'T12:00:00');
  const current = new Date(currentDateStr + 'T12:00:00');
  return Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get month and year from date string
 */
export function getMonthYear(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return format(date, 'MMMM yyyy');
}
