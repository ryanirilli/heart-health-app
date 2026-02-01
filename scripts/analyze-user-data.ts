#!/usr/bin/env bun
/**
 * Deep dive analysis script using Production Logic
 *
 * Run with: bun scripts/analyze-user-data.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";
import { format, subDays } from "date-fns";
import {
  assessDataState,
  compileCheckInContext,
  DbActivity,
  DbActivityType,
  DbVoiceNote,
  DbGoal,
  DbAchievement,
} from "@/lib/checkInDataProcessor";
import { buildCheckInPrompt } from "@/lib/ai/checkInPrompt";
import { generateCheckInAnalysis } from "@/lib/ai/generateCheckIn";

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
const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY =
  envVars.DEV_SERVICE_ROLE_KEY || process.env.DEV_SERVICE_ROLE_KEY;
const TARGET_EMAIL =
  envVars.TARGET_EMAIL || process.env.TARGET_EMAIL || "ryanirilli@gmail.com";

// Ensure OpenAI key is available for the imported modules
if (envVars.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = envVars.OPENAI_API_KEY;
}

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("=".repeat(80));
  console.log("AUDIT: Check-in Generation Logic");
  console.log(`Target User: ${TARGET_EMAIL}`);
  console.log("=".repeat(80));

  // 1. Get User
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) throw userError;
  const targetUser = users.users.find((u) => u.email === TARGET_EMAIL);
  if (!targetUser) {
    console.error(`User ${TARGET_EMAIL} not found`);
    process.exit(1);
  }
  const userId = targetUser.id;
  console.log(`User ID: ${userId}`);

  // 2. Fetch Data (Replicating route.ts)
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const thirtyDaysAgo = format(subDays(today, 30), "yyyy-MM-dd");

  console.log(`\nFetching data from ${thirtyDaysAgo} to ${todayStr}...`);

  const [
    activitiesResult,
    activityTypesResult,
    voiceNotesResult,
    goalsResult,
    achievementsResult,
  ] = await Promise.all([
    supabase
      .from("activities")
      .select("*")
      .eq("user_id", userId)
      .gte("date", thirtyDaysAgo)
      .order("date", { ascending: true }),
    supabase
      .from("activity_types")
      .select("*")
      .eq("user_id", userId),
    supabase
      .from("voice_notes")
      .select("*")
      .eq("user_id", userId)
      .gte("date", thirtyDaysAgo),
    supabase.from("goals").select("*").eq("user_id", userId),
    supabase
      .from("achievements")
      .select("*, goals(name, icon)")
      .eq("user_id", userId)
      .gte("period_end", thirtyDaysAgo),
  ]);

  const activities = (activitiesResult.data || []) as DbActivity[];
  const activityTypes = (activityTypesResult.data || []) as DbActivityType[];
  const voiceNotes = (voiceNotesResult.data || []) as DbVoiceNote[];
  const goals = (goalsResult.data || []) as DbGoal[];
  const achievements = (achievementsResult.data || []) as DbAchievement[];

  console.log(`- Activities: ${activities.length}`);
  console.log(`- Activity Types: ${activityTypes.filter(t => !t.deleted).length}`);
  console.log(`- Voice Notes: ${voiceNotes.length}`);
  console.log(`- Goals: ${goals.length}`);
  console.log(`- Achievements: ${achievements.length}`);

  // 3. Assess Data State
  const dataStateAssessment = assessDataState(activityTypes, activities, 30);
  console.log(`\nData State: ${dataStateAssessment.state}`);

  if (dataStateAssessment.state === "no_activity_types") {
      console.log("No activity types. Exiting.");
      return;
  }

  // 4. Compile Context
  const context = compileCheckInContext(
    dataStateAssessment.state,
    activities,
    activityTypes,
    voiceNotes,
    goals,
    achievements,
    thirtyDaysAgo,
    todayStr
  );

  console.log("\n" + "=".repeat(80));
  console.log("GENERATED CONTEXT (The Ground Truth)");
  console.log("=".repeat(80));
  
  // Log key parts of context
  console.log("\nActivity Analysis:");
  console.log(JSON.stringify(context.activityAnalysis, null, 2));

  console.log("\nHighlights:");
  console.log(JSON.stringify(context.highlights, null, 2));

  console.log("\nVoice Note Analysis:");
  console.log(JSON.stringify(context.voiceNoteAnalysis, null, 2));

  // 5. Generate Prompt
  const prompt = buildCheckInPrompt(context);
  console.log("\n" + "=".repeat(80));
  console.log("GENERATED PROMPT (What the LLM sees)");
  console.log("=".repeat(80));
  console.log(prompt);

  // 6. Optional: Generate Actual Check-in
  if (process.env.OPENAI_API_KEY) {
      console.log("\n" + "=".repeat(80));
      console.log("GENERATING CHECK-IN ANALYSIS FROM LLM...");
      console.log("=".repeat(80));
      try {
          const analysis = await generateCheckInAnalysis(context);
          console.log("\n--- RESULT ---");
          console.log(JSON.stringify(analysis, null, 2));

          console.log("\n" + "=".repeat(80));
          console.log("AUDIT COMPARISON");
          console.log("=".repeat(80));
          console.log("Check the 'RESULT' above against the 'CONTEXT' above.");
      } catch (e) {
          console.error("Failed to generate check-in:", e);
      }
  } else {
      console.log("\nSkipping LLM generation (OPENAI_API_KEY not found)");
  }
}

main().catch(console.error);
