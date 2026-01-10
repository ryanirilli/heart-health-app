#!/usr/bin/env bun
/**
 * Deep dive analysis script for goal calculation and display logic
 *
 * Run with: bun scripts/analyze-user-data.ts
 *
 * Reads from .env.local for credentials
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
const SUPABASE_URL = envVars.PROD_SUPABASE_URL || process.env.PROD_SUPABASE_URL;
const SERVICE_ROLE_KEY =
  envVars.PROD_SERVICE_ROLE_KEY || process.env.PROD_SERVICE_ROLE_KEY;
const TARGET_EMAIL =
  envVars.TARGET_EMAIL || process.env.TARGET_EMAIL || "ryanirilli@gmail.com";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing required environment variables:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_ROLE_KEY");
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
  console.log("=".repeat(80));
  console.log("DEEP DIVE: Goal Calculation and Display Logic Analysis");
  console.log(`Target User: ${TARGET_EMAIL}`);
  console.log("=".repeat(80));
  console.log();

  // 1. Get the user ID for the target email
  const { data: users, error: userError } =
    await supabase.auth.admin.listUsers();

  if (userError) {
    console.error("Failed to fetch users:", userError);
    process.exit(1);
  }

  const targetUser = users.users.find((u) => u.email === TARGET_EMAIL);

  if (!targetUser) {
    console.error(`User with email ${TARGET_EMAIL} not found`);
    process.exit(1);
  }

  const userId = targetUser.id;
  console.log(`Found user: ${targetUser.email} (ID: ${userId})`);
  console.log();

  // 2. Fetch all activity types for this user
  console.log("=".repeat(80));
  console.log("ACTIVITY TYPES");
  console.log("=".repeat(80));

  const { data: activityTypes, error: typesError } = await supabase
    .from("activity_types")
    .select("*")
    .eq("user_id", userId)
    .order("display_order");

  if (typesError) {
    console.error("Failed to fetch activity types:", typesError);
  } else {
    console.log(`Found ${activityTypes?.length || 0} activity types:\n`);
    activityTypes?.forEach((type) => {
      console.log(`  📊 ${type.name} (${type.id})`);
      console.log(`     UI Type: ${type.ui_type}`);
      console.log(
        `     Goal Type: ${type.goal_type || "null (defaults to neutral)"}`
      );
      console.log(`     Unit: ${type.unit || "none"}`);
      console.log(`     Deleted: ${type.deleted}`);
      if (type.ui_type === "buttonGroup" && type.button_options) {
        console.log(
          `     Button Options: ${JSON.stringify(type.button_options)}`
        );
      }
      if (type.ui_type === "slider") {
        console.log(
          `     Range: ${type.min_value} - ${type.max_value} (step: ${type.step})`
        );
      }
      console.log();
    });
  }

  // 3. Fetch all goals for this user
  console.log("=".repeat(80));
  console.log("GOALS");
  console.log("=".repeat(80));

  const { data: goals, error: goalsError } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (goalsError) {
    console.error("Failed to fetch goals:", goalsError);
  } else {
    console.log(`Found ${goals?.length || 0} goals:\n`);
    goals?.forEach((goal) => {
      const activityType = activityTypes?.find(
        (t) => t.id === goal.activity_type_id
      );
      console.log(`  🎯 ${goal.name} (${goal.id})`);
      console.log(
        `     Activity Type: ${activityType?.name || "UNKNOWN"} (${
          goal.activity_type_id
        })`
      );
      console.log(`     Target Value: ${goal.target_value}`);
      console.log(`     Date Type: ${goal.date_type}`);
      console.log(
        `     Tracking Type: ${
          goal.tracking_type || "null (defaults to average)"
        }`
      );
      console.log(`     Created At: ${goal.created_at}`);
      if (goal.date_type === "by_date") {
        console.log(`     Target Date: ${goal.target_date}`);
      }
      if (goal.date_type === "date_range") {
        console.log(`     Date Range: ${goal.start_date} to ${goal.end_date}`);
      }
      console.log();
    });
  }

  // 4. Fetch all activities for this user
  console.log("=".repeat(80));
  console.log("ACTIVITIES (Last 30 days)");
  console.log("=".repeat(80));

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  const { data: activities, error: activitiesError } = await supabase
    .from("activities")
    .select("*")
    .eq("user_id", userId)
    .gte("date", thirtyDaysAgoStr)
    .order("date", { ascending: false });

  if (activitiesError) {
    console.error("Failed to fetch activities:", activitiesError);
  } else {
    console.log(
      `Found ${activities?.length || 0} activity entries in the last 30 days:\n`
    );

    // Group by date
    const byDate: Record<string, typeof activities> = {};
    activities?.forEach((activity) => {
      if (!byDate[activity.date]) {
        byDate[activity.date] = [];
      }
      byDate[activity.date].push(activity);
    });

    Object.entries(byDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .forEach(([date, entries]) => {
        console.log(`  📅 ${date}:`);
        entries.forEach((entry) => {
          const activityType = activityTypes?.find(
            (t) => t.id === entry.activity_type_id
          );
          let displayValue = String(entry.value);

          if (activityType?.ui_type === "toggle") {
            displayValue = entry.value === 1 ? "Yes" : "No";
          } else if (
            activityType?.ui_type === "buttonGroup" &&
            activityType.button_options
          ) {
            const option = activityType.button_options.find(
              (o) => o.value === entry.value
            );
            displayValue = option?.label || String(entry.value);
          }

          console.log(
            `     - ${
              activityType?.name || entry.activity_type_id
            }: ${displayValue} (raw: ${entry.value})`
          );
        });
        console.log();
      });
  }

  // 5. Fetch achievements
  console.log("=".repeat(80));
  console.log("ACHIEVEMENTS");
  console.log("=".repeat(80));

  const { data: achievements, error: achievementsError } = await supabase
    .from("achievements")
    .select("*")
    .eq("user_id", userId)
    .order("achieved_at", { ascending: false });

  if (achievementsError) {
    console.error("Failed to fetch achievements:", achievementsError);
  } else {
    console.log(`Found ${achievements?.length || 0} achievements:\n`);
    achievements?.forEach((achievement) => {
      const goal = goals?.find((g) => g.id === achievement.goal_id);
      const activityType = activityTypes?.find(
        (t) => t.id === goal?.activity_type_id
      );
      console.log(`  🏆 Achievement for goal: ${goal?.name || "UNKNOWN"}`);
      console.log(`     Activity Type: ${activityType?.name || "UNKNOWN"}`);
      console.log(
        `     Period: ${achievement.period_start} to ${achievement.period_end}`
      );
      console.log(`     Achieved Value: ${achievement.achieved_value}`);
      console.log(`     Target Value: ${achievement.target_value}`);
      console.log(`     Achieved At: ${achievement.achieved_at}`);
      console.log();
    });
  }

  // 6. Goal Calculation Analysis
  console.log("=".repeat(80));
  console.log("GOAL CALCULATION ANALYSIS");
  console.log("=".repeat(80));
  console.log();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Helper functions
  function getWeekStart(dateStr: string): string {
    const date = new Date(dateStr + "T12:00:00");
    const day = date.getDay();
    const daysToSubtract = day === 0 ? 6 : day - 1;
    date.setDate(date.getDate() - daysToSubtract);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function getWeekEnd(dateStr: string): string {
    const date = new Date(dateStr + "T12:00:00");
    const day = date.getDay();
    const daysToAdd = day === 0 ? 0 : 7 - day;
    date.setDate(date.getDate() + daysToAdd);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function getMonthStart(dateStr: string): string {
    const date = new Date(dateStr + "T12:00:00");
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-01`;
  }

  function getMonthEnd(dateStr: string): string {
    const date = new Date(dateStr + "T12:00:00");
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(lastDay.getDate()).padStart(2, "0")}`;
  }

  // Analyze each goal
  for (const goal of goals || []) {
    const activityType = activityTypes?.find(
      (t) => t.id === goal.activity_type_id
    );
    const goalType = activityType?.goal_type || "positive";
    const trackingType = goal.tracking_type || "average";

    console.log(`\n🎯 Analyzing Goal: "${goal.name}"`);
    console.log(
      `   Activity: ${activityType?.name} (UI: ${activityType?.ui_type}, Goal Type: ${goalType})`
    );
    console.log(
      `   Target: ${goal.target_value}, Date Type: ${goal.date_type}, Tracking: ${trackingType}`
    );

    // Determine period based on date type
    let periodStart: string;
    let periodEnd: string;

    switch (goal.date_type) {
      case "daily":
        periodStart = todayStr;
        periodEnd = todayStr;
        break;
      case "weekly":
        periodStart = getWeekStart(todayStr);
        periodEnd = getWeekEnd(todayStr);
        break;
      case "monthly":
        periodStart = getMonthStart(todayStr);
        periodEnd = getMonthEnd(todayStr);
        break;
      case "by_date":
        periodStart = goal.created_at.split("T")[0];
        periodEnd = goal.target_date || todayStr;
        break;
      case "date_range":
        periodStart = goal.start_date || todayStr;
        periodEnd = goal.end_date || todayStr;
        break;
      default:
        continue;
    }

    console.log(`   Period: ${periodStart} to ${periodEnd}`);

    // Get activities for this goal's period
    const periodActivities =
      activities?.filter(
        (a) =>
          a.activity_type_id === goal.activity_type_id &&
          a.date >= periodStart &&
          a.date <= (todayStr < periodEnd ? todayStr : periodEnd)
      ) || [];

    console.log(`   Activities in period: ${periodActivities.length}`);

    if (periodActivities.length > 0) {
      const values = periodActivities.map((a) => a.value);
      const sum = values.reduce((acc, v) => acc + v, 0);
      const avg = sum / values.length;

      // Check if this is a discrete type (buttonGroup/toggle)
      const isDiscreteType =
        activityType?.ui_type === "buttonGroup" ||
        activityType?.ui_type === "toggle";

      // Count days meeting target
      // For discrete types: ALWAYS use exact match (value === target)
      // For continuous types: use goalType comparison
      let daysMet = 0;
      if (isDiscreteType) {
        // Discrete types always use exact match
        daysMet = values.filter((v) => v === goal.target_value).length;
      } else if (goalType === "negative") {
        daysMet = values.filter((v) => v <= goal.target_value).length;
      } else if (goalType === "neutral") {
        daysMet = values.filter((v) => v === goal.target_value).length;
      } else {
        daysMet = values.filter((v) => v >= goal.target_value).length;
      }

      const matchRatio = daysMet / values.length;

      console.log(`   Values: [${values.join(", ")}]`);
      console.log(`   Sum: ${sum}, Average: ${avg.toFixed(2)}`);
      console.log(
        `   Days matching target (exact): ${daysMet}/${values.length} (${(
          matchRatio * 100
        ).toFixed(0)}%)`
      );

      // Determine effective value based on UI type and tracking type
      let effectiveValue: number;
      let goalMet: boolean;

      if (isDiscreteType) {
        // For discrete types (buttonGroup/toggle):
        // - Absolute: ALL days must match target exactly
        // - Average: MAJORITY (>50%) of days must match target exactly
        if (trackingType === "absolute") {
          const allDaysMet = daysMet === values.length;
          effectiveValue = daysMet;
          goalMet = allDaysMet;
          console.log(`   [Discrete - Absolute] All days match: ${allDaysMet}`);
        } else {
          // Average tracking: majority (>50%) must match
          effectiveValue = matchRatio;
          goalMet = matchRatio > 0.5;
          console.log(
            `   [Discrete - Average] Match ratio: ${(matchRatio * 100).toFixed(
              0
            )}% (need >50%)`
          );
        }
      } else if (activityType?.ui_type === "slider") {
        effectiveValue = avg;
        if (goalType === "negative") {
          goalMet = effectiveValue <= goal.target_value;
        } else if (goalType === "neutral") {
          goalMet = effectiveValue === goal.target_value;
        } else {
          goalMet = effectiveValue >= goal.target_value;
        }
        console.log(`   [Slider - Average] Avg: ${avg.toFixed(2)}`);
      } else {
        // Increment - uses sum
        effectiveValue = sum;
        if (goalType === "negative") {
          goalMet = effectiveValue <= goal.target_value;
        } else if (goalType === "neutral") {
          goalMet = effectiveValue === goal.target_value;
        } else {
          goalMet = effectiveValue >= goal.target_value;
        }
        console.log(`   [Increment - Sum] Total: ${sum}`);
      }

      console.log(`   Effective Value: ${effectiveValue.toFixed(2)}`);
      console.log(`   Goal Met: ${goalMet ? "✅ YES" : "❌ NO"}`);

      // Check if there's an achievement for this period
      const achievement = achievements?.find(
        (a) =>
          a.goal_id === goal.id &&
          a.period_start === periodStart &&
          a.period_end === periodEnd
      );

      if (achievement) {
        console.log(
          `   Achievement exists: achieved_value=${achievement.achieved_value}, target=${achievement.target_value}`
        );
      } else {
        console.log(`   No achievement record for this period`);
      }

      // Highlight potential issues
      if (goalMet && !achievement) {
        console.log(
          `   ⚠️  ISSUE: Goal should be met but no achievement exists!`
        );
      } else if (!goalMet && achievement) {
        console.log(`   ⚠️  ISSUE: Goal not met but achievement exists!`);
      }
    } else {
      console.log(`   No activities logged for this period`);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("ANALYSIS COMPLETE");
  console.log("=".repeat(80));
}

main().catch(console.error);
