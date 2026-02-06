/**
 * Supabase client with service role key for admin operations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

export type Environment = 'dev' | 'prod';

interface EnvVars {
  DEV_SUPABASE_URL?: string;
  DEV_SERVICE_ROLE_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  PROD_SUPABASE_URL?: string;
  PROD_SERVICE_ROLE_KEY?: string;
}

function loadEnvFile(): EnvVars {
  try {
    const envPath = join(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    const env: EnvVars = {};
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          (env as Record<string, string>)[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
    return env;
  } catch {
    return {};
  }
}

const envVars = loadEnvFile();

export function getSupabaseClient(env: Environment): SupabaseClient {
  let url: string | undefined;
  let serviceRoleKey: string | undefined;

  if (env === 'dev') {
    url = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    serviceRoleKey = envVars.DEV_SERVICE_ROLE_KEY || process.env.DEV_SERVICE_ROLE_KEY;
  } else {
    url = envVars.PROD_SUPABASE_URL || process.env.PROD_SUPABASE_URL;
    serviceRoleKey = envVars.PROD_SERVICE_ROLE_KEY || process.env.PROD_SERVICE_ROLE_KEY;
  }

  if (!url || !serviceRoleKey) {
    const missing: string[] = [];
    if (!url) missing.push(env === 'dev' ? 'NEXT_PUBLIC_SUPABASE_URL' : 'PROD_SUPABASE_URL');
    if (!serviceRoleKey) missing.push(env === 'dev' ? 'DEV_SERVICE_ROLE_KEY' : 'PROD_SERVICE_ROLE_KEY');

    throw new Error(
      `Missing required environment variables for ${env} environment:\n` +
      missing.map((v) => `  - ${v}`).join('\n') +
      '\n\nAdd these to your .env.local file.'
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function validateEnvironment(env: Environment): void {
  // This will throw if environment variables are missing
  getSupabaseClient(env);
}
