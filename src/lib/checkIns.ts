// Check-in definitions and utilities
import { format, subDays, parseISO } from 'date-fns';

// =============================================================================
// DATA STATE TYPES
// =============================================================================

/**
 * Data state determines the type of check-in to generate:
 * - 'no_activity_types': User hasn't created any activities yet - block generation
 * - 'no_entries': Has activity types but zero logged entries - "Getting Started" check-in
 * - 'minimal_data': Has entries but < 7 days of data - "Building Momentum" check-in
 * - 'sufficient_data': Has 7+ days of data - full analysis check-in
 */
export type DataState =
  | 'no_activity_types'
  | 'no_entries'
  | 'minimal_data'
  | 'sufficient_data';

export interface DataStateAssessment {
  state: DataState;
  activityTypeCount: number;
  daysWithEntries: number;
  totalEntries: number;
}

// =============================================================================
// CHECK-IN ANALYSIS TYPES
// =============================================================================

/**
 * A web resource found via search, tailored to the user's activities.
 */
export interface CheckInResource {
  title: string;
  url: string;
  description: string;
  type: 'article' | 'subreddit' | 'video' | 'other';
}

/**
 * The AI-generated analysis content for a check-in.
 * Order matters - this is the display order in the UI.
 */
export interface CheckInAnalysis {
  /**
   * The heart of the check-in. 3-5 paragraphs of warm, personal reflection
   * on what their activity patterns MEAN. Not a data summary, but an encouraging
   * interpretation that makes them feel seen and understood.
   */
  overallSummary: string;

  /** Specific achievements and wins to celebrate */
  celebrations: string[];

  /** 3-5 key insights about patterns and behaviors */
  insights: string[];

  /** Actionable recommendations (max 3) */
  recommendations: string[];

  /** Web-searched resources tailored to their activities (max 3) */
  resources: CheckInResource[];

  /** One specific focus area for the coming week */
  weeklyFocus: string;

  /** Closing inspiring message or quote */
  motivation: string;
}

// =============================================================================
// CHECK-IN DATA SUMMARY TYPES
// =============================================================================

/**
 * Progress information for a single goal.
 */
export interface GoalProgress {
  goalId: string;
  goalName: string;
  targetValue: number;
  achievedValue: number;
  percentComplete: number;
}

/**
 * Lightweight summary of the data that was analyzed.
 * Stored in the database for display without re-fetching.
 */
export interface CheckInDataSummary {
  totalActivitiesLogged: number;
  uniqueActivityTypes: number;
  mostTrackedActivity: string | null;
  activityStreak: number;
  voiceNotesCount: number;
  transcriptionHighlights: string[];
  goalsProgress: GoalProgress[];
  achievementsEarned: number;
  achievementNames: string[];
}

// =============================================================================
// CHECK-IN ENTITY TYPES
// =============================================================================

/**
 * Check-in status for generation tracking.
 */
export type CheckInStatus = 'pending' | 'generating' | 'completed' | 'failed';

/**
 * Check-in entity as stored in the database.
 */
export interface DbCheckIn {
  id: string;
  user_id: string;
  created_at: string;
  period_start: string;
  period_end: string;
  analysis: CheckInAnalysis;
  data_summary: CheckInDataSummary;
  status: CheckInStatus;
  error_message: string | null;
}

/**
 * Check-in entity as used in the application (camelCase).
 */
export interface CheckIn {
  id: string;
  userId: string;
  createdAt: string;
  periodStart: string;
  periodEnd: string;
  analysis: CheckInAnalysis;
  dataSummary: CheckInDataSummary;
  status: CheckInStatus;
  errorMessage: string | null;
}

/**
 * Map of check-ins by ID.
 */
export interface CheckInMap {
  [id: string]: CheckIn;
}

// =============================================================================
// STREAMING STATUS TYPES
// =============================================================================

/**
 * Status updates during check-in generation.
 */
export type CheckInStreamingStatusType =
  | 'checking_rate_limit'
  | 'aggregating_data'
  | 'analyzing'
  | 'searching'
  | 'generating'
  | 'streaming_content'
  | 'saving'
  | 'complete'
  | 'error';

/**
 * Partial check-in analysis for streaming updates.
 * All fields are optional since they stream in progressively.
 */
export interface PartialCheckInAnalysis {
  overallSummary?: string;
  celebrations?: string[];
  insights?: string[];
  recommendations?: string[];
  resources?: CheckInResource[];
  weeklyFocus?: string;
  motivation?: string;
}

export interface CheckInStreamingStatus {
  status: CheckInStreamingStatusType;
  message: string;
  data?: CheckIn;
  partialAnalysis?: PartialCheckInAnalysis;
  statusCode?: number;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Response from GET /api/check-ins
 */
export interface CheckInsResponse {
  checkIns: CheckIn[];
  total: number;
  canGenerateNew: boolean;
  nextAvailableDate: string | null;
  dataState: DataState;
  dataStateDetails: {
    activityTypeCount: number;
    daysWithEntries: number;
    totalEntries: number;
  };
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Convert a database check-in to application format.
 */
export function dbCheckInToCheckIn(db: DbCheckIn): CheckIn {
  return {
    id: db.id,
    userId: db.user_id,
    createdAt: db.created_at,
    periodStart: db.period_start,
    periodEnd: db.period_end,
    analysis: db.analysis,
    dataSummary: db.data_summary,
    status: db.status,
    errorMessage: db.error_message,
  };
}

/**
 * Get today's date as YYYY-MM-DD string.
 */
export function getTodayDateStr(): string {
  const today = new Date();
  return format(today, 'yyyy-MM-dd');
}

/**
 * Get the date 30 days ago as YYYY-MM-DD string.
 */
export function getThirtyDaysAgoStr(): string {
  const thirtyDaysAgo = subDays(new Date(), 30);
  return format(thirtyDaysAgo, 'yyyy-MM-dd');
}

/**
 * Get the date 7 days ago as YYYY-MM-DD string.
 */
export function getSevenDaysAgoStr(): string {
  const sevenDaysAgo = subDays(new Date(), 7);
  return format(sevenDaysAgo, 'yyyy-MM-dd');
}

/**
 * Check if a user can generate a new check-in (rate limiting).
 * Users can only generate one check-in per week.
 */
export function canGenerateCheckIn(
  lastCheckInDate: string | null,
  dataState: DataState
): { canGenerate: boolean; nextAvailableDate: string | null } {
  // Cannot generate if no activity types exist
  if (dataState === 'no_activity_types') {
    return { canGenerate: false, nextAvailableDate: null };
  }

  // Can generate if no previous check-ins
  if (!lastCheckInDate) {
    return { canGenerate: true, nextAvailableDate: null };
  }

  const lastDate = parseISO(lastCheckInDate);
  const sevenDaysAfterLast = subDays(new Date(), -7);
  sevenDaysAfterLast.setHours(0, 0, 0, 0);

  const lastDatePlusSeven = new Date(lastDate);
  lastDatePlusSeven.setDate(lastDatePlusSeven.getDate() + 7);
  lastDatePlusSeven.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (today >= lastDatePlusSeven) {
    return { canGenerate: true, nextAvailableDate: null };
  }

  return {
    canGenerate: false,
    nextAvailableDate: format(lastDatePlusSeven, 'yyyy-MM-dd'),
  };
}

/**
 * Format a date for display in check-in UI.
 */
export function formatCheckInDate(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, 'MMMM d, yyyy');
}

/**
 * Format a date range for display.
 */
export function formatCheckInPeriod(startDate: string, endDate: string): string {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
}

/**
 * Status messages for streaming UI.
 */
export const STREAMING_STATUS_MESSAGES: Record<CheckInStreamingStatusType, string> = {
  checking_rate_limit: 'Checking availability...',
  aggregating_data: 'Gathering your health data...',
  analyzing: 'Analyzing your progress...',
  searching: 'Finding personalized resources...',
  generating: 'Creating your check-in...',
  streaming_content: 'Writing your check-in...',
  saving: 'Saving your check-in...',
  complete: 'Done!',
  error: 'Something went wrong',
};
