#!/usr/bin/env bun
/**
 * Sync production data to dev Supabase project
 *
 * Run with: bun scripts/sync-prod-to-dev.ts
 *
 * Reads from .env.local for credentials:
 * - PROD_SUPABASE_URL: Production Supabase URL
 * - PROD_SERVICE_ROLE_KEY: Production service role key (has full access)
 * - NEXT_PUBLIC_SUPABASE_URL: Dev Supabase URL (heart-health-app-dev project)
 * - DEV_SERVICE_ROLE_KEY: Dev service role key
 * - TARGET_EMAIL: Email of the user to sync (defaults to ryanirilli@gmail.com)
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

// Production credentials
const PROD_SUPABASE_URL =
  envVars.PROD_SUPABASE_URL || process.env.PROD_SUPABASE_URL;
const PROD_SERVICE_ROLE_KEY =
  envVars.PROD_SERVICE_ROLE_KEY || process.env.PROD_SERVICE_ROLE_KEY;

// Dev project credentials (uses NEXT_PUBLIC_SUPABASE_URL which points to dev)
const DEV_SUPABASE_URL =
  envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const DEV_SERVICE_ROLE_KEY =
  envVars.DEV_SERVICE_ROLE_KEY || process.env.DEV_SERVICE_ROLE_KEY;

const TARGET_EMAIL =
  envVars.TARGET_EMAIL || process.env.TARGET_EMAIL || "ryanirilli@gmail.com";

if (!PROD_SUPABASE_URL || !PROD_SERVICE_ROLE_KEY) {
  console.error("Missing required environment variables in .env.local:");
  console.error("- PROD_SUPABASE_URL");
  console.error("- PROD_SERVICE_ROLE_KEY");
  console.error(
    "\nYou can find these in your Supabase dashboard under Settings > API"
  );
  process.exit(1);
}

if (!DEV_SUPABASE_URL || !DEV_SERVICE_ROLE_KEY) {
  console.error("Missing required environment variables in .env.local:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL (dev project URL)");
  console.error("- DEV_SERVICE_ROLE_KEY");
  console.error(
    "\nYou can find these in your heart-health-app-dev Supabase dashboard under Settings > API"
  );
  process.exit(1);
}

// Create Supabase clients
const prodSupabase = createClient(PROD_SUPABASE_URL, PROD_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const devSupabase = createClient(DEV_SUPABASE_URL, DEV_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log("=".repeat(80));
  console.log("SYNC: Production → Dev Project");
  console.log(`Target User: ${TARGET_EMAIL}`);
  console.log("=".repeat(80));
  console.log();

  // 1. Get the production user
  console.log("📡 Fetching user from production...");
  const { data: prodUsers, error: prodUserError } =
    await prodSupabase.auth.admin.listUsers();

  if (prodUserError) {
    console.error("Failed to fetch production users:", prodUserError);
    process.exit(1);
  }

  const prodUser = prodUsers.users.find((u) => u.email === TARGET_EMAIL);

  if (!prodUser) {
    console.error(`User with email ${TARGET_EMAIL} not found in production`);
    process.exit(1);
  }

  const prodUserId = prodUser.id;
  console.log(`✅ Found production user: ${prodUser.email} (ID: ${prodUserId})`);

  // 2. Create or get the dev project user
  console.log("\n📡 Setting up dev project user...");

  // Check if user exists in dev
  const { data: devUsers } = await devSupabase.auth.admin.listUsers();
  let devUser = devUsers?.users.find((u) => u.email === TARGET_EMAIL);

  if (!devUser) {
    console.log("Creating new user in dev project...");
    const { data: newUser, error: createError } =
      await devSupabase.auth.admin.createUser({
        email: TARGET_EMAIL,
        email_confirm: true,
        password: "devpassword123", // Simple password for dev
      });

    if (createError) {
      console.error("Failed to create dev user:", createError);
      process.exit(1);
    }
    devUser = newUser.user;
    console.log(`✅ Created dev project user with ID: ${devUser.id}`);
  } else {
    console.log(`✅ Found existing dev project user with ID: ${devUser.id}`);
  }

  const devUserId = devUser.id;

  // 3. Fetch all data from production
  console.log("\n📥 Fetching data from production...");

  // Fetch activity types
  const { data: prodActivityTypes, error: typesError } = await prodSupabase
    .from("activity_types")
    .select("*")
    .eq("user_id", prodUserId);

  if (typesError) {
    console.error("Failed to fetch activity types:", typesError);
    process.exit(1);
  }
  console.log(`   Activity types: ${prodActivityTypes?.length || 0}`);

  // Fetch activities
  const { data: prodActivities, error: activitiesError } = await prodSupabase
    .from("activities")
    .select("*")
    .eq("user_id", prodUserId);

  if (activitiesError) {
    console.error("Failed to fetch activities:", activitiesError);
    process.exit(1);
  }
  console.log(`   Activities: ${prodActivities?.length || 0}`);

  // Fetch goals
  const { data: prodGoals, error: goalsError } = await prodSupabase
    .from("goals")
    .select("*")
    .eq("user_id", prodUserId);

  if (goalsError) {
    console.error("Failed to fetch goals:", goalsError);
    process.exit(1);
  }
  console.log(`   Goals: ${prodGoals?.length || 0}`);

  // Fetch achievements
  const { data: prodAchievements, error: achievementsError } = await prodSupabase
    .from("achievements")
    .select("*")
    .eq("user_id", prodUserId);

  if (achievementsError) {
    console.error("Failed to fetch achievements:", achievementsError);
    process.exit(1);
  }
  console.log(`   Achievements: ${prodAchievements?.length || 0}`);

  // 4. Clear existing data in dev for this user
  console.log("\n🗑️  Clearing existing dev data for user...");

  // Delete in order due to foreign key constraints
  await devSupabase.from("achievements").delete().eq("user_id", devUserId);
  await devSupabase.from("activities").delete().eq("user_id", devUserId);
  await devSupabase.from("goals").delete().eq("user_id", devUserId);
  await devSupabase.from("activity_types").delete().eq("user_id", devUserId);
  console.log("   ✅ Cleared existing data");

  // 5. Insert data into dev (with updated user_id)
  console.log("\n📤 Inserting data into dev project...");

  // Insert activity types (map user_id to dev user)
  if (prodActivityTypes && prodActivityTypes.length > 0) {
    const devActivityTypes = prodActivityTypes.map((at) => ({
      ...at,
      user_id: devUserId,
    }));

    const { error: insertTypesError } = await devSupabase
      .from("activity_types")
      .insert(devActivityTypes);

    if (insertTypesError) {
      console.error("Failed to insert activity types:", insertTypesError);
      process.exit(1);
    }
    console.log(`   ✅ Inserted ${devActivityTypes.length} activity types`);
  }

  // Insert activities
  if (prodActivities && prodActivities.length > 0) {
    const devActivities = prodActivities.map((a) => ({
      ...a,
      user_id: devUserId,
    }));

    const { error: insertActivitiesError } = await devSupabase
      .from("activities")
      .insert(devActivities);

    if (insertActivitiesError) {
      console.error("Failed to insert activities:", insertActivitiesError);
      process.exit(1);
    }
    console.log(`   ✅ Inserted ${devActivities.length} activities`);
  }

  // Insert goals
  if (prodGoals && prodGoals.length > 0) {
    const devGoals = prodGoals.map((g) => ({
      ...g,
      user_id: devUserId,
    }));

    const { error: insertGoalsError } = await devSupabase
      .from("goals")
      .insert(devGoals);

    if (insertGoalsError) {
      console.error("Failed to insert goals:", insertGoalsError);
      process.exit(1);
    }
    console.log(`   ✅ Inserted ${devGoals.length} goals`);
  }

  // Insert achievements
  if (prodAchievements && prodAchievements.length > 0) {
    const devAchievements = prodAchievements.map((a) => ({
      ...a,
      user_id: devUserId,
    }));

    const { error: insertAchievementsError } = await devSupabase
      .from("achievements")
      .insert(devAchievements);

    if (insertAchievementsError) {
      console.error("Failed to insert achievements:", insertAchievementsError);
      process.exit(1);
    }
    console.log(`   ✅ Inserted ${devAchievements.length} achievements`);
  }

  // 6. Summary
  console.log("\n" + "=".repeat(80));
  console.log("✅ SYNC COMPLETE");
  console.log("=".repeat(80));
  console.log(`
Summary:
  - Activity Types: ${prodActivityTypes?.length || 0}
  - Activities: ${prodActivities?.length || 0}
  - Goals: ${prodGoals?.length || 0}
  - Achievements: ${prodAchievements?.length || 0}

Local dev user credentials:
  - Email: ${TARGET_EMAIL}
  - Password: devpassword123

You can now log in to your dev project with these credentials.
`);
}

main().catch(console.error);

