import { z } from 'zod';

/**
 * Schema for a web resource found via search.
 */
export const CheckInResourceSchema = z.object({
  title: z.string().describe('Title of the resource'),
  url: z.string().describe('Full URL to the resource (e.g., https://reddit.com/r/fitness)'),
  description: z.string().describe('Brief description (1-2 sentences) of why this resource is relevant to the user'),
  type: z.enum(['article', 'subreddit', 'video', 'other']).describe('Type of resource'),
});

/**
 * Schema for the AI-generated check-in analysis.
 * Order of fields matches the intended display order in the UI.
 */
export const CheckInAnalysisSchema = z.object({
  overallSummary: z.string().describe(
    `3-5 paragraphs with SPECIFIC data points about their health journey.

    CRITICAL: Include 2-3 specific facts with numbers or percentages.
    BAD: "Research shows hydration helps focus"
    GOOD: "Even 2% dehydration drops cognitive performance by 10-20%"

    Should:
    - Be qualitative about THEIR data ("your hydration has been solid")
    - Be quantitative about SCIENCE ("which matters because 2% dehydration...")
    - Name mechanisms (BDNF, cortisol, dopamine) when relevant
    - Feel like a friend sharing fascinating facts, not lecturing

    Write in second person. Conversational but data-rich.`
  ),

  celebrations: z.array(z.string()).describe(
    `Acknowledge what's working WITH specific science. Each should include a data point.
    GOOD: "Your hydration consistency matters - even 2% dehydration cuts focus by 10-20%"
    BAD: "Great job staying hydrated - research shows it helps focus"
    Include 2-5 celebrations with specific numbers or mechanisms.`
  ),

  insights: z.array(z.string()).min(3).max(5).describe(
    `Data-backed observations with SPECIFIC facts. Each insight MUST have a number, percentage, or mechanism.
    GOOD: "Your morning exercise timing is optimal - cortisol peaks at 8am and exercise then increases fat oxidation by 20%"
    BAD: "Your exercise timing helps with energy levels"
    Include 3-5 insights.`
  ),

  recommendations: z.array(z.string()).max(3).describe(
    `Gentle suggestions framed as possibilities, not prescriptions. Each should:
    - Use inviting language: "start thinking about...", "something worth exploring...", "one thing that might help..."
    - AVOID prescriptive language: "you should...", "you need to...", "make sure to..."
    - Share why it works in an accessible way
    - Feel like opening up possibilities, not assigning homework
    Maximum 3 recommendations.`
  ),

  resources: z.array(CheckInResourceSchema).max(3).describe(
    `Relevant web resources tailored to their specific activities and goals. Search for:
    - Subreddits related to their tracked activities (r/running, r/loseit, r/meditation, etc.)
    - Articles about habits they're building
    - Tips related to their specific health goals
    Each resource should feel personally relevant, not generic.`
  ),

  weeklyFocus: z.string().describe(
    `One specific focus for the week, shared like a friend's suggestion. Should:
    - Build on what's already working
    - Be achievable
    - Include why it matters in an accessible way
    Example: "Maybe try keeping your bedtime more consistent this week - turns out the timing matters even more than how long you sleep"`
  ),

  motivation: z.string().describe(
    `A specific, fascinating fact about one of their activities that opens up possibility.
    Should include a concrete data point, not generic encouragement.
    GOOD: "Here's something cool: just 10 minutes of walking after meals reduces blood sugar spikes by 22%"
    BAD: "Keep up the great work, you're doing amazing!"`
  ),
});

export type CheckInAnalysisInput = z.infer<typeof CheckInAnalysisSchema>;
export type CheckInResourceInput = z.infer<typeof CheckInResourceSchema>;

