---
description: "Supabase database migrations and multi-environment workflow"
alwaysApply: true
---

# Supabase Database & Migrations

This project uses Supabase with a multi-environment setup (dev/prod) and SQL migrations for schema version control.

## Environment Setup

| Environment | Supabase Project Ref | Usage |
|-------------|---------------------|-------|
| **Production** | `nzynkojswrjbkmlpymgv` | Main branch deploys |
| **Development** | `ykomccrusdkfcafzjvbn` | Preview deploys, local dev |

## Project Structure

```
supabase/
├── config.toml              # CLI configuration
└── migrations/              # SQL migration files (version controlled)
    └── YYYYMMDDHHMMSS_name.sql
```

## Database Scripts

```bash
bun run db:migrate <name>    # Create new migration file
bun run db:push              # Push migrations to linked project
bun run db:status            # Check for pending schema changes
bun run db:types             # Generate TypeScript types from schema
```

## Making Schema Changes

1. **Create a migration:**
   ```bash
   bun run db:migrate add_user_preferences
   ```

2. **Edit the generated SQL file** in `supabase/migrations/`

3. **Test on dev first:**
   ```bash
   supabase link --project-ref ykomccrusdkfcafzjvbn
   supabase db push
   ```

4. **After testing, push to production:**
   ```bash
   supabase link --project-ref nzynkojswrjbkmlpymgv
   supabase db push
   ```

## Guidelines

1. **Never modify production directly** - Always use migrations
2. **Test migrations on dev first** before pushing to production
3. **Migrations are immutable** - Once pushed, create a new migration to make changes
4. **Include RLS policies** in migrations when creating new tables
5. **Use `IF NOT EXISTS`** for idempotent migrations when appropriate

## Row Level Security (RLS)

All tables should have RLS enabled with appropriate policies. Standard pattern:

```sql
-- Enable RLS
ALTER TABLE public.my_table ENABLE ROW LEVEL SECURITY;

-- User can only access their own data
CREATE POLICY "Users can manage their own data"
  ON public.my_table
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

## TypeScript Types

After schema changes, regenerate types:

```bash
bun run db:types
```

This updates `src/lib/supabase/database.types.ts` with the latest schema types.

## Switching Between Projects

```bash
# Link to dev
supabase link --project-ref ykomccrusdkfcafzjvbn

# Link to prod
supabase link --project-ref nzynkojswrjbkmlpymgv

# Check which project is linked
supabase projects list
```

