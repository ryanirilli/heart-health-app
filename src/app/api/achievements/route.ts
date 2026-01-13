import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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

  // Get today's date in YYYY-MM-DD format for filtering completed achievements
  const today = new Date().toISOString().split('T')[0];

  // Fetch total count (only completed achievements)
  const { count } = await supabase
    .from("achievements")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .lte("period_end", today);

  // Fetch paginated achievements with goal info (only where period has ended)
  const { data: achievements, error } = await supabase
    .from("achievements")
    .select(`
      id,
      goal_id,
      period_start,
      period_end,
      achieved_value,
      target_value,
      achieved_at,
      goals (
        id,
        name,
        icon,
        activity_type_id
      )
    `)
    .eq("user_id", user.id)
    .lte("period_end", today)
    .order("achieved_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    achievements: achievements || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
}
