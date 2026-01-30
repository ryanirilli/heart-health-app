import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { subDays, format, parseISO } from "date-fns";
import {
  CheckIn,
  CheckInsResponse,
  DataState,
  dbCheckInToCheckIn,
  canGenerateCheckIn,
} from "@/lib/checkIns";
import { assessDataState } from "@/lib/checkInDataProcessor";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const offset = (page - 1) * limit;

  // Get date boundaries
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const thirtyDaysAgo = format(subDays(today, 30), "yyyy-MM-dd");

  // Fetch check-ins, activity types, and recent activities in parallel
  const [
    checkInsResult,
    countResult,
    activityTypesResult,
    activitiesResult,
    latestCheckInResult,
  ] = await Promise.all([
    // Paginated check-ins
    supabase
      .from("check_ins")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1),
    // Total count
    supabase
      .from("check_ins")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "completed"),
    // Activity types for data state assessment
    supabase
      .from("activity_types")
      .select("*")
      .eq("user_id", user.id),
    // Recent activities for data state assessment
    supabase
      .from("activities")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", thirtyDaysAgo),
    // Latest check-in for rate limiting
    supabase
      .from("check_ins")
      .select("created_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
  ]);

  if (checkInsResult.error) {
    return NextResponse.json(
      { error: checkInsResult.error.message },
      { status: 500 }
    );
  }

  // Convert database format to application format
  const checkIns: CheckIn[] = (checkInsResult.data || []).map(dbCheckInToCheckIn);
  const total = countResult.count || 0;

  // Assess data state
  const activityTypes = activityTypesResult.data || [];
  const activities = activitiesResult.data || [];
  const dataStateAssessment = assessDataState(activityTypes, activities, 30);

  // Check rate limiting
  const lastCheckInDate = latestCheckInResult.data?.created_at
    ? format(parseISO(latestCheckInResult.data.created_at), "yyyy-MM-dd")
    : null;
  const { canGenerate, nextAvailableDate } = canGenerateCheckIn(
    lastCheckInDate,
    dataStateAssessment.state
  );

  const response: CheckInsResponse = {
    checkIns,
    total,
    canGenerateNew: canGenerate,
    nextAvailableDate,
    dataState: dataStateAssessment.state,
    dataStateDetails: {
      activityTypeCount: dataStateAssessment.activityTypeCount,
      daysWithEntries: dataStateAssessment.daysWithEntries,
      totalEntries: dataStateAssessment.totalEntries,
    },
  };

  return NextResponse.json(response);
}
