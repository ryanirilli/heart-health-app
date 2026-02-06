# Demo Account Seeding Script

Creates demo accounts with realistic data at various progression levels for demonstrating the app's features.

## Quick Start

```bash
# Seed all demo accounts to dev
bun run seed:demo

# Seed to production
bun run seed:demo:prod

# Seed to both dev and production
bun run seed:demo:all

# Delete all demo accounts
bun run seed:demo:cleanup
```

## Demo Accounts

| Level | Email | Password | Description |
|-------|-------|----------|-------------|
| New User | `demo-new@rhythm.com` | `demo123` | Just signed up, empty account |
| Just Started | `demo-started@rhythm.com` | `demo123` | First week, exploring features |
| 1 Month | `demo-1month@rhythm.com` | `demo123` | Building habits, first achievements |
| 6 Months | `demo-6months@rhythm.com` | `demo123` | Established patterns, good progress |
| 1 Year | `demo-1year@rhythm.com` | `demo123` | Power user, full feature utilization |

## CLI Options

```bash
bun scripts/seed-demo-accounts/index.ts [OPTIONS]

Options:
  --env=<env>      Environment to seed (dev, prod, all). Default: dev
  --level=<level>  Seed only a specific level
  --cleanup        Delete all demo accounts
  --list           List existing demo accounts
  --dry-run        Preview what would be created
  --help           Show help message

Levels:
  new-user, just-started, one-month, six-months, one-year
```

## What Gets Created

### Data by Level

| Level | Activity Types | Goals | Days of Data | Check-ins | Achievements |
|-------|---------------|-------|--------------|-----------|--------------|
| New User | 0 | 0 | 0 | 0 | 0 |
| Just Started | 3 | 1 | ~7 | 0 | ~3 |
| 1 Month | 5 | 3 | ~30 | 2 | ~36 |
| 6 Months | 6 | 5 | ~180 | 5 | ~200 |
| 1 Year | 7 | 8 | ~365 | 10 | ~432 |

### Activity Types (7 total, covering all UI types)

| Activity | UI Type | Goal Type |
|----------|---------|-----------|
| Water Intake | increment | positive |
| Sleep Quality | slider | positive |
| Mood | buttonGroup | neutral |
| Took Medication | toggle | positive |
| Morning Walk | fixedValue | positive |
| Alcoholic Drinks | increment | negative |
| Exercise Minutes | slider | positive |

### Goals Include

- Daily recurring goals (hydration, medication)
- Weekly goals (exercise, morning walks)
- Monthly goals (mood average, alcohol limit)
- Completed past goals (sleep challenge - achieved)
- Missed past goals (water challenge - missed)

## Realistic Data Patterns

Activity data is generated with realistic patterns:

- **Weekly cycles** - Higher values on weekends
- **Gradual improvement** - Trending upward over time
- **Natural variance** - Day-to-day variation (±20-30%)
- **Gaps** - Occasional missed days (illness, travel)
- **Streaks** - Periods of high consistency

## Environment Variables

Required in `.env.local`:

```bash
# Dev environment (default)
NEXT_PUBLIC_SUPABASE_URL=<dev-supabase-url>
DEV_SERVICE_ROLE_KEY=<service-role-key>

# Production environment (for --env=prod)
PROD_SUPABASE_URL=<prod-supabase-url>
PROD_SERVICE_ROLE_KEY=<prod-service-role-key>
```

## Idempotent Behavior

Running the script again will:
1. Delete all existing data for demo accounts
2. Recreate fresh data from scratch

This ensures demo accounts always have predictable, consistent data.

## File Structure

```
scripts/seed-demo-accounts/
├── index.ts                 # Main CLI script
├── config.ts                # Account definitions
├── supabase.ts              # Supabase client setup
├── data/
│   ├── activity-type-templates.ts   # Activity type definitions
│   └── check-in-templates.ts        # Pre-written check-in content
├── generators/
│   ├── users.ts             # User creation/reset
│   ├── activity-types.ts    # Activity type creation
│   ├── goals.ts             # Goal creation
│   ├── activities.ts        # Activity data with patterns
│   ├── notes.ts             # Activity notes
│   └── check-ins.ts         # Check-in creation
├── levels/
│   └── index.ts             # Level configuration summaries
└── utils/
    ├── dates.ts             # Date utilities
    └── patterns.ts          # Realistic data patterns
```
