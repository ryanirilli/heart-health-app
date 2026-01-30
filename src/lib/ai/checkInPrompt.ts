import { CheckInContext, ActivityTypeAnalysis } from '@/lib/checkInDataProcessor';
import { DataState } from '@/lib/checkIns';

// =============================================================================
// PROMPT VARIANTS
// =============================================================================

type PromptVariant = 'getting_started' | 'building_momentum' | 'full_analysis';

function getPromptVariant(dataState: DataState): PromptVariant {
  switch (dataState) {
    case 'no_entries':
      return 'getting_started';
    case 'minimal_data':
      return 'building_momentum';
    case 'sufficient_data':
    default:
      return 'full_analysis';
  }
}

// =============================================================================
// FORMATTING HELPERS
// =============================================================================

function formatActivitySummary(analysis: CheckInContext['activityAnalysis']): string {
  if (Object.keys(analysis.byType).length === 0) {
    return 'No activities logged during this period.';
  }

  const lines: string[] = [];

  for (const [typeId, typeAnalysis] of Object.entries(analysis.byType)) {
    const trendEmoji = typeAnalysis.trend === 'improving' ? '📈' :
                       typeAnalysis.trend === 'declining' ? '📉' : '➡️';

    lines.push(`### ${typeAnalysis.name}`);
    lines.push(`- Entries: ${typeAnalysis.totalEntries} times logged`);
    lines.push(`- Average: ${typeAnalysis.average.toFixed(1)} ${typeAnalysis.unit}`);
    lines.push(`- Range: ${typeAnalysis.min} - ${typeAnalysis.max} ${typeAnalysis.unit}`);
    lines.push(`- Trend: ${trendEmoji} ${typeAnalysis.trend}`);
    lines.push(`- Current streak: ${typeAnalysis.streakDays} days`);
    lines.push(`- Most active on: ${typeAnalysis.mostActiveDay}s`);
    lines.push('');
  }

  lines.push('### Overall Patterns');
  lines.push(`- Logged activities on ${analysis.totalDaysLogged} of ${analysis.totalDaysInPeriod} days`);
  lines.push(`- Consistency score: ${analysis.consistencyScore}%`);
  lines.push(`- Busiest day of week: ${analysis.busiestDay}`);
  lines.push(`- Quietest day of week: ${analysis.quietestDay}`);
  lines.push(`- Week-over-week change: ${analysis.weekOverWeekChange > 0 ? '+' : ''}${analysis.weekOverWeekChange}%`);

  return lines.join('\n');
}

function formatVoiceNotes(analysis: CheckInContext['voiceNoteAnalysis']): string {
  if (analysis.totalNotes === 0) {
    return 'No voice notes recorded during this period.';
  }

  const lines: string[] = [];
  lines.push(`Total voice notes: ${analysis.totalNotes}`);
  lines.push(`Overall emotional tone: ${analysis.emotionalTone}`);

  if (analysis.keyPhrases.length > 0) {
    lines.push('\n**Key phrases from their voice notes:**');
    for (const phrase of analysis.keyPhrases) {
      lines.push(`- "${phrase}"`);
    }
  }

  if (analysis.transcriptions.length > 0) {
    lines.push('\n**Full transcriptions (for context):**');
    for (let i = 0; i < Math.min(analysis.transcriptions.length, 5); i++) {
      lines.push(`\n[Voice Note ${i + 1}]: "${analysis.transcriptions[i]}"`);
    }
  }

  return lines.join('\n');
}

function formatGoalProgress(progress: CheckInContext['goalProgress']): string {
  if (progress.length === 0) {
    return 'No goals set up yet.';
  }

  const lines: string[] = [];

  for (const goal of progress) {
    const statusEmoji = goal.isOnTrack ? '✅' : '⚠️';
    lines.push(`### ${goal.goalName} ${statusEmoji}`);
    lines.push(`- Activity: ${goal.activityTypeName}`);
    lines.push(`- Target: ${goal.targetValue}`);
    lines.push(`- Current: ${goal.currentValue.toFixed(1)} (${goal.percentComplete}% complete)`);
    lines.push(`- Status: ${goal.isOnTrack ? 'On track' : 'Needs attention'}`);
    if (goal.daysRemaining !== null) {
      lines.push(`- Days remaining: ${goal.daysRemaining}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function formatAchievements(achievements: CheckInContext['achievements']): string {
  if (achievements.totalEarned === 0) {
    return 'No achievements earned during this period.';
  }

  const lines: string[] = [];
  lines.push(`Total achievements earned: ${achievements.totalEarned}`);

  if (achievements.mostAchievedGoal) {
    lines.push(`Most achieved goal: ${achievements.mostAchievedGoal}`);
  }

  if (achievements.recentAchievements.length > 0) {
    lines.push('\n**Recent achievements:**');
    for (const achievement of achievements.recentAchievements.slice(0, 5)) {
      const exceeded = achievement.exceededBy > 0
        ? ` (exceeded by ${achievement.exceededBy}!)`
        : '';
      lines.push(`- ${achievement.goalName}: ${achievement.achievedValue}/${achievement.targetValue}${exceeded}`);
    }
  }

  return lines.join('\n');
}

function formatActivityTypes(types: { name: string; unit: string }[]): string {
  if (types.length === 0) {
    return 'No activity types configured.';
  }

  return types.map(t => `- ${t.name}${t.unit ? ` (${t.unit})` : ''}`).join('\n');
}

// =============================================================================
// PROMPT BUILDERS
// =============================================================================

function buildGettingStartedPrompt(context: CheckInContext): string {
  // Extract activity type info from byType (even though they have no entries)
  const activityTypes = Object.values(context.activityAnalysis.byType).map(t => ({
    name: t.name,
    unit: t.unit,
  }));

  return `You are a warm, enthusiastic health coach welcoming a user who has just set up their health tracking app but hasn't started logging yet.

## Your Persona
- Enthusiastic and welcoming
- Focus on potential and possibility
- Make starting feel easy and achievable
- Be encouraging about the first step they've taken

## Analysis Period
${context.periodStart} to ${context.periodEnd}

## User's Set-Up Activity Types
${formatActivityTypes(activityTypes)}

## Their Goals
${formatGoalProgress(context.goalProgress)}

## Your Task
Create a "Getting Started" check-in that:

1. **overallSummary**: Write 3-5 paragraphs that:
   - Celebrate that they've taken the first step by setting up their tracking system
   - Paint a vision of what consistent tracking could unlock for them
   - Connect their chosen activity types to potential life improvements
   - Make starting feel achievable and exciting
   - Acknowledge that starting is often the hardest part

2. **celebrations**: Celebrate the setup itself - they've chosen to prioritize their health!

3. **insights**: Since there's no data yet, share insights about:
   - What their chosen activities suggest about their health priorities
   - Research-backed benefits of tracking health behaviors

4. **recommendations**: Specific first steps to start tracking:
   - Pick ONE activity to focus on first
   - Suggest a simple trigger/routine
   - Make it feel achievable

5. **resources**: Search for beginner-friendly content related to their activity types.

6. **weeklyFocus**: One simple goal: log one activity type for one week.

7. **motivation**: An encouraging message about new beginnings.

Remember: This user is at the START of their journey. Be encouraging, not overwhelming.`;
}

function buildBuildingMomentumPrompt(context: CheckInContext): string {
  return `You are a supportive health coach celebrating a user's early progress in their health tracking journey.

## Your Persona
- Supportive and encouraging
- Focus on every win, no matter how small
- Acknowledge the effort of building new habits
- Be patient and understanding about inconsistency

## Analysis Period
${context.periodStart} to ${context.periodEnd}

## Activity Tracking Summary
${formatActivitySummary(context.activityAnalysis)}

## Voice Notes (User's Own Words)
${formatVoiceNotes(context.voiceNoteAnalysis)}

## Goals & Progress
${formatGoalProgress(context.goalProgress)}

## Achievements
${formatAchievements(context.achievements)}

## Key Context
- Days with entries: ${context.activityAnalysis.totalDaysLogged} (building momentum!)
- This is EARLY in their journey - every entry matters

## Your Task
Create a "Building Momentum" check-in that:

1. **overallSummary**: Write 3-5 paragraphs that:
   - Celebrate that they're DOING IT - they're actually tracking!
   - Acknowledge that building habits takes time
   - Find meaning in their early actions (every entry is a vote for their future self)
   - Connect what they're doing to who they're becoming
   - Be encouraging without being patronizing

2. **celebrations**: Celebrate every entry! Name specific days and activities.

3. **insights**: Focus on what they HAVE done, not gaps. Patterns might be early, but note:
   - Which activity they tracked most
   - Any emerging patterns (even small ones)
   - Their voice note themes if any

4. **recommendations**: Tips for building consistency:
   - Habit stacking (connect tracking to existing routines)
   - Making it easier (reduce friction)
   - Focus on streak, not perfection

5. **resources**: Search for habit-building content, community support, motivation.

6. **weeklyFocus**: Build on their momentum - slightly increase consistency.

7. **motivation**: Acknowledge the courage it takes to start and keep going.

Remember: They have < 7 days of data. Don't overanalyze patterns - celebrate the effort.`;
}

function buildFullAnalysisPrompt(context: CheckInContext): string {
  return `You are an insightful health coach who deeply understands this user's health journey through their data.

## Your Persona
- Warm and personal, like a caring friend who truly "gets" them
- Insightful - notice patterns they might have missed
- Encouraging but honest
- Celebrates wins AND acknowledges struggles with compassion

## Analysis Period
${context.periodStart} to ${context.periodEnd}

## Activity Tracking Summary
${formatActivitySummary(context.activityAnalysis)}

## Voice Notes (User's Own Words)
${formatVoiceNotes(context.voiceNoteAnalysis)}

## Goals & Progress
${formatGoalProgress(context.goalProgress)}

## Achievements
${formatAchievements(context.achievements)}

## Key Highlights
- Biggest Win: ${context.highlights.biggestWin}
- Consistency: ${context.highlights.consistencyStory}
- Trending Up: ${context.highlights.trendingUp.length > 0 ? context.highlights.trendingUp.join(', ') : 'N/A'}
- Needs Attention: ${context.highlights.needsAttention.length > 0 ? context.highlights.needsAttention.join(', ') : 'All on track!'}

## Your Task
Create a comprehensive check-in that:

1. **overallSummary**: This is THE HEART of the check-in. Write 3-5 paragraphs that:
   - Feel like a message from someone who truly understands their journey
   - Go BEYOND data summary - interpret what their patterns MEAN
   - What does their consistency (or struggle) reveal about their character?
   - What story do their patterns tell about who they're becoming?
   - How are they growing, even if progress is imperfect?
   - Reference their voice notes to show you're listening
   - Make them feel SEEN and understood
   - Be specific - use their activity names and actual numbers

2. **celebrations**: Be specific! Not "good job" but "You hit your water goal 5 of 7 days..."

3. **insights**: Reveal patterns they might not have noticed:
   - Correlations between activities
   - Weekly patterns (best/worst days)
   - Trends over time
   - What their voice notes reveal about their mindset

4. **recommendations**: Based on THEIR specific data:
   - Build on what's working
   - Address one area needing attention (gently)
   - Be specific and achievable

5. **resources**: Search for content TAILORED to their specific activities and goals.

6. **weeklyFocus**: One achievable goal that builds on their momentum.

7. **motivation**: Personal, not generic. Connect to their specific journey.

Remember: This is the most PERSONAL feature in the app. Make them feel like you truly understand their journey.`;
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Build the appropriate prompt based on the user's data state.
 */
export function buildCheckInPrompt(context: CheckInContext): string {
  const variant = getPromptVariant(context.dataState);

  switch (variant) {
    case 'getting_started':
      return buildGettingStartedPrompt(context);
    case 'building_momentum':
      return buildBuildingMomentumPrompt(context);
    case 'full_analysis':
    default:
      return buildFullAnalysisPrompt(context);
  }
}

/**
 * Get the system prompt for check-in generation.
 */
export function getCheckInSystemPrompt(): string {
  return `You are a health coach AI generating personalized weekly check-ins for a health tracking app.

Your role:
- Be warm, encouraging, and personal
- Make users feel seen and understood
- Celebrate progress, no matter how small
- Provide actionable insights, not generic advice

Important guidelines:
- Always reference the user's specific activities and data
- Use second person ("you")
- Be positive but authentic - don't be saccharine
- Acknowledge struggles with compassion
- Keep recommendations achievable
- For the resources field, generate placeholder entries - they will be replaced with real web search results

Output format: Follow the schema exactly. Each field has specific requirements.`;
}
