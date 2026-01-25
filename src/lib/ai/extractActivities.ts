import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';
import { ActivityType } from '@/lib/activityTypes';
import { buildExtractionPrompt } from './prompts';
import { ExtractedActivities } from '@/lib/hooks/useVoiceNotesQuery';

// Zod schema for extracted activities
const ExtractedActivitySchema = z.object({
  activityTypeId: z.string().nullable().describe('ID of matching existing activity type, or null if new activity'),
  suggestedName: z.string().describe('Name for the activity (use existing name if matched, or suggest new name)'),
  suggestedUnit: z.string().describe('Unit of measurement (glasses, minutes, hours, steps, etc.)'),
  suggestedUiType: z.enum(['increment', 'slider', 'buttonGroup', 'toggle', 'fixedValue']).describe('UI type for the activity'),
  suggestedGoalType: z.enum(['positive', 'negative', 'neutral']).describe('Whether more is better (positive), less is better (negative), or just tracking (neutral)'),
  value: z.number().describe('The numeric value extracted from the transcription'),
});

const ExtractionResultSchema = z.object({
  activities: z.array(ExtractedActivitySchema).describe('Array of extracted activities'),
  note: z.string().describe('Additional context or information that should be preserved as a note (empty string if none)'),
});

/**
 * Extract structured activity data from a voice note transcription using AI
 */
export async function extractActivities(
  transcription: string,
  userId: string,
  supabase: SupabaseClient
): Promise<ExtractedActivities | null> {
  try {
    // Fetch user's existing activity types
    const { data: activityTypesData, error } = await supabase
      .from('activity_types')
      .select('*')
      .eq('user_id', userId)
      .eq('deleted', false);

    if (error) {
      console.error('Failed to fetch activity types for extraction:', error);
      return null;
    }

    // Convert database types to ActivityType format
    const userActivityTypes: ActivityType[] = (activityTypesData || []).map((dbType: any) => ({
      id: dbType.id,
      name: dbType.name,
      unit: dbType.unit,
      pluralize: dbType.pluralize,
      goalType: dbType.goal_type || (dbType.is_negative ? 'negative' : 'positive'),
      uiType: dbType.ui_type,
      minValue: dbType.min_value,
      maxValue: dbType.max_value,
      step: dbType.step,
      buttonOptions: dbType.button_options,
      fixedValue: dbType.fixed_value,
      deleted: dbType.deleted,
      order: dbType.display_order,
    }));

    // Build the extraction prompt
    const prompt = buildExtractionPrompt(transcription, userActivityTypes);

    // Call AI to extract structured data
    const result = await generateObject({
      model: openai('gpt-4.1-nano'),
      schema: ExtractionResultSchema,
      prompt,
      temperature: 0, // Lower temperature for more consistent extraction
    });

    return {
      activities: result.object.activities,
      note: result.object.note.trim(),
    };
  } catch (error) {
    console.error('Failed to extract activities:', error);
    return null;
  }
}
