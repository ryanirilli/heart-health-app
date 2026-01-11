import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DbProfile, DbProfileUpdate } from "@/lib/supabase/types";

// Maximum bio length (validated both client and server side)
const MAX_BIO_LENGTH = 500;
const MAX_DISPLAY_NAME_LENGTH = 100;

// GET /api/profile - Fetch current user's profile
export async function GET() {
  const supabase = await createClient();

  // Verify the user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch the user's profile (RLS ensures they can only see their own)
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    // Profile might not exist if user was created before the trigger was added
    if (error.code === "PGRST116") {
      return NextResponse.json({ profile: null }, { status: 200 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: profile as DbProfile });
}

// PATCH /api/profile - Update current user's profile
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  // Verify the user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse and validate the request body
  let body: DbProfileUpdate;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate display_name
  if (body.display_name !== undefined) {
    if (
      body.display_name !== null &&
      typeof body.display_name !== "string"
    ) {
      return NextResponse.json(
        { error: "display_name must be a string or null" },
        { status: 400 }
      );
    }
    if (
      body.display_name &&
      body.display_name.length > MAX_DISPLAY_NAME_LENGTH
    ) {
      return NextResponse.json(
        { error: `display_name must be ${MAX_DISPLAY_NAME_LENGTH} characters or less` },
        { status: 400 }
      );
    }
    // Sanitize: trim whitespace
    if (body.display_name) {
      body.display_name = body.display_name.trim();
    }
  }

  // Validate bio
  if (body.bio !== undefined) {
    if (body.bio !== null && typeof body.bio !== "string") {
      return NextResponse.json(
        { error: "bio must be a string or null" },
        { status: 400 }
      );
    }
    if (body.bio && body.bio.length > MAX_BIO_LENGTH) {
      return NextResponse.json(
        { error: `bio must be ${MAX_BIO_LENGTH} characters or less` },
        { status: 400 }
      );
    }
    // Sanitize: trim whitespace
    if (body.bio) {
      body.bio = body.bio.trim();
    }
  }

  // Only allow specific fields to be updated (whitelist approach)
  const allowedUpdates: DbProfileUpdate = {};
  if (body.display_name !== undefined) {
    allowedUpdates.display_name = body.display_name;
  }
  if (body.bio !== undefined) {
    allowedUpdates.bio = body.bio;
  }

  // Check if profile exists
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  let profile: DbProfile;

  if (!existingProfile) {
    // Create a new profile if it doesn't exist
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        user_id: user.id,
        ...allowedUpdates,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    profile = data as DbProfile;
  } else {
    // Update the existing profile (RLS ensures they can only update their own)
    const { data, error } = await supabase
      .from("profiles")
      .update(allowedUpdates)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    profile = data as DbProfile;
  }

  return NextResponse.json({ profile });
}

