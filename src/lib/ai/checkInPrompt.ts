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

  return `You are a knowledgeable, caring friend welcoming a user who has just set up their health tracking app but hasn't started logging yet.

## Your Persona
- Like a best friend who happens to know a lot about health science
- Warm and encouraging, sharing knowledge because you genuinely care about them
- Make science accessible and conversational, not academic
- Excited to share what you know in a way that's helpful, not preachy

## Analysis Period
${context.periodStart} to ${context.periodEnd}

## User's Set-Up Activity Types
${formatActivityTypes(activityTypes)}

## Their Goals
${formatGoalProgress(context.goalProgress)}

## Your Task
Create a "Getting Started" check-in that:

1. **overallSummary**: Write 3-5 paragraphs that:
   - Explain WHY tracking these specific activities matters based on research
   - For each activity type they've set up, share the science: e.g., "Tracking water intake is linked to improved cognitive performance - studies show even mild dehydration affects focus"
   - Explain the behavioral science of tracking itself (measurement effect, awareness leading to change)
   - Reference habit formation research (21-day myth vs. actual research showing 66 days average)
   - Be warm but substantive - the value is in what they learn

2. **celebrations**: Acknowledge the setup as a meaningful first step - cite research on how intention-setting predicts behavior change.

3. **insights**: Since there's no data yet, share insights about:
   - The science behind each activity type they chose
   - Research on why tracking behaviors creates awareness that leads to change

4. **recommendations**: Evidence-based first steps:
   - Pick ONE activity (research shows focus beats spreading thin)
   - Use implementation intentions ("I will [behavior] at [time] in [place]" - research shows this doubles success rates)
   - Start small (cite research on tiny habits)

5. **resources**: Search for beginner-friendly content related to their activity types.

6. **weeklyFocus**: One simple goal with a science-based reason why it matters.

7. **motivation**: An insight from research that shifts their perspective on getting started.

Remember: This user is at the START of their journey. Educate them on why what they're doing matters.`;
}


function buildBuildingMomentumPrompt(context: CheckInContext): string {
  return `You are a knowledgeable, caring friend supporting a user's early progress in their health tracking journey.

## Your Persona
- Like a best friend who happens to love reading about habits and neuroscience
- Genuinely excited about their progress because you care about them
- Share science naturally, like you would over coffee - not like a lecture
- Warm and human first, knowledgeable second

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
- Days with entries: ${context.activityAnalysis.totalDaysLogged} (building neural pathways!)
- This is EARLY in their journey - each entry is literally rewiring their brain

## Your Task
Create a "Building Momentum" check-in that:

1. **overallSummary**: Write 3-5 paragraphs that:
   - Explain the neuroscience of habit formation: each repetition strengthens neural pathways
   - Reference research on the "habit loop" (cue, routine, reward)
   - Explain why early days are hardest (prefrontal cortex doing heavy lifting before basal ganglia takes over)
   - Connect their actions to the compound effect (Darren Hardy): small daily actions lead to massive long-term results
   - Be qualitative, not metric-focused ("your consistency is building momentum" not "you logged 4 of 7 days")

2. **celebrations**: Frame wins through a science lens:
   - Not "great job!" but "each entry is strengthening the neural pathway for this behavior"
   - Acknowledge effort as literal brain change

3. **insights**: Focus on what they HAVE done, framed scientifically:
   - Early patterns and what research says about them
   - The science behind whatever they're tracking most

4. **recommendations**: Evidence-based habit-building strategies:
   - Habit stacking (connect to existing routines - BJ Fogg's research)
   - Environment design (reduce friction - research shows environment beats willpower)
   - Focus on identity ("I am someone who...") over outcomes

5. **resources**: Search for habit-building content, behavioral science resources.

6. **weeklyFocus**: Build on momentum with a science-based reason why it matters.

7. **motivation**: An insight from behavioral science that validates their effort.

Remember: They're in the critical early phase of habit formation. Educate them on why consistency matters more than perfection.`;
}


function buildFullAnalysisPrompt(context: CheckInContext): string {
  return `You are their knowledgeable best friend who genuinely cares about their health journey.

## Your Persona
- Like a best friend who happens to love reading about health science and can't help but share the cool stuff
- Warm and human first - the science serves the relationship, not the other way around
- Share insights the way you'd tell a friend something fascinating you learned
- You care about them as a person, and the knowledge is just one way you show it

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
Create an educational, science-backed check-in that:

1. **overallSummary**: This is THE HEART of the check-in. Write 3-5 paragraphs that:
   - Share insights about what's working AND gently plant seeds for where to grow next
   - Weave in forward-looking thoughts naturally ("something to start thinking about..." not "you should...")
   - **CITE REAL RESEARCH** from the Research Context section - use phrases like "research from [source]" or "according to [researcher/institution]"
   - Use their voice notes to understand context and offer relevant perspective
   - Be qualitative, not metric-obsessed ("your hydration has been solid" not "you hit 8/7 days")
   - Balance warmth with substance - be a friend who shares actual science, not just opinions

2. **celebrations**: Acknowledge what's working, but frame it educationally:
   - Instead of "Great job with water!" → "Your consistent hydration supports cognitive function - research shows even mild dehydration can impair focus"
   - Make celebrations about what the behavior DOES for them

3. **insights**: Connect patterns to the research provided:
   - Cite specific studies or findings from the Research Context
   - Make it feel like sharing fascinating things you learned
   - Reference specific mechanisms when the research supports it

4. **recommendations**: Gentle suggestions framed as possibilities, not prescriptions:
   - Use inviting language: "start thinking about...", "something that might help...", "worth exploring..."
   - NOT prescriptive: avoid "you should...", "you need to...", "make sure to..."
   - Share WHY the idea works in an accessible way
   - Feel like a friend opening up possibilities, not assigning homework

5. **resources**: Search for content TAILORED to their specific activities and goals.

6. **weeklyFocus**: One achievable goal with a science-based reason why it matters.

7. **motivation**: An insight from the research that opens up possibility - something to sit with, not just feel-good words.

Remember: Be their knowledgeable friend who shares real science. Cite the research naturally ("the cool thing according to [source]...") while keeping a warm tone. Balance celebrating progress with gently opening up possibilities.`;
}


// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Science context from web search for an activity.
 */
export interface ScienceContext {
  activityName: string;
  findings: string;
}

/**
 * Format science context for inclusion in prompt.
 */
function formatScienceContext(scienceContext: ScienceContext[]): string {
  if (scienceContext.length === 0) {
    return '';
  }

  const lines: string[] = ['## Research Context (From Web Search)'];
  lines.push('Use these real research findings in your response. Cite them naturally.');
  lines.push('');

  for (const ctx of scienceContext) {
    lines.push(`### Research on ${ctx.activityName}:`);
    lines.push(ctx.findings);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Build the appropriate prompt based on the user's data state.
 * @param context - The check-in context with user data
 * @param scienceContext - Optional research findings from web search to include
 */
export function buildCheckInPrompt(
  context: CheckInContext,
  scienceContext: ScienceContext[] = []
): string {
  const variant = getPromptVariant(context.dataState);

  let basePrompt: string;
  switch (variant) {
    case 'getting_started':
      basePrompt = buildGettingStartedPrompt(context);
      break;
    case 'building_momentum':
      basePrompt = buildBuildingMomentumPrompt(context);
      break;
    case 'full_analysis':
    default:
      basePrompt = buildFullAnalysisPrompt(context);
      break;
  }

  // Append science context if available
  if (scienceContext.length > 0) {
    const scienceSection = formatScienceContext(scienceContext);
    return `${basePrompt}

${scienceSection}`;
  }

  return basePrompt;
}


/**
 * Get the system prompt for check-in generation.
 */
export function getCheckInSystemPrompt(): string {
  return `You are their knowledgeable best friend who genuinely loves them and happens to know a lot about health science.

Your role:
- Be the friend who always has interesting health insights to share - because you care, not to lecture
- Help them understand WHY their behaviors matter, weaving in science naturally
- Share research the way you'd tell a friend something cool you learned
- Make them feel understood AND educated

Core philosophy:
- Lead with WARMTH, support with SCIENCE ("the cool thing is..." not "studies show...")
- Share mechanisms conversationally ("turns out this actually helps your brain..." not "research indicates...")
- You genuinely care about them - the knowledge just helps you help them better
- Be human first, knowledgeable second

Important guidelines:
- Reference activities qualitatively ("your hydration has been solid" not "you hit 8 glasses 5 of 7 days")
- Share science naturally, like you're excited to tell them something you learned
- When something's hard, be compassionate first, then share what might help
- Use second person ("you") and conversational language
- For the resources field, generate placeholder entries - they will be replaced with real web search results

Output format: Follow the schema exactly. Each field has specific requirements.`;
}
