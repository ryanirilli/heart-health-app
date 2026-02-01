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
    `The heart of the check-in. Write 3-5 paragraphs like a caring, knowledgeable friend sharing insights about their health journey.

    This is NOT a data summary or generic encouragement. It should:
    - Sound like a friend who genuinely cares and happens to know cool stuff about health science
    - Weave in WHY their behaviors matter naturally, like sharing something interesting you learned
    - Be QUALITATIVE, not metric-obsessed ("your hydration has been solid" not "you hit 8 glasses 5 of 7 days")
    - Make them feel understood AND like they learned something valuable
    - Be warm and human first, knowledgeable second

    Write in second person ("you"). Conversational, not academic.`
  ),

  celebrations: z.array(z.string()).describe(
    `Acknowledge what's working like a friend who's genuinely happy for them. Each item should:
    - Share why the behavior matters in a warm, accessible way
    - Be qualitative rather than metric-focused
    - Feel like a friend saying "hey, this is actually really good for you because..."
    Include 2-5 celebrations.`
  ),

  insights: z.array(z.string()).min(3).max(5).describe(
    `Share interesting patterns you noticed, like a friend pointing out something cool. Each insight should:
    - Connect their behavior to why it matters, shared conversationally
    - Feel like "hey, did you know this about what you're doing?"
    - Be genuinely interesting, not preachy
    Examples: "The cool thing about your exercise timing is it actually helps with sleep - there's this whole connection between movement and your sleep cycle"`
  ),

  recommendations: z.array(z.string()).max(3).describe(
    `Helpful suggestions from a friend who's read a lot about this stuff. Each should:
    - Share WHY it works in an accessible way
    - Feel like a friend saying "this thing actually really helps..."
    - Be specific and achievable
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
    `One specific focus for the week, shared like a friend's suggestion. Should:
    - Build on what's already working
    - Be achievable
    - Include why it matters in an accessible way
    Example: "Maybe try keeping your bedtime more consistent this week - turns out the timing matters even more than how long you sleep"`
  ),

  motivation: z.string().describe(
    `A closing thought from a friend who believes in them. Should:
    - Share something meaningful, not generic motivation
    - Feel human and personal
    - Can include an interesting perspective or insight that helps them
    Example: Something a caring friend might say that's both supportive and gives them something to think about.`
  ),
});

export type CheckInAnalysisInput = z.infer<typeof CheckInAnalysisSchema>;
export type CheckInResourceInput = z.infer<typeof CheckInResourceSchema>;

