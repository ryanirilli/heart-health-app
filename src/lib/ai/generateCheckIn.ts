import { generateObject, generateText, streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { CheckInAnalysisSchema } from './checkInSchema';
import { buildCheckInPrompt, getCheckInSystemPrompt } from './checkInPrompt';
import { CheckInContext } from '@/lib/checkInDataProcessor';
import { CheckInAnalysis, CheckInResource } from '@/lib/checkIns';
import { DeepPartial } from 'ai';

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
 * Research findings from web search for an activity.
 */
export interface ScienceContext {
  activityName: string;
  findings: string; // Summary of research findings with citations
}

/**
 * Search for science-backed research related to user's activities.
 * Returns real studies and findings that can be cited in the check-in content.
 */
export async function searchForScienceContext(
  context: CheckInContext
): Promise<ScienceContext[]> {
  const activityNames = Object.values(context.activityAnalysis.byType)
    .map(t => t.name)
    .slice(0, 3); // Focus on top 3 activities

  if (activityNames.length === 0) {
    return [];
  }

  const sciencePromises = activityNames.map(async (activityName): Promise<ScienceContext> => {
    const searchPrompt = `Search for peer-reviewed research and health science about "${activityName}" and its health benefits.

Find 2-3 specific studies or research findings. For each, provide:
- The key finding (what the research shows)
- Attribution (researcher names, institution, or journal if available)
- The mechanism (WHY it works, if known)

Focus on well-established, reputable research. Be specific with citations.`;

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

      return {
        activityName,
        findings: result.text || `Research on ${activityName} and health outcomes.`,
      };
    } catch (error) {
      console.error(`Science search for ${activityName} failed:`, error);
      return {
        activityName,
        findings: '',
      };
    }
  });

  const results = await Promise.all(sciencePromises);
  return results.filter(r => r.findings.length > 0);
}


/**
 * Generate a check-in analysis using OpenAI.
 *
 * Uses gpt-4o for best quality. Now includes web search for science context and resources.
 */
export async function generateCheckInAnalysis(
  context: CheckInContext
): Promise<CheckInAnalysis> {
  // Run science search and resources search in parallel
  const [scienceContext, resources] = await Promise.all([
    searchForScienceContext(context),
    searchForResources(context),
  ]);

  // Generate content with science context included in prompt
  const structuredResult = await generateObject({
    model: openai('gpt-4o'),
    schema: CheckInAnalysisSchema,
    system: getCheckInSystemPrompt(),
    prompt: buildCheckInPrompt(context, scienceContext),
    temperature: 0.7,
  });

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

  // Search for science context and resources in parallel
  onProgress('searching');
  const [scienceContext, resources] = await Promise.all([
    searchForScienceContext(context),
    searchForResources(context),
  ]);

  // Then generate the structured content with science context
  onProgress('generating');

  const result = await generateObject({
    model: openai('gpt-4o'),
    schema: CheckInAnalysisSchema,
    system: getCheckInSystemPrompt(),
    prompt: buildCheckInPrompt(context, scienceContext),
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
 * @param scienceContext - Pre-fetched science context from web search
 * @returns The final complete analysis
 */
export async function streamCheckInAnalysis(
  context: CheckInContext,
  resources: CheckInResource[],
  onPartial: (partial: DeepPartial<CheckInAnalysis>) => void,
  scienceContext: ScienceContext[] = []
): Promise<CheckInAnalysis> {
  const { partialObjectStream, object } = streamObject({
    model: openai('gpt-4o'),
    schema: CheckInAnalysisSchema,
    system: getCheckInSystemPrompt(),
    prompt: buildCheckInPrompt(context, scienceContext),
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

