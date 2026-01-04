// Activity types and data parsing utilities
import { parse } from 'yaml';
import { ActivityType, ActivityTypeMap } from './activityTypes';

/** A single entry for one activity type on a specific date */
export interface ActivityEntry {
  /** The activity type ID this entry belongs to */
  typeId: string;
  /** The recorded value */
  value: number;
}

/** All activity entries for a single date */
export interface Activity {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Map of activity type ID to entry */
  entries: { [typeId: string]: ActivityEntry };
}

export interface ActivityMap {
  [date: string]: Activity;
}

/** YAML structure for activity types */
interface YamlActivityType {
  id: string;
  name: string;
  unit?: string;
  pluralize?: boolean;
  isNegative?: boolean;
  goalType?: 'positive' | 'negative' | 'neutral';
  uiType?: 'increment' | 'slider' | 'buttonGroup';
  minValue?: number;
  maxValue?: number;
  step?: number;
  buttonOptions?: { label: string; value: number }[];
  deleted?: boolean;
  order?: number;
}

/** YAML structure for activity entries */
interface YamlActivityEntry {
  date: string;
  entries: { [typeId: string]: number };
}

/** Root YAML data structure */
interface YamlData {
  types?: YamlActivityType[];
  activities?: Record<string, YamlActivityEntry[]>;
}

/**
 * Parse activity types from YAML data
 */
export function parseActivityTypes(data: YamlData): ActivityTypeMap {
  const types: ActivityTypeMap = {};
  
  if (data.types && Array.isArray(data.types)) {
    data.types.forEach((t, index) => {
      types[t.id] = {
        id: t.id,
        name: t.name,
        unit: t.unit,
        pluralize: t.pluralize,
        isNegative: t.isNegative,
        goalType: t.goalType,
        uiType: t.uiType ?? 'increment',
        minValue: t.minValue,
        maxValue: t.maxValue,
        step: t.step,
        buttonOptions: t.buttonOptions,
        deleted: t.deleted ?? false,
        order: t.order ?? index,
      };
    });
  }
  
  return types;
}

/**
 * Parse activities from YAML data
 */
export function parseActivities(data: YamlData): ActivityMap {
  const activities: ActivityMap = {};
  
  if (data.activities) {
    for (const year in data.activities) {
      const entries = data.activities[year];
      if (!Array.isArray(entries)) continue;
      
      for (const entry of entries) {
        if (!entry.date) continue;
        
        const activityEntries: { [typeId: string]: ActivityEntry } = {};
        
        if (entry.entries) {
          for (const typeId in entry.entries) {
            activityEntries[typeId] = {
              typeId,
              value: entry.entries[typeId],
            };
          }
        }
        
        activities[entry.date] = {
          date: entry.date,
          entries: activityEntries,
        };
      }
    }
  }
  
  return activities;
}

/**
 * Parse the complete YAML content
 */
export function parseYamlContent(content: string): { types: ActivityTypeMap; activities: ActivityMap } {
  try {
    const data = parse(content) as YamlData;
    return {
      types: parseActivityTypes(data),
      activities: parseActivities(data),
    };
  } catch {
    console.error('Failed to parse activities YAML');
    return { types: {}, activities: {} };
  }
}

/**
 * Check if a date has any activity data
 */
export function hasActivityData(activity?: Activity): boolean {
  if (!activity) return false;
  return Object.keys(activity.entries).length > 0;
}

/**
 * Get the count of entries for a date
 */
export function getEntryCount(activity?: Activity): number {
  if (!activity) return 0;
  return Object.keys(activity.entries).length;
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
