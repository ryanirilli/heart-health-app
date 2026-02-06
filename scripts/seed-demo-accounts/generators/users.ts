/**
 * User generator - creates and manages demo auth users
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DEMO_PASSWORD, type DemoAccountConfig } from '../config';

export interface CreatedUser {
  id: string;
  email: string;
}

/**
 * Create or reset a demo user
 * If user exists, deletes all their data and recreates them
 */
export async function createOrResetUser(
  supabase: SupabaseClient,
  account: DemoAccountConfig
): Promise<CreatedUser> {
  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users.find((u) => u.email === account.email);

  if (existingUser) {
    console.log(`   Resetting existing user: ${account.email}`);

    // Delete all user data (achievements will cascade, activities trigger will handle)
    const userId = existingUser.id;

    // Delete in order due to foreign key constraints
    await supabase.from('check_ins').delete().eq('user_id', userId);
    await supabase.from('achievements').delete().eq('user_id', userId);
    await supabase.from('activity_notes').delete().eq('user_id', userId);
    await supabase.from('voice_notes').delete().eq('user_id', userId);
    await supabase.from('activities').delete().eq('user_id', userId);
    await supabase.from('goals').delete().eq('user_id', userId);
    await supabase.from('activity_types').delete().eq('user_id', userId);

    // Update profile display name
    await supabase
      .from('profiles')
      .update({ display_name: account.displayName })
      .eq('user_id', userId);

    return { id: userId, email: account.email };
  }

  // Create new user
  console.log(`   Creating new user: ${account.email}`);
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: account.email,
    email_confirm: true,
    password: DEMO_PASSWORD,
  });

  if (createError || !newUser.user) {
    throw new Error(`Failed to create user ${account.email}: ${createError?.message}`);
  }

  // Update profile display name (profile is auto-created by trigger)
  // Small delay to ensure trigger has run
  await new Promise((resolve) => setTimeout(resolve, 500));

  await supabase
    .from('profiles')
    .update({ display_name: account.displayName })
    .eq('user_id', newUser.user.id);

  return { id: newUser.user.id, email: account.email };
}

/**
 * Delete a demo user completely
 */
export async function deleteUser(
  supabase: SupabaseClient,
  email: string
): Promise<boolean> {
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users.find((u) => u.email === email);

  if (!existingUser) {
    return false;
  }

  const userId = existingUser.id;

  // Delete all user data first (in order due to foreign key constraints)
  await supabase.from('check_ins').delete().eq('user_id', userId);
  await supabase.from('achievements').delete().eq('user_id', userId);
  await supabase.from('activity_notes').delete().eq('user_id', userId);
  await supabase.from('voice_notes').delete().eq('user_id', userId);
  await supabase.from('activities').delete().eq('user_id', userId);
  await supabase.from('goals').delete().eq('user_id', userId);
  await supabase.from('activity_types').delete().eq('user_id', userId);
  await supabase.from('profiles').delete().eq('user_id', userId);

  // Now delete auth user
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    throw new Error(`Failed to delete user ${email}: ${error.message}`);
  }

  return true;
}

/**
 * List all demo users
 */
export async function listDemoUsers(
  supabase: SupabaseClient,
  demoEmails: string[]
): Promise<{ email: string; id: string; created: string }[]> {
  const { data: allUsers } = await supabase.auth.admin.listUsers();

  if (!allUsers?.users) {
    return [];
  }

  return allUsers.users
    .filter((u) => u.email && demoEmails.includes(u.email))
    .map((u) => ({
      email: u.email!,
      id: u.id,
      created: u.created_at,
    }));
}
