import { createClient } from "@/lib/supabase/server";
import { ActivityTypeMap, ActivityType } from "@/lib/activityTypes";
import { ActivityMap, ActivityEntry } from "@/lib/activities";
import { GoalMap, Goal, isValidGoalIcon } from "@/lib/goals";
import { DbActivityType, DbActivity, DbGoal } from "@/lib/supabase/types";
import { DashboardContent } from "@/components/DashboardContent";

async function getActivityData(userId: string) {
  const supabase = await createClient();

  // Fetch activity types
  const { data: dbTypes } = await supabase
    .from("activity_types")
    .select("*")
    .eq("user_id", userId)
    .order("display_order", { ascending: true });

  // Fetch activities
  const { data: dbActivities } = await supabase
    .from("activities")
    .select("*")
    .eq("user_id", userId);

  // Convert DB types to app types
  const types: ActivityTypeMap = {};
  (dbTypes as DbActivityType[] | null)?.forEach((t) => {
    types[t.id] = {
      id: t.id,
      name: t.name,
      unit: t.unit ?? undefined,
      pluralize: t.pluralize,
      isNegative: t.is_negative ?? undefined,
      goalType: t.goal_type ?? undefined,
      uiType: t.ui_type,
      minValue: t.min_value ?? undefined,
      maxValue: t.max_value ?? undefined,
      step: t.step ?? undefined,
      buttonOptions: t.button_options ?? undefined,
      deleted: t.deleted,
      order: t.display_order,
    } as ActivityType;
  });

  // Convert DB activities to app format (grouped by date)
  const activities: ActivityMap = {};
  (dbActivities as DbActivity[] | null)?.forEach((a) => {
    if (!activities[a.date]) {
      activities[a.date] = {
        date: a.date,
        entries: {},
      };
    }
    activities[a.date].entries[a.activity_type_id] = {
      typeId: a.activity_type_id,
      value: a.value,
    } as ActivityEntry;
  });

  return { types, activities };
}

async function getGoalsData(userId: string) {
  const supabase = await createClient();

  // Fetch goals
  const { data: dbGoals } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  // Convert DB goals to app format
  const goals: GoalMap = {};
  (dbGoals as DbGoal[] | null)?.forEach((g) => {
    goals[g.id] = {
      id: g.id,
      activityTypeId: g.activity_type_id,
      name: g.name,
      targetValue: g.target_value,
      icon: isValidGoalIcon(g.icon) ? g.icon : 'target',
      dateType: g.date_type,
      targetDate: g.target_date ?? undefined,
      startDate: g.start_date ?? undefined,
      endDate: g.end_date ?? undefined,
    } as Goal;
  });

  return goals;
}

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // This shouldn't happen due to middleware, but just in case
  if (!user) {
    return null;
  }

  // Fetch all data in parallel
  const [{ types, activities }, goals] = await Promise.all([
    getActivityData(user.id),
    getGoalsData(user.id),
  ]);

  return <DashboardContent types={types} activities={activities} goals={goals} />;
}
