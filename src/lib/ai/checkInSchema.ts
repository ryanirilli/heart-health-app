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
    `The heart of the check-in. Write 3-5 paragraphs of warm, personal reflection on what their activity patterns MEAN for their health journey.

    This is NOT a data summary or bullet points. It should:
    - Feel like a message from a caring friend who deeply understands their journey
    - Interpret what their patterns reveal about their growth, commitment, and character
    - Acknowledge both wins AND struggles with compassion
    - Connect their daily actions to their bigger life goals
    - Make them feel seen, understood, and encouraged

    Write in second person ("you"). Be specific - reference their actual activities by name.`
  ),

  celebrations: z.array(z.string()).describe(
    `Specific achievements and wins to celebrate. Each item should:
    - Be specific (not "good job" but "You hit your water intake goal 5 days this week")
    - Feel earned and meaningful
    - Acknowledge effort, not just results
    Include 2-5 celebrations.`
  ),

  insights: z.array(z.string()).min(3).max(5).describe(
    `Key patterns and behavioral insights discovered from their data. Each insight should:
    - Reveal something they might not have noticed
    - Be actionable or meaningful
    - Connect behavior to outcomes when possible
    Examples: "Your energy tends to be higher on days you exercise", "You're most consistent with tracking on weekdays"`
  ),

  recommendations: z.array(z.string()).max(3).describe(
    `Actionable next steps for improvement. Each should be:
    - Specific and achievable this week
    - Based on their actual data and patterns
    - Framed positively (what TO do, not what to avoid)
    Maximum 3 recommendations to keep focus.`
  ),

  resources: z.array(CheckInResourceSchema).max(3).describe(
    `Relevant web resources tailored to their specific activities and goals. Search for:
    - Subreddits related to their tracked activities (r/running, r/loseit, r/meditation, etc.)
    - Articles about habits they're building
    - Tips related to their specific health goals
    Each resource should feel personally relevant, not generic.`
  ),

  weeklyFocus: z.string().describe(
    `One specific, achievable focus area for the coming week. Should:
    - Build on their momentum (not start something brand new)
    - Be measurable
    - Feel exciting, not overwhelming
    Example: "Aim to hit your water goal every day this week" or "Add 5 minutes to your daily walk"`
  ),

  motivation: z.string().describe(
    `A closing inspiring message. Can be:
    - An original encouraging statement
    - A relevant quote (with attribution)
    - A perspective shift that helps them see their progress
    Keep it genuine and specific to their journey, not generic motivation.`
  ),
});

export type CheckInAnalysisInput = z.infer<typeof CheckInAnalysisSchema>;
export type CheckInResourceInput = z.infer<typeof CheckInResourceSchema>;
