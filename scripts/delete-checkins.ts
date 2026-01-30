#!/usr/bin/env bun
/**
 * Delete check-ins for a user
 *
 * Usage:
 *   Dev DB:  bun scripts/delete-checkins.ts
 *   Prod DB: bun scripts/delete-checkins.ts --prod
 *
 * Reads from .env.local for credentials.
 * Set TARGET_EMAIL env var to target a specific user (defaults to ryanirilli@gmail.com)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

// Load .env.local file
function loadEnvFile() {
  try {
    const envPath = join(process.cwd(), ".env.local");
    const envContent = readFileSync(envPath, "utf-8");
    const env: Record<string, string> = {};
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join("=").trim();
        }
      }
    }
    return env;
  } catch {
    return {};
  }
}

const envVars = loadEnvFile();
const isProd = process.argv.includes("--prod");

// Select the right credentials based on environment
const SUPABASE_URL = isProd
  ? envVars.PROD_SUPABASE_URL || process.env.PROD_SUPABASE_URL
  : envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const SERVICE_ROLE_KEY = isProd
  ? envVars.PROD_SERVICE_ROLE_KEY || process.env.PROD_SERVICE_ROLE_KEY
  : envVars.DEV_SERVICE_ROLE_KEY || process.env.DEV_SERVICE_ROLE_KEY;

const TARGET_EMAIL =
  envVars.TARGET_EMAIL || process.env.TARGET_EMAIL || "ryanirilli@gmail.com";

console.log(`\n🗄️  Environment: ${isProd ? "PRODUCTION" : "DEVELOPMENT"}`);
console.log(`👤 Target user: ${TARGET_EMAIL}\n`);

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing required environment variables:");
  if (isProd) {
    console.error("   - PROD_SUPABASE_URL");
    console.error("   - PROD_SERVICE_ROLE_KEY");
  } else {
    console.error("   - NEXT_PUBLIC_SUPABASE_URL");
    console.error("   - DEV_SERVICE_ROLE_KEY");
  }
  console.error(
    "\nYou can find these in your Supabase dashboard under Settings > API"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  // 1. Get the user ID for the target email
  const { data: users, error: userError } =
    await supabase.auth.admin.listUsers();

  if (userError) {
    console.error("❌ Failed to fetch users:", userError);
    process.exit(1);
  }

  const targetUser = users.users.find((u) => u.email === TARGET_EMAIL);

  if (!targetUser) {
    console.error(`❌ User with email ${TARGET_EMAIL} not found`);
    process.exit(1);
  }

  const userId = targetUser.id;
  console.log(`✓ Found user: ${targetUser.email} (ID: ${userId})`);

  // 2. Fetch existing check-ins
  const { data: checkIns, error: fetchError } = await supabase
    .from("check_ins")
    .select("id, created_at, status, period_start, period_end")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (fetchError) {
    console.error("❌ Failed to fetch check-ins:", fetchError);
    process.exit(1);
  }

  if (!checkIns || checkIns.length === 0) {
    console.log("\n✓ No check-ins found for this user. Nothing to delete.");
    process.exit(0);
  }

  console.log(`\n📋 Found ${checkIns.length} check-in(s):\n`);
  checkIns.forEach((checkIn, i) => {
    console.log(
      `   ${i + 1}. ${checkIn.created_at} (${checkIn.period_start} to ${checkIn.period_end}) - ${checkIn.status}`
    );
  });

  // 3. Delete all check-ins
  console.log(`\n🗑️  Deleting ${checkIns.length} check-in(s)...`);

  const { error: deleteError } = await supabase
    .from("check_ins")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    console.error("❌ Failed to delete check-ins:", deleteError);
    process.exit(1);
  }

  console.log(`\n✅ Successfully deleted ${checkIns.length} check-in(s)!`);
  console.log("   You can now generate a new check-in.\n");
}

main().catch(console.error);
