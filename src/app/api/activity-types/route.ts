import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ActivityType,
  ActivityTypeMap,
  MAX_ACTIVITY_TYPES,
} from "@/lib/activityTypes";
import { DbActivityType } from "@/lib/supabase/types";

// Get all activity types for the authenticated user
export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch activity types
    const { data: dbTypes, error } = await supabase
      .from("activity_types")
      .select("*")
      .eq("user_id", user.id)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Failed to fetch activity types:", error);
      return NextResponse.json(
        { error: "Failed to fetch activity types" },
        { status: 500 }
      );
    }

    // Convert DB types to app format
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

    return NextResponse.json(types);
  } catch (error) {
    console.error("Failed to fetch activity types:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity types" },
      { status: 500 }
    );
  }
}

// Create a new activity type
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const newType = (await request.json()) as ActivityType;

    if (!newType.id || !newType.name) {
      return NextResponse.json(
        { error: "Missing required fields: id, name" },
        { status: 400 }
      );
    }

    // Check if we've hit the limit
    const { count } = await supabase
      .from("activity_types")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("deleted", false);

    if (count !== null && count >= MAX_ACTIVITY_TYPES) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_ACTIVITY_TYPES} activity types allowed` },
        { status: 400 }
      );
    }

    // Insert the new type
    const { error } = await supabase.from("activity_types").insert({
      id: newType.id,
      user_id: user.id,
      name: newType.name,
      unit: newType.unit || null,
      pluralize: newType.pluralize ?? true,
      is_negative: newType.isNegative ?? null,
      goal_type: newType.goalType || null,
      ui_type: newType.uiType || "increment",
      min_value: newType.minValue ?? null,
      max_value: newType.maxValue ?? null,
      step: newType.step ?? null,
      button_options: newType.buttonOptions || null,
      deleted: false,
      display_order: newType.order ?? 0,
    });

    if (error) {
      console.error("Failed to create activity type:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Activity type with this ID already exists" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Failed to create activity type" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, type: newType });
  } catch (error) {
    console.error("Failed to create activity type:", error);
    return NextResponse.json(
      { error: "Failed to create activity type" },
      { status: 500 }
    );
  }
}

// Update an existing activity type
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updatedType = (await request.json()) as ActivityType;

    if (!updatedType.id) {
      return NextResponse.json(
        { error: "Missing required field: id" },
        { status: 400 }
      );
    }

    // Update the type (RLS ensures user can only update their own)
    const { error } = await supabase
      .from("activity_types")
      .update({
        name: updatedType.name,
        unit: updatedType.unit || null,
        pluralize: updatedType.pluralize ?? true,
        is_negative: updatedType.isNegative ?? null,
        goal_type: updatedType.goalType || null,
        ui_type: updatedType.uiType || "increment",
        min_value: updatedType.minValue ?? null,
        max_value: updatedType.maxValue ?? null,
        step: updatedType.step ?? null,
        button_options: updatedType.buttonOptions || null,
        deleted: updatedType.deleted ?? false,
        display_order: updatedType.order ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", updatedType.id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to update activity type:", error);
      return NextResponse.json(
        { error: "Failed to update activity type" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, type: updatedType });
  } catch (error) {
    console.error("Failed to update activity type:", error);
    return NextResponse.json(
      { error: "Failed to update activity type" },
      { status: 500 }
    );
  }
}

// Soft delete an activity type (mark as deleted)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // Soft delete - mark as deleted
    const { error } = await supabase
      .from("activity_types")
      .update({
        deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to delete activity type:", error);
      return NextResponse.json(
        { error: "Failed to delete activity type" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete activity type:", error);
    return NextResponse.json(
      { error: "Failed to delete activity type" },
      { status: 500 }
    );
  }
}
