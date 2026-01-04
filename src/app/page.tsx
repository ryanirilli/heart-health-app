import {
  ActivityCalendar,
  ActivityProvider,
} from "@/components/ActivityCalendar";
import { ActivityHeader } from "@/components/ActivityHeader";
import { createClient } from "@/lib/supabase/server";
import { ActivityTypeMap, ActivityType } from "@/lib/activityTypes";
import { ActivityMap, ActivityEntry } from "@/lib/activities";
import { DbActivityType, DbActivity } from "@/lib/supabase/types";

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

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // This shouldn't happen due to middleware, but just in case
  if (!user) {
    return null;
  }

  const { types, activities } = await getActivityData(user.id);

  return (
    <main className="min-h-screen p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-6">
        <ActivityProvider initialTypes={types} initialActivities={activities}>
          <ActivityHeader />
          <ActivityCalendar />
        </ActivityProvider>
      </div>
    </main>
  );
}
