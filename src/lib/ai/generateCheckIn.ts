import { generateObject, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { CheckInAnalysisSchema } from './checkInSchema';
import { buildCheckInPrompt, getCheckInSystemPrompt } from './checkInPrompt';
import { CheckInContext } from '@/lib/checkInDataProcessor';
import { CheckInAnalysis, CheckInResource } from '@/lib/checkIns';

/**
 * Search for personalized resources using OpenAI web search.
 * Returns real URLs from the web based on user's tracked activities.
 */
async function searchForResources(
  context: CheckInContext
): Promise<CheckInResource[]> {
  // Build a search query based on user's activities
  const activityNames = Object.values(context.activityAnalysis.byType)
    .map(t => t.name)
    .slice(0, 3); // Focus on top 3 activities

  if (activityNames.length === 0) {
    return [];
  }

  const searchPrompt = `Find 2-3 helpful web resources (articles, Reddit communities, or videos) for someone who is tracking these health activities: ${activityNames.join(', ')}.

For each resource, provide:
- A clear title
- Why it's relevant to their health journey
- The type (article, subreddit, video, or other)

Focus on actionable, beginner-friendly content that would help someone improve at these activities.`;

  try {
    const result = await generateText({
      model: openai('gpt-4o'),
      prompt: searchPrompt,
      tools: {
        web_search: openai.tools.webSearch({
          searchContextSize: 'medium',
        }),
      },
    });

    // Extract sources from the web search results
    const resources: CheckInResource[] = [];

    if (result.sources && result.sources.length > 0) {
      // Filter for URL sources and parse into our resource format
      for (const source of result.sources.slice(0, 3)) {
        // Check if this is a URL source (has sourceType 'url')
        if (source.sourceType === 'url' && 'url' in source) {
          const urlSource = source as { sourceType: 'url'; url: string; title?: string };
          const url = urlSource.url;
          
          // Determine resource type from URL
          let type: CheckInResource['type'] = 'article';
          if (url.includes('reddit.com')) {
            type = 'subreddit';
          } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
            type = 'video';
          }

          resources.push({
            title: urlSource.title || 'Helpful Resource',
            url: url,
            description: `Relevant resource for ${activityNames[0]} and related health activities.`,
            type,
          });
        }
      }
    }

    return resources;
  } catch (error) {
    console.error('Web search for resources failed:', error);
    return []; // Graceful fallback to empty resources
  }
}

/**
 * Generate a check-in analysis using OpenAI.
 *
 * Uses gpt-4o for best quality. Now includes web search for personalized resources.
 */
export async function generateCheckInAnalysis(
  context: CheckInContext
): Promise<CheckInAnalysis> {
  // Run web search and content generation in parallel
  const [resources, structuredResult] = await Promise.all([
    searchForResources(context),
    generateObject({
      model: openai('gpt-4o'),
      schema: CheckInAnalysisSchema,
      system: getCheckInSystemPrompt(),
      prompt: buildCheckInPrompt(context),
      temperature: 0.7,
    }),
  ]);

  const analysis = structuredResult.object as CheckInAnalysis;

  // Override the AI-generated resources with real web search results
  if (resources.length > 0) {
    analysis.resources = resources;
  }

  return analysis;
}

/**
 * Generate check-in analysis with streaming status updates.
 *
 * This is a wrapper that provides progress updates via a callback.
 */
export async function generateCheckInWithProgress(
  context: CheckInContext,
  onProgress: (phase: 'analyzing' | 'searching' | 'generating') => void
): Promise<CheckInAnalysis> {
  onProgress('analyzing');

  // First, search for resources
  onProgress('searching');
  const resources = await searchForResources(context);

  // Then generate the structured content
  onProgress('generating');

  const result = await generateObject({
    model: openai('gpt-4o'),
    schema: CheckInAnalysisSchema,
    system: getCheckInSystemPrompt(),
    prompt: buildCheckInPrompt(context),
    temperature: 0.7,
  });

  const analysis = result.object as CheckInAnalysis;

  // Override with real resources
  if (resources.length > 0) {
    analysis.resources = resources;
  }

  return analysis;
}
