// Check-in data processing and analysis
import { format, parseISO, subDays, differenceInDays } from 'date-fns';
import { ActivityType, ActivityTypeMap, getGoalType } from './activityTypes';
import { Activity, ActivityMap, formatDate } from './activities';
import { Goal, GoalMap, getEffectiveValueForGoal } from './goals';
import {
  DataState,
  DataStateAssessment,
  CheckInDataSummary,
  GoalProgress,
  getTodayDateStr,
  getThirtyDaysAgoStr,
} from './checkIns';

// =============================================================================
// RAW DATA TYPES (from database)
// =============================================================================

export interface DbActivity {
  id: string;
  user_id: string;
  activity_type_id: string;
  date: string;
  value: number;
  created_at: string;
}

export interface DbActivityType {
  id: string;
  user_id: string;
  name: string;
  unit: string | null;
  pluralize: boolean;
  goal_type: string | null;
  ui_type: string;
  min_value: number | null;
  max_value: number | null;
  step: number | null;
  button_options: { label: string; value: number }[] | null;
  fixed_value: number | null;
  deleted: boolean;
  display_order: number;
  created_at: string;
}

export interface DbVoiceNote {
  id: string;
  user_id: string;
  date: string;
  storage_path: string;
  duration_seconds: number;
  transcription: string | null;
  transcription_status: string;
  extracted_activities: unknown | null;
  created_at: string;
}

export interface DbGoal {
  id: string;
  user_id: string;
  activity_type_id: string;
  name: string;
  target_value: number;
  icon: string;
  date_type: string;
  tracking_type: string;
  target_date: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface DbAchievement {
  id: string;
  user_id: string;
  goal_id: string;
  period_start: string;
  period_end: string;
  achieved_value: number;
  target_value: number;
  achieved_at: string;
  goals?: { name: string; icon: string } | null;
}

// =============================================================================
// ANALYSIS TYPES
// =============================================================================

export interface ActivityTypeAnalysis {
  typeId: string;
  name: string;
  unit: string;
  goalType: 'positive' | 'negative' | 'neutral';
  totalEntries: number;
  values: number[];
  average: number;
  min: number;
  max: number;
  trend: 'improving' | 'declining' | 'stable';
  streakDays: number;
  mostActiveDay: string;
}

export interface ActivityAnalysis {
  byType: { [typeId: string]: ActivityTypeAnalysis };
  totalDaysLogged: number;
  totalDaysInPeriod: number;
  consistencyScore: number;
  mostConsistentActivity: string | null;
  busiestDay: string;
  quietestDay: string;
  weekOverWeekChange: number;
}

export interface VoiceNoteAnalysis {
  totalNotes: number;
  transcriptions: string[];
  keyPhrases: string[];
  emotionalTone: 'positive' | 'mixed' | 'challenging';
  mentionedActivities: string[];
}

export interface GoalProgressAnalysis {
  goalId: string;
  goalName: string;
  activityTypeName: string;
  targetValue: number;
  dateType: string;
  trackingType: string;
  currentValue: number;
  percentComplete: number;
  isOnTrack: boolean;
  daysRemaining: number | null;
  previousPeriodValue: number | null;
  improvement: number | null;
}

export interface AchievementAnalysis {
  totalEarned: number;
  recentAchievements: {
    goalName: string;
    achievedAt: string;
    achievedValue: number;
    targetValue: number;
    exceededBy: number;
  }[];
  mostAchievedGoal: string | null;
  longestStreak: number;
}

export interface CheckInContext {
  periodStart: string;
  periodEnd: string;
  dataState: DataState;
  activityAnalysis: ActivityAnalysis;
  voiceNoteAnalysis: VoiceNoteAnalysis;
  goalProgress: GoalProgressAnalysis[];
  achievements: AchievementAnalysis;
  highlights: {
    biggestWin: string;
    consistencyStory: string;
    trendingUp: string[];
    needsAttention: string[];
  };
}

// =============================================================================
// DATA STATE ASSESSMENT
// =============================================================================

/**
 * Assess the user's data state to determine what type of check-in to generate.
 */
export function assessDataState(
  activityTypes: DbActivityType[],
  activities: DbActivity[],
  periodDays: number = 30
): DataStateAssessment {
  const activityTypeCount = activityTypes.filter(t => !t.deleted).length;

  if (activityTypeCount === 0) {
    return {
      state: 'no_activity_types',
      activityTypeCount: 0,
      daysWithEntries: 0,
      totalEntries: 0,
    };
  }

  const uniqueDays = new Set(activities.map(a => a.date));
  const daysWithEntries = uniqueDays.size;
  const totalEntries = activities.length;

  if (daysWithEntries === 0) {
    return {
      state: 'no_entries',
      activityTypeCount,
      daysWithEntries: 0,
      totalEntries: 0,
    };
  }

  if (daysWithEntries < 7) {
    return {
      state: 'minimal_data',
      activityTypeCount,
      daysWithEntries,
      totalEntries,
    };
  }

  return {
    state: 'sufficient_data',
    activityTypeCount,
    daysWithEntries,
    totalEntries,
  };
}

// =============================================================================
// DATA CONVERSION
// =============================================================================

/**
 * Convert database activity types to application format.
 */
export function dbActivityTypesToMap(dbTypes: DbActivityType[]): ActivityTypeMap {
  const map: ActivityTypeMap = {};
  for (const t of dbTypes) {
    if (t.deleted) continue;
    map[t.id] = {
      id: t.id,
      name: t.name,
      unit: t.unit || undefined,
      pluralize: t.pluralize,
      goalType: (t.goal_type as 'positive' | 'negative' | 'neutral') || 'positive',
      uiType: (t.ui_type as ActivityType['uiType']) || 'increment',
      minValue: t.min_value ?? undefined,
      maxValue: t.max_value ?? undefined,
      step: t.step ?? undefined,
      buttonOptions: t.button_options || undefined,
      fixedValue: t.fixed_value ?? undefined,
      deleted: t.deleted,
      order: t.display_order,
    };
  }
  return map;
}

/**
 * Convert database activities to application format.
 */
export function dbActivitiesToMap(dbActivities: DbActivity[]): ActivityMap {
  const map: ActivityMap = {};
  for (const a of dbActivities) {
    if (!map[a.date]) {
      map[a.date] = { date: a.date, entries: {} };
    }
    map[a.date].entries[a.activity_type_id] = {
      typeId: a.activity_type_id,
      value: a.value,
    };
  }
  return map;
}

/**
 * Convert database goals to application format.
 */
export function dbGoalsToMap(dbGoals: DbGoal[]): GoalMap {
  const map: GoalMap = {};
  for (const g of dbGoals) {
    map[g.id] = {
      id: g.id,
      activityTypeId: g.activity_type_id,
      name: g.name,
      targetValue: g.target_value,
      icon: g.icon as Goal['icon'],
      dateType: g.date_type as Goal['dateType'],
      trackingType: g.tracking_type as Goal['trackingType'],
      targetDate: g.target_date || undefined,
      startDate: g.start_date || undefined,
      endDate: g.end_date || undefined,
      createdAt: g.created_at.split('T')[0],
    };
  }
  return map;
}

// =============================================================================
// ACTIVITY ANALYSIS
// =============================================================================

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Analyze activities to extract meaningful patterns.
 */
export function analyzeActivities(
  activities: DbActivity[],
  activityTypes: ActivityTypeMap,
  periodStart: string,
  periodEnd: string
): ActivityAnalysis {
  const periodDays = differenceInDays(parseISO(periodEnd), parseISO(periodStart)) + 1;
  const midpoint = subDays(parseISO(periodEnd), Math.floor(periodDays / 2));
  const midpointStr = format(midpoint, 'yyyy-MM-dd');

  // Group activities by type
  const byTypeMap: { [typeId: string]: DbActivity[] } = {};
  const daysWithActivity = new Set<string>();
  const dayOfWeekCounts: { [day: string]: number } = {};

  for (const day of DAY_NAMES) {
    dayOfWeekCounts[day] = 0;
  }

  for (const activity of activities) {
    if (!byTypeMap[activity.activity_type_id]) {
      byTypeMap[activity.activity_type_id] = [];
    }
    byTypeMap[activity.activity_type_id].push(activity);
    daysWithActivity.add(activity.date);

    const dayOfWeek = DAY_NAMES[parseISO(activity.date).getDay()];
    dayOfWeekCounts[dayOfWeek]++;
  }

  // Analyze each activity type
  const byType: { [typeId: string]: ActivityTypeAnalysis } = {};
  let maxStreak = 0;
  let mostConsistentActivity: string | null = null;

  for (const [typeId, typeActivities] of Object.entries(byTypeMap)) {
    const activityType = activityTypes[typeId];
    if (!activityType) continue;

    const values = typeActivities.map(a => a.value);
    const sum = values.reduce((acc, v) => acc + v, 0);
    const average = values.length > 0 ? sum / values.length : 0;

    // Calculate trend (first half vs second half)
    const firstHalf = typeActivities.filter(a => a.date < midpointStr);
    const secondHalf = typeActivities.filter(a => a.date >= midpointStr);
    const firstHalfAvg = firstHalf.length > 0
      ? firstHalf.reduce((acc, a) => acc + a.value, 0) / firstHalf.length
      : 0;
    const secondHalfAvg = secondHalf.length > 0
      ? secondHalf.reduce((acc, a) => acc + a.value, 0) / secondHalf.length
      : 0;

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    const goalType = getGoalType(activityType);

    if (firstHalfAvg > 0) {
      const changePercent = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
      if (goalType === 'negative') {
        // For negative goals, lower is better
        if (changePercent <= -10) trend = 'improving';
        else if (changePercent >= 10) trend = 'declining';
      } else {
        // For positive/neutral goals, higher is better
        if (changePercent >= 10) trend = 'improving';
        else if (changePercent <= -10) trend = 'declining';
      }
    }

    // Calculate streak (consecutive days from today going backwards)
    const sortedDates = [...new Set(typeActivities.map(a => a.date))].sort().reverse();
    let streak = 0;
    const today = getTodayDateStr();
    let expectedDate = today;

    for (const date of sortedDates) {
      if (date === expectedDate) {
        streak++;
        expectedDate = format(subDays(parseISO(expectedDate), 1), 'yyyy-MM-dd');
      } else if (date < expectedDate) {
        break;
      }
    }

    if (streak > maxStreak) {
      maxStreak = streak;
      mostConsistentActivity = activityType.name;
    }

    // Find most active day of week for this activity
    const dayOfWeekForType: { [day: string]: number } = {};
    for (const day of DAY_NAMES) {
      dayOfWeekForType[day] = 0;
    }
    for (const activity of typeActivities) {
      const dayOfWeek = DAY_NAMES[parseISO(activity.date).getDay()];
      dayOfWeekForType[dayOfWeek]++;
    }
    const mostActiveDay = Object.entries(dayOfWeekForType)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Monday';

    byType[typeId] = {
      typeId,
      name: activityType.name,
      unit: activityType.unit || '',
      goalType: goalType,
      totalEntries: typeActivities.length,
      values,
      average,
      min: Math.min(...values),
      max: Math.max(...values),
      trend,
      streakDays: streak,
      mostActiveDay,
    };
  }

  // Calculate week-over-week change
  const lastWeekStart = format(subDays(parseISO(periodEnd), 13), 'yyyy-MM-dd');
  const lastWeekEnd = format(subDays(parseISO(periodEnd), 7), 'yyyy-MM-dd');
  const thisWeekStart = format(subDays(parseISO(periodEnd), 6), 'yyyy-MM-dd');

  const lastWeekActivities = activities.filter(
    a => a.date >= lastWeekStart && a.date <= lastWeekEnd
  ).length;
  const thisWeekActivities = activities.filter(a => a.date >= thisWeekStart).length;

  const weekOverWeekChange = lastWeekActivities > 0
    ? ((thisWeekActivities - lastWeekActivities) / lastWeekActivities) * 100
    : thisWeekActivities > 0 ? 100 : 0;

  // Find busiest and quietest days
  const sortedDays = Object.entries(dayOfWeekCounts).sort((a, b) => b[1] - a[1]);
  const busiestDay = sortedDays[0]?.[0] || 'Monday';
  const quietestDay = sortedDays[sortedDays.length - 1]?.[0] || 'Sunday';

  return {
    byType,
    totalDaysLogged: daysWithActivity.size,
    totalDaysInPeriod: periodDays,
    consistencyScore: Math.round((daysWithActivity.size / periodDays) * 100),
    mostConsistentActivity,
    busiestDay,
    quietestDay,
    weekOverWeekChange: Math.round(weekOverWeekChange),
  };
}

// =============================================================================
// VOICE NOTE ANALYSIS
// =============================================================================

/**
 * Analyze voice notes to extract themes.
 */
export function analyzeVoiceNotes(
  voiceNotes: DbVoiceNote[],
  activityTypes: ActivityTypeMap
): VoiceNoteAnalysis {
  const transcriptions = voiceNotes
    .filter(vn => vn.transcription && vn.transcription_status === 'completed')
    .map(vn => vn.transcription!)
    .filter(t => t.trim().length > 0);

  // Extract key phrases (sentences that express feelings or achievements)
  const keyPhrases: string[] = [];
  const feelingWords = ['feel', 'felt', 'feeling', 'proud', 'happy', 'struggled', 'difficult', 'great', 'amazing', 'tired', 'energetic'];

  for (const transcription of transcriptions) {
    const sentences = transcription.split(/[.!?]+/).filter(s => s.trim().length > 10);
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      if (feelingWords.some(word => lower.includes(word))) {
        keyPhrases.push(sentence.trim());
      }
    }
  }

  // Determine emotional tone based on word frequency
  const allText = transcriptions.join(' ').toLowerCase();
  const positiveWords = ['great', 'good', 'happy', 'proud', 'amazing', 'wonderful', 'excellent', 'better', 'improved'];
  const challengingWords = ['hard', 'difficult', 'struggled', 'tired', 'stressed', 'tough', 'challenging', 'worse'];

  let positiveCount = 0;
  let challengingCount = 0;

  for (const word of positiveWords) {
    positiveCount += (allText.match(new RegExp(word, 'g')) || []).length;
  }
  for (const word of challengingWords) {
    challengingCount += (allText.match(new RegExp(word, 'g')) || []).length;
  }

  let emotionalTone: 'positive' | 'mixed' | 'challenging' = 'mixed';
  if (positiveCount > challengingCount * 2) emotionalTone = 'positive';
  else if (challengingCount > positiveCount * 2) emotionalTone = 'challenging';

  // Find mentioned activities
  const mentionedActivities: string[] = [];
  const activityNames = Object.values(activityTypes).map(t => t.name.toLowerCase());

  for (const name of activityNames) {
    if (allText.includes(name)) {
      mentionedActivities.push(name);
    }
  }

  return {
    totalNotes: voiceNotes.length,
    transcriptions,
    keyPhrases: keyPhrases.slice(0, 5),
    emotionalTone,
    mentionedActivities: [...new Set(mentionedActivities)],
  };
}

// =============================================================================
// GOAL PROGRESS ANALYSIS
// =============================================================================

/**
 * Analyze goal progress.
 */
export function analyzeGoalProgress(
  goals: GoalMap,
  activityTypes: ActivityTypeMap,
  activities: ActivityMap,
  todayStr: string
): GoalProgressAnalysis[] {
  const results: GoalProgressAnalysis[] = [];

  for (const goal of Object.values(goals)) {
    const activityType = activityTypes[goal.activityTypeId];
    if (!activityType) continue;

    const valueResult = getEffectiveValueForGoal(goal, activityType, activities, todayStr);
    const percentComplete = goal.targetValue > 0
      ? Math.min(100, Math.round((valueResult.effectiveValue / goal.targetValue) * 100))
      : 0;

    // Calculate days remaining for date-based goals
    let daysRemaining: number | null = null;
    if (goal.dateType === 'by_date' && goal.targetDate) {
      daysRemaining = differenceInDays(parseISO(goal.targetDate), parseISO(todayStr));
    } else if (goal.dateType === 'date_range' && goal.endDate) {
      daysRemaining = differenceInDays(parseISO(goal.endDate), parseISO(todayStr));
    }

    // Determine if on track
    const isOnTrack = percentComplete >= 50 || valueResult.allDaysMet;

    results.push({
      goalId: goal.id,
      goalName: goal.name,
      activityTypeName: activityType.name,
      targetValue: goal.targetValue,
      dateType: goal.dateType,
      trackingType: goal.trackingType,
      currentValue: valueResult.effectiveValue,
      percentComplete,
      isOnTrack,
      daysRemaining,
      previousPeriodValue: null, // Could be calculated if we had historical data
      improvement: null,
    });
  }

  return results;
}

// =============================================================================
// ACHIEVEMENT ANALYSIS
// =============================================================================

/**
 * Analyze achievements.
 */
export function analyzeAchievements(achievements: DbAchievement[]): AchievementAnalysis {
  const recentAchievements = achievements.map(a => ({
    goalName: a.goals?.name || 'Unknown Goal',
    achievedAt: a.achieved_at,
    achievedValue: a.achieved_value,
    targetValue: a.target_value,
    exceededBy: Math.max(0, a.achieved_value - a.target_value),
  }));

  // Find most achieved goal
  const goalCounts: { [name: string]: number } = {};
  for (const a of recentAchievements) {
    goalCounts[a.goalName] = (goalCounts[a.goalName] || 0) + 1;
  }
  const mostAchievedGoal = Object.entries(goalCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Calculate longest streak (simplified - consecutive periods)
  // This would need more sophisticated logic for actual streak calculation
  const longestStreak = Math.min(recentAchievements.length, 7);

  return {
    totalEarned: achievements.length,
    recentAchievements: recentAchievements.slice(0, 10),
    mostAchievedGoal,
    longestStreak,
  };
}

// =============================================================================
// COMPILE CONTEXT
// =============================================================================

/**
 * Compile all analysis into a context object for OpenAI.
 */
export function compileCheckInContext(
  dataState: DataState,
  dbActivities: DbActivity[],
  dbActivityTypes: DbActivityType[],
  dbVoiceNotes: DbVoiceNote[],
  dbGoals: DbGoal[],
  dbAchievements: DbAchievement[],
  periodStart: string,
  periodEnd: string
): CheckInContext {
  const activityTypes = dbActivityTypesToMap(dbActivityTypes);
  const activities = dbActivitiesToMap(dbActivities);
  const goals = dbGoalsToMap(dbGoals);

  const activityAnalysis = analyzeActivities(dbActivities, activityTypes, periodStart, periodEnd);
  const voiceNoteAnalysis = analyzeVoiceNotes(dbVoiceNotes, activityTypes);
  const goalProgress = analyzeGoalProgress(goals, activityTypes, activities, periodEnd);
  const achievements = analyzeAchievements(dbAchievements);

  // Compute highlights
  const trendingUp = Object.values(activityAnalysis.byType)
    .filter(a => a.trend === 'improving')
    .map(a => a.name);

  const needsAttention = goalProgress
    .filter(g => !g.isOnTrack && g.percentComplete < 50)
    .map(g => g.goalName);

  // Determine biggest win
  let biggestWin = 'Starting your health tracking journey';
  if (achievements.totalEarned > 0) {
    biggestWin = `Earned ${achievements.totalEarned} achievement${achievements.totalEarned > 1 ? 's' : ''}`;
  } else if (trendingUp.length > 0) {
    biggestWin = `Improving in ${trendingUp[0]}`;
  } else if (activityAnalysis.mostConsistentActivity) {
    biggestWin = `Consistent with ${activityAnalysis.mostConsistentActivity}`;
  }

  const consistencyStory = `Logged activities on ${activityAnalysis.totalDaysLogged} of ${activityAnalysis.totalDaysInPeriod} days (${activityAnalysis.consistencyScore}% consistency)`;

  return {
    periodStart,
    periodEnd,
    dataState,
    activityAnalysis,
    voiceNoteAnalysis,
    goalProgress,
    achievements,
    highlights: {
      biggestWin,
      consistencyStory,
      trendingUp,
      needsAttention,
    },
  };
}

// =============================================================================
// DATA SUMMARY
// =============================================================================

/**
 * Create a lightweight data summary for storage.
 */
export function createDataSummary(context: CheckInContext): CheckInDataSummary {
  const { activityAnalysis, voiceNoteAnalysis, goalProgress, achievements } = context;

  const maxStreak = Object.values(activityAnalysis.byType).reduce(
    (max, a) => Math.max(max, a.streakDays),
    0
  );

  return {
    totalActivitiesLogged: activityAnalysis.totalDaysLogged,
    uniqueActivityTypes: Object.keys(activityAnalysis.byType).length,
    mostTrackedActivity: activityAnalysis.mostConsistentActivity,
    activityStreak: maxStreak,
    voiceNotesCount: voiceNoteAnalysis.totalNotes,
    transcriptionHighlights: voiceNoteAnalysis.keyPhrases.slice(0, 3),
    goalsProgress: goalProgress.map(g => ({
      goalId: g.goalId,
      goalName: g.goalName,
      targetValue: g.targetValue,
      achievedValue: g.currentValue,
      percentComplete: g.percentComplete,
    })),
    achievementsEarned: achievements.totalEarned,
    achievementNames: achievements.recentAchievements.map(a => a.goalName),
  };
}
