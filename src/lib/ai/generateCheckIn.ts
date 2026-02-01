import { generateObject, generateText, streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { CheckInAnalysisSchema } from './checkInSchema';
import { buildCheckInPrompt, getCheckInSystemPrompt } from './checkInPrompt';
import { CheckInContext } from '@/lib/checkInDataProcessor';
import { CheckInAnalysis, CheckInResource } from '@/lib/checkIns';
import { DeepPartial } from 'ai';

/**
 * Helper to add timeout to a promise.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  const timeout = new Promise<T>((resolve) => {
    setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise, timeout]);
}

/**
 * Structured logger for check-in generation.
 */
function logCheckIn(
  event: string,
  data: Record<string, unknown>
): void {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    service: 'check-in-generation',
    event,
    ...data,
  }));
}

/**
 * Search for personalized resources using OpenAI web search.
 * Returns real URLs from the web based on user's tracked activities.
 */
async function searchForResources(
  context: CheckInContext
): Promise<CheckInResource[]> {
  const startTime = Date.now();
  const activityNames = Object.values(context.activityAnalysis.byType)
    .map(t => t.name)
    .slice(0, 3);

  if (activityNames.length === 0) {
    logCheckIn('resources_search_skipped', { reason: 'no_activities' });
    return [];
  }

  logCheckIn('resources_search_start', { activities: activityNames });

  const searchPrompt = `Find 2-3 helpful web resources (articles, Reddit communities, or videos) for someone who is tracking these health activities: ${activityNames.join(', ')}.

For each resource, provide:
- A clear title
- Why it's relevant to their health journey
- The type (article, subreddit, video, or other)

Focus on actionable, beginner-friendly content that would help someone improve at these activities.`;

  const doSearch = async (): Promise<CheckInResource[]> => {
    try {
      const result = await generateText({
        model: openai('gpt-4o'),
        prompt: searchPrompt,
        tools: {
          web_search: openai.tools.webSearch({
            searchContextSize: 'low', // Faster search
          }),
        },
      });

      const resources: CheckInResource[] = [];

      if (result.sources && result.sources.length > 0) {
        for (const source of result.sources.slice(0, 3)) {
          if (source.sourceType === 'url' && 'url' in source) {
            const urlSource = source as { sourceType: 'url'; url: string; title?: string };
            const url = urlSource.url;
            
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

      logCheckIn('resources_search_complete', {
        durationMs: Date.now() - startTime,
        resourceCount: resources.length,
        activities: activityNames,
      });

      return resources;
    } catch (error) {
      logCheckIn('resources_search_error', {
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        activities: activityNames,
      });
      return [];
    }
  };

  // 15 second timeout to prevent hanging
  const resources = await withTimeout(doSearch(), 15000, []);
  
  if (resources.length === 0 && Date.now() - startTime >= 15000) {
    logCheckIn('resources_search_timeout', {
      durationMs: Date.now() - startTime,
      activities: activityNames,
    });
  }
  
  return resources;
}

/**
 * Research findings from web search for an activity.
 * @deprecated No longer used - using GPT-4's built-in knowledge instead
 */
export interface ScienceContext {
  activityName: string;
  findings: string;
}

/**
 * Generate a check-in analysis using OpenAI.
 *
 * Uses gpt-4o for best quality. Includes web search for personalized resources.
 * Science citations come from GPT-4's built-in knowledge.
 */
export async function generateCheckInAnalysis(
  context: CheckInContext
): Promise<CheckInAnalysis> {
  const startTime = Date.now();
  logCheckIn('generation_start', { dataState: context.dataState });

  // Search for resources
  const resources = await searchForResources(context);

  // Generate content - GPT-4 will cite research from its training data
  const structuredResult = await generateObject({
    model: openai('gpt-4o'),
    schema: CheckInAnalysisSchema,
    system: getCheckInSystemPrompt(),
    prompt: buildCheckInPrompt(context),
    temperature: 0.7,
  });

  const analysis = structuredResult.object as CheckInAnalysis;

  // Override the AI-generated resources with real web search results
  if (resources.length > 0) {
    analysis.resources = resources;
  }

  logCheckIn('generation_complete', {
    durationMs: Date.now() - startTime,
    dataState: context.dataState,
  });

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

  // Search for resources
  onProgress('searching');
  const resources = await searchForResources(context);

  // Generate the structured content
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

/**
 * Generate check-in analysis with content streaming.
 *
 * This streams partial content as it's generated, allowing the UI to
 * progressively display the check-in sections as they come in.
 *
 * @param onPartial - Callback for each partial object update
 * @returns The final complete analysis
 */
export async function streamCheckInAnalysis(
  context: CheckInContext,
  resources: CheckInResource[],
  onPartial: (partial: DeepPartial<CheckInAnalysis>) => void
): Promise<CheckInAnalysis> {
  const { partialObjectStream, object } = streamObject({
    model: openai('gpt-4o'),
    schema: CheckInAnalysisSchema,
    system: getCheckInSystemPrompt(),
    prompt: buildCheckInPrompt(context),
    temperature: 0.7,
  });

  // Stream partial objects as they come in
  for await (const partialObject of partialObjectStream) {
    onPartial(partialObject);
  }

  // Get the final complete object
  const analysis = await object as CheckInAnalysis;

  // Override with real resources from web search
  if (resources.length > 0) {
    analysis.resources = resources;
  }

  return analysis;
}

export { searchForResources };


