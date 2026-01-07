# Heart Health App

A personal activity tracking calendar for monitoring heart health activities.

## Tech Stack

- Next.js 16 with React 19
- Supabase for authentication and database
- Tailwind CSS for styling
- shadcn/ui components

## Getting Started

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Environment Variables

Copy `env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp env.example .env.local
```

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key

## Database & Migrations

This project uses Supabase with SQL migrations for schema version control.

### Multi-Environment Setup

| Environment | Branch              | Database             |
| ----------- | ------------------- | -------------------- |
| Production  | `main`              | Production Supabase  |
| Preview/Dev | PRs, other branches | Development Supabase |

### Database Scripts

```bash
bun run db:migrate <name>    # Create new migration file
bun run db:push              # Push migrations to linked project
bun run db:status            # Check for pending schema changes
bun run db:types             # Generate TypeScript types from schema
```

### Making Schema Changes

1. Create a migration: `bun run db:migrate add_feature`
2. Edit the SQL file in `supabase/migrations/`
3. Test on dev: `supabase link --project-ref <dev-ref> && supabase db push`
4. Push to prod: `supabase link --project-ref <prod-ref> && supabase db push`

See `.cursor/rules/supabase/RULE.md` for detailed migration workflow.
