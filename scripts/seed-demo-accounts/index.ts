#!/usr/bin/env bun
/**
 * Demo Account Seeding Script
 *
 * Creates demo accounts with realistic data at various progression levels.
 *
 * Usage:
 *   bun scripts/seed-demo-accounts/index.ts              # Seed all to dev
 *   bun scripts/seed-demo-accounts/index.ts --env=prod   # Seed all to prod
 *   bun scripts/seed-demo-accounts/index.ts --env=all    # Seed to both
 *   bun scripts/seed-demo-accounts/index.ts --level=one-year  # Seed specific level
 *   bun scripts/seed-demo-accounts/index.ts --cleanup    # Delete demo accounts
 *   bun scripts/seed-demo-accounts/index.ts --list       # List demo accounts
 *   bun scripts/seed-demo-accounts/index.ts --dry-run    # Preview without changes
 */

import { DEMO_ACCOUNTS, DEMO_PASSWORD, type DemoLevel, type DemoAccountConfig } from './config';
import { getSupabaseClient, validateEnvironment, type Environment } from './supabase';
import { createOrResetUser, deleteUser, listDemoUsers } from './generators/users';
import { createActivityTypes } from './generators/activity-types';
import { createGoals } from './generators/goals';
import { createActivities } from './generators/activities';
import { createNotes } from './generators/notes';
import { createCheckIns } from './generators/check-ins';
import { getLevelSummary, getAllLevels, type LevelSummary } from './levels';

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

interface CliArgs {
  env: Environment | 'all';
  level?: DemoLevel;
  cleanup: boolean;
  list: boolean;
  dryRun: boolean;
  help: boolean;
}

function parseArgs(): CliArgs {
  const args: CliArgs = {
    env: 'dev',
    cleanup: false,
    list: false,
    dryRun: false,
    help: false,
  };

  for (const arg of process.argv.slice(2)) {
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--cleanup') {
      args.cleanup = true;
    } else if (arg === '--list') {
      args.list = true;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg.startsWith('--env=')) {
      const env = arg.slice(6) as Environment | 'all';
      if (!['dev', 'prod', 'all'].includes(env)) {
        console.error(`Invalid environment: ${env}. Use dev, prod, or all.`);
        process.exit(1);
      }
      args.env = env;
    } else if (arg.startsWith('--level=')) {
      const level = arg.slice(8) as DemoLevel;
      const validLevels = getAllLevels();
      if (!validLevels.includes(level)) {
        console.error(`Invalid level: ${level}`);
        console.error(`Valid levels: ${validLevels.join(', ')}`);
        process.exit(1);
      }
      args.level = level;
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`
Demo Account Seeding Script

Creates demo accounts with realistic data at various progression levels.

USAGE:
  bun scripts/seed-demo-accounts/index.ts [OPTIONS]

OPTIONS:
  --env=<env>      Environment to seed (dev, prod, all). Default: dev
  --level=<level>  Seed only a specific level. Default: all levels
  --cleanup        Delete all demo accounts instead of creating
  --list           List existing demo accounts
  --dry-run        Preview what would be created without making changes
  --help, -h       Show this help message

LEVELS:
  new-user       Empty account - just signed up
  just-started   First week with basic tracking
  one-month      One month of building habits
  six-months     Six months of consistent tracking
  one-year       Full year - all features utilized

EXAMPLES:
  bun scripts/seed-demo-accounts/index.ts
  bun scripts/seed-demo-accounts/index.ts --env=prod
  bun scripts/seed-demo-accounts/index.ts --level=one-year
  bun scripts/seed-demo-accounts/index.ts --env=all --level=six-months
  bun scripts/seed-demo-accounts/index.ts --cleanup --env=prod
  bun scripts/seed-demo-accounts/index.ts --list

DEMO ACCOUNTS:
${DEMO_ACCOUNTS.map((a) => `  ${a.email.padEnd(30)} ${a.description}`).join('\n')}

PASSWORD: ${DEMO_PASSWORD}
`);
}

// ============================================================================
// MAIN OPERATIONS
// ============================================================================

async function listAccounts(env: Environment): Promise<void> {
  console.log(`\nListing demo accounts in ${env}...`);

  const supabase = getSupabaseClient(env);
  const emails = DEMO_ACCOUNTS.map((a) => a.email);
  const users = await listDemoUsers(supabase, emails);

  if (users.length === 0) {
    console.log('  No demo accounts found.');
    return;
  }

  console.log(`\n  Found ${users.length} demo account(s):\n`);
  for (const user of users) {
    console.log(`  - ${user.email}`);
    console.log(`    ID: ${user.id}`);
    console.log(`    Created: ${user.created}`);
    console.log();
  }
}

async function cleanupAccounts(env: Environment, dryRun: boolean): Promise<void> {
  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Cleaning up demo accounts in ${env}...`);

  if (dryRun) {
    console.log('\n  Would delete:');
    for (const account of DEMO_ACCOUNTS) {
      console.log(`    - ${account.email}`);
    }
    return;
  }

  const supabase = getSupabaseClient(env);

  for (const account of DEMO_ACCOUNTS) {
    const deleted = await deleteUser(supabase, account.email);
    if (deleted) {
      console.log(`  Deleted: ${account.email}`);
    } else {
      console.log(`  Not found: ${account.email}`);
    }
  }

  console.log('\nCleanup complete.');
}

async function seedAccount(
  env: Environment,
  account: DemoAccountConfig,
  dryRun: boolean
): Promise<void> {
  const summary = getLevelSummary(account.level);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Seeding: ${account.email}`);
  console.log(`Level: ${account.level} - ${account.description}`);
  console.log('='.repeat(60));

  if (dryRun) {
    console.log(`\n  Would create:`);
    console.log(`    - Auth user with email: ${account.email}`);
    console.log(`    - ${summary.activityTypesCount} activity types`);
    console.log(`    - ${summary.goalsCount} goals`);
    console.log(`    - ~${summary.daysOfData} days of activity data`);
    console.log(`    - ${summary.checkInsCount} check-ins`);
    console.log(`    - Various activity notes`);
    return;
  }

  const supabase = getSupabaseClient(env);

  // 1. Create or reset user
  console.log('\n1. Creating/resetting user...');
  const user = await createOrResetUser(supabase, account);
  console.log(`   User ID: ${user.id}`);

  // 2. Create activity types
  console.log('\n2. Creating activity types...');
  const activityTypes = await createActivityTypes(supabase, user.id, account.level);
  console.log(`   Created ${activityTypes.length} activity types`);

  // 3. Create goals (must be before activities for achievement triggers)
  console.log('\n3. Creating goals...');
  const goals = await createGoals(supabase, user.id, account.level, activityTypes);
  console.log(`   Created ${goals.length} goals`);

  // 4. Create activities (triggers will auto-create achievements)
  console.log('\n4. Creating activities...');
  const activityCount = await createActivities(supabase, user.id, account.level, activityTypes);
  console.log(`   Created ${activityCount} activity entries`);

  // 5. Create notes
  console.log('\n5. Creating notes...');
  const noteCount = await createNotes(supabase, user.id, account.level);
  console.log(`   Created ${noteCount} notes`);

  // 6. Create check-ins
  console.log('\n6. Creating check-ins...');
  const checkInCount = await createCheckIns(supabase, user.id, account.level);
  console.log(`   Created ${checkInCount} check-ins`);

  // 7. Count achievements (created by triggers)
  const { count: achievementCount } = await supabase
    .from('achievements')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  console.log(`\n   Achievements generated: ${achievementCount || 0}`);

  console.log(`\nDone: ${account.email}`);
}

async function seedAllAccounts(
  env: Environment,
  level: DemoLevel | undefined,
  dryRun: boolean
): Promise<void> {
  const accounts = level
    ? DEMO_ACCOUNTS.filter((a) => a.level === level)
    : DEMO_ACCOUNTS;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`DEMO ACCOUNT SEEDING`);
  console.log(`Environment: ${env}`);
  console.log(`Accounts: ${accounts.length}`);
  console.log(`Dry run: ${dryRun}`);
  console.log('='.repeat(60));

  for (const account of accounts) {
    await seedAccount(env, account, dryRun);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('SEEDING COMPLETE');
  console.log('='.repeat(60));

  if (!dryRun) {
    console.log(`\nDemo account credentials:`);
    for (const account of accounts) {
      console.log(`  - ${account.email} / ${DEMO_PASSWORD}`);
    }
  }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    return;
  }

  // Determine which environments to operate on
  const environments: Environment[] =
    args.env === 'all' ? ['dev', 'prod'] : [args.env];

  // Validate environments before proceeding
  for (const env of environments) {
    try {
      validateEnvironment(env);
    } catch (error) {
      console.error(`\nEnvironment validation failed for ${env}:`);
      console.error((error as Error).message);
      process.exit(1);
    }
  }

  // Execute requested operation
  for (const env of environments) {
    if (args.list) {
      await listAccounts(env);
    } else if (args.cleanup) {
      await cleanupAccounts(env, args.dryRun);
    } else {
      await seedAllAccounts(env, args.level, args.dryRun);
    }
  }
}

main().catch((error) => {
  console.error('\nError:', error.message);
  process.exit(1);
});
