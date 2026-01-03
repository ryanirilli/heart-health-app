// Activity types and data parsing utilities
import { parse } from 'yaml';

export interface Activity {
  date: string; // YYYY-MM-DD format
  state: boolean | string;
  value?: number;
}

export interface ActivityMap {
  [date: string]: Activity;
}

interface YamlActivity {
  date: string;
  state: boolean | string;
  value?: number;
}

type YamlData = Record<string, YamlActivity[]>;

/**
 * Parse activities from YAML file content
 * 
 * Expected format:
 * 2026:
 *   - date: 2026-01-01
 *     state: true
 *     value: 30
 */
export function parseActivities(content: string): ActivityMap {
  const activities: ActivityMap = {};
  
  try {
    const data = parse(content) as YamlData;
    
    // Iterate over each year's entries
    for (const year in data) {
      const entries = data[year];
      if (!Array.isArray(entries)) continue;
      
      for (const entry of entries) {
        if (!entry.date) continue;
        
        activities[entry.date] = {
          date: entry.date,
          state: entry.state ?? false,
          value: entry.value,
        };
      }
    }
  } catch {
    console.error('Failed to parse activities YAML');
  }

  return activities;
}

/**
 * Get all dates in a given month
 */
export function getDatesInMonth(year: number, month: number): Date[] {
  const dates: Date[] = [];
  const lastDay = new Date(year, month + 1, 0);

  for (let d = 1; d <= lastDay.getDate(); d++) {
    dates.push(new Date(year, month, d));
  }

  return dates;
}

/**
 * Get all dates in a year
 */
export function getDatesInYear(year: number): Date[] {
  const dates: Date[] = [];
  for (let month = 0; month < 12; month++) {
    dates.push(...getDatesInMonth(year, month));
  }
  return dates;
}

/**
 * Format date to YYYY-MM-DD string
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get month name
 */
export function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month];
}

/**
 * Get short month name
 */
export function getShortMonthName(month: number): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  return months[month];
}

/**
 * Get day of week (0 = Sunday, 6 = Saturday)
 */
export function getDayOfWeek(date: Date): number {
  return date.getDay();
}

/**
 * Get weeks in a month (for calendar grid layout)
 */
export function getWeeksInMonth(year: number, month: number): (Date | null)[][] {
  const weeks: (Date | null)[][] = [];
  const dates = getDatesInMonth(year, month);
  const firstDayOfWeek = getDayOfWeek(dates[0]);

  let currentWeek: (Date | null)[] = [];

  // Add empty cells for days before the first of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push(null);
  }

  for (const date of dates) {
    currentWeek.push(date);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Fill remaining days in the last week
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

/**
 * Get the range of years that have activity data
 */
export function getYearRange(activities: ActivityMap): { minYear: number; maxYear: number } {
  const years = Object.keys(activities)
    .map(date => parseInt(date.split('-')[0], 10))
    .filter(year => !isNaN(year));

  if (years.length === 0) {
    const currentYear = new Date().getFullYear();
    return { minYear: currentYear, maxYear: currentYear };
  }

  return {
    minYear: Math.min(...years),
    maxYear: Math.max(...years),
  };
}

/**
 * Get the date range (first and last month) for activities
 */
export function getDateRange(activities: ActivityMap): { 
  minYear: number; 
  maxYear: number; 
  minMonth: number; 
  maxMonth: number;
} {
  const dates = Object.keys(activities)
    .map(date => {
      const [year, month] = date.split('-').map(n => parseInt(n, 10));
      return { year, month: month - 1 }; // month is 0-indexed
    })
    .filter(d => !isNaN(d.year) && !isNaN(d.month));

  if (dates.length === 0) {
    const now = new Date();
    return { 
      minYear: now.getFullYear(), 
      maxYear: now.getFullYear(),
      minMonth: now.getMonth(),
      maxMonth: now.getMonth(),
    };
  }

  // Sort by year then month
  dates.sort((a, b) => a.year - b.year || a.month - b.month);

  const first = dates[0];
  const last = dates[dates.length - 1];

  return {
    minYear: first.year,
    maxYear: last.year,
    minMonth: first.month,
    maxMonth: last.month,
  };
}
