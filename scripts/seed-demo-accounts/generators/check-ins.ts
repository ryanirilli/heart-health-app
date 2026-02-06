/**
 * Check-ins generator - creates pre-defined check-ins for demo users
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getDaysAgoStr } from '../utils/dates';
import { getCheckInsForLevel, type CheckInTemplate } from '../data/check-in-templates';

interface DbCheckIn {
  id: string;
  user_id: string;
  created_at: string;
  period_start: string;
  period_end: string;
  analysis: object;
  data_summary: object;
  status: string;
  error_message: string | null;
}

/**
 * Generate a UUID for check-in IDs
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Convert check-in template to database format
 */
function templateToDbFormat(template: CheckInTemplate, userId: string): DbCheckIn {
  const periodEnd = getDaysAgoStr(template.periodOffset);
  const periodStart = getDaysAgoStr(template.periodOffset + template.periodLength - 1);
  const createdAt = getDaysAgoStr(template.periodOffset); // Created at end of period

  return {
    id: generateId(),
    user_id: userId,
    created_at: createdAt,
    period_start: periodStart,
    period_end: periodEnd,
    analysis: template.analysis,
    data_summary: template.dataSummary,
    status: 'completed',
    error_message: null,
  };
}

/**
 * Create check-ins for a demo user based on their level
 */
export async function createCheckIns(
  supabase: SupabaseClient,
  userId: string,
  level: string
): Promise<number> {
  const templates = getCheckInsForLevel(level);

  if (templates.length === 0) {
    return 0;
  }

  const dbRecords = templates.map((t) => templateToDbFormat(t, userId));

  const { error } = await supabase.from('check_ins').insert(dbRecords);

  if (error) {
    throw new Error(`Failed to create check-ins: ${error.message}`);
  }

  return templates.length;
}
