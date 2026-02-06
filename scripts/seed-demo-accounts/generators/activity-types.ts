/**
 * Activity type generator - creates activity types for demo users
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { type ActivityTypeTemplate, getActivityTypesForLevel } from '../data/activity-type-templates';

/**
 * Activity type template with its database UUID
 */
export interface ActivityTypeWithDbId extends ActivityTypeTemplate {
  dbId: string; // The UUID used in the database
}

/**
 * Generate a UUID v4
 */
function generateUuid(): string {
  return crypto.randomUUID();
}

/**
 * Convert a template to database format with a provided UUID
 */
function templateToDbFormat(template: ActivityTypeTemplate, userId: string, dbId: string) {
  return {
    id: dbId, // Database requires a text ID
    user_id: userId,
    name: template.name,
    unit: template.unit || null,
    pluralize: template.pluralize ?? false,
    is_negative: template.goalType === 'negative',
    goal_type: template.goalType,
    ui_type: template.uiType,
    min_value: template.minValue ?? null,
    max_value: template.maxValue ?? null,
    step: template.step ?? null,
    button_options: template.buttonOptions || null,
    fixed_value: template.fixedValue ?? null,
    display_order: template.order,
    deleted: false,
  };
}

/**
 * Create activity types for a demo user based on their level
 * Returns templates with their generated UUIDs for use by other generators
 */
export async function createActivityTypes(
  supabase: SupabaseClient,
  userId: string,
  level: string
): Promise<ActivityTypeWithDbId[]> {
  const templates = getActivityTypesForLevel(level);

  if (templates.length === 0) {
    return [];
  }

  // Generate UUIDs for each template and create the mapping
  const templatesWithIds: ActivityTypeWithDbId[] = templates.map((t) => ({
    ...t,
    dbId: generateUuid(),
  }));

  // Convert to database format using the generated UUIDs
  const dbRecords = templatesWithIds.map((t) => templateToDbFormat(t, userId, t.dbId));

  const { error } = await supabase.from('activity_types').insert(dbRecords);

  if (error) {
    throw new Error(`Failed to create activity types: ${error.message}`);
  }

  return templatesWithIds;
}
