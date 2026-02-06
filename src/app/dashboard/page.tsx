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
  // Note: Supabase has a default 1000 row limit, so we explicitly set a higher limit
  const { data: dbActivities } = await supabase
    .from("activities")
    .select("*")
    .eq("user_id", userId)
    .limit(10000);

  // Fetch notes
  const { data: dbNotes } = await supabase
    .from("activity_notes")
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

  // Create a map of date -> note
  const notesMap = new Map<string, string>();
  // We need to typecase dbNotes since we don't import the DbActivityNote type here yet, 
  // but it's cleaner to let TS infer or add the import if needed.
  // Actually DbActivityNote IS imported.
  // Let's use it.
  (dbNotes as any[] | null)?.forEach((n) => {
    notesMap.set(n.date, n.note);
  });

  // Convert DB activities to app format (grouped by date)
  const activities: ActivityMap = {};
  (dbActivities as DbActivity[] | null)?.forEach((a) => {
    if (!activities[a.date]) {
      activities[a.date] = {
        date: a.date,
        entries: {},
        note: notesMap.get(a.date),
      };
    }
    activities[a.date].entries[a.activity_type_id] = {
      typeId: a.activity_type_id,
      value: a.value,
    } as ActivityEntry;
  });

  // Also include notes for dates that have notes but no activities
  notesMap.forEach((note, date) => {
    if (!activities[date]) {
      activities[date] = {
        date,
        entries: {},
        note,
      };
    }
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
    // Extract just the date part from created_at timestamp
    const createdAtDate = g.created_at.split('T')[0];
    goals[g.id] = {
      id: g.id,
      activityTypeId: g.activity_type_id,
      name: g.name,
      targetValue: g.target_value,
      icon: isValidGoalIcon(g.icon) ? g.icon : 'target',
      dateType: g.date_type,
      trackingType: g.tracking_type ?? 'average',
      targetDate: g.target_date ?? undefined,
      startDate: g.start_date ?? undefined,
      endDate: g.end_date ?? undefined,
      createdAt: createdAtDate,
    } as Goal;
  });

  return goals;
}

interface DashboardProps {
  searchParams: Promise<{ confirmed?: string }>;
}

export default async function Dashboard({ searchParams }: DashboardProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // This shouldn't happen due to middleware, but just in case
  if (!user) {
    return null;
  }

  const { confirmed } = await searchParams;

  // Fetch all data in parallel
  const [{ types, activities }, goals] = await Promise.all([
    getActivityData(user.id),
    getGoalsData(user.id),
  ]);

  return (
    <DashboardContent 
      types={types} 
      activities={activities} 
      goals={goals} 
      showWelcomeToast={confirmed === 'true'}
    />
  );
}
