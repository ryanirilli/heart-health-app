/**
 * Migration script: Import existing YAML data into Supabase
 * 
 * Usage:
 * 1. First, create an account in your app and sign in
 * 2. Get your user ID from Supabase dashboard (Authentication > Users)
 * 3. Run: npx tsx scripts/migrate-yaml-to-supabase.ts <your-user-id>
 * 
 * Make sure your .env.local has:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (not the anon key - need admin access)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { join } from 'path';

interface YamlActivityType {
  id: string;
  name: string;
  unit?: string;
  pluralize?: boolean;
  isNegative?: boolean;
  goalType?: 'positive' | 'negative' | 'neutral';
  uiType?: 'increment' | 'slider' | 'buttonGroup';
  minValue?: number;
  maxValue?: number;
  step?: number;
  buttonOptions?: { label: string; value: number }[];
  deleted?: boolean;
  order?: number;
}

interface YamlActivityEntry {
  date: string;
  entries: { [typeId: string]: number };
}

interface YamlData {
  types?: YamlActivityType[];
  activities?: Record<string, YamlActivityEntry[]>;
}

async function migrate() {
  const userId = process.argv[2];
  
  if (!userId) {
    console.error('Usage: npx tsx scripts/migrate-yaml-to-supabase.ts <user-id>');
    console.error('Get your user ID from Supabase dashboard > Authentication > Users');
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing environment variables. Make sure you have:');
    console.error('- NEXT_PUBLIC_SUPABASE_URL');
    console.error('- SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Use service role key to bypass RLS
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Read YAML file
  const yamlPath = join(process.cwd(), 'data', 'activities.yaml');
  let yamlContent: string;
  
  try {
    yamlContent = readFileSync(yamlPath, 'utf-8');
  } catch {
    console.error(`Could not read ${yamlPath}`);
    process.exit(1);
  }

  const data = parse(yamlContent) as YamlData;

  console.log('Starting migration...\n');

  // Migrate activity types
  if (data.types && data.types.length > 0) {
    console.log(`Migrating ${data.types.length} activity types...`);
    
    for (const type of data.types) {
      const { error } = await supabase.from('activity_types').insert({
        id: type.id,
        user_id: userId,
        name: type.name,
        unit: type.unit || null,
        pluralize: type.pluralize ?? true,
        is_negative: type.isNegative ?? null,
        goal_type: type.goalType || null,
        ui_type: type.uiType || 'increment',
        min_value: type.minValue ?? null,
        max_value: type.maxValue ?? null,
        step: type.step ?? null,
        button_options: type.buttonOptions || null,
        deleted: type.deleted ?? false,
        display_order: type.order ?? 0,
      });

      if (error) {
        console.error(`  Failed to insert type "${type.name}":`, error.message);
      } else {
        console.log(`  ✓ ${type.name}`);
      }
    }
  }

  // Migrate activities
  if (data.activities) {
    const allEntries: { date: string; typeId: string; value: number }[] = [];
    
    for (const year in data.activities) {
      for (const entry of data.activities[year]) {
        for (const typeId in entry.entries) {
          allEntries.push({
            date: entry.date,
            typeId,
            value: entry.entries[typeId],
          });
        }
      }
    }

    if (allEntries.length > 0) {
      console.log(`\nMigrating ${allEntries.length} activity entries...`);
      
      for (const entry of allEntries) {
        const { error } = await supabase.from('activities').insert({
          user_id: userId,
          activity_type_id: entry.typeId,
          date: entry.date,
          value: entry.value,
        });

        if (error) {
          console.error(`  Failed to insert entry for ${entry.date}/${entry.typeId}:`, error.message);
        } else {
          console.log(`  ✓ ${entry.date} - ${entry.typeId}: ${entry.value}`);
        }
      }
    }
  }

  console.log('\n✓ Migration complete!');
}

migrate().catch(console.error);

