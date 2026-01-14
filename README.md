# Heart Health App

A personal activity tracking calendar for monitoring heart health activities.

## Tech Stack

- Next.js 16 with React 19
- Supabase for authentication and database
- Tailwind CSS for styling
- shadcn/ui components

## Prerequisites

- [Bun](https://bun.sh/) - JavaScript runtime and package manager
- [Supabase CLI](https://supabase.com/docs/guides/cli) - For local development and migrations

### Installing Bun

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Or via Homebrew (macOS)
brew install oven-sh/bun/bun
```

### Installing Supabase CLI

```bash
# macOS via Homebrew
brew install supabase/tap/supabase

# Or via npm/bun
bun add -g supabase
```

## Getting Started

### 1. Install Dependencies

```bash
bun install
```

### 2. Set Up Environment Variables

Copy `env.example` to `.env.local` and update the variable values with your Supabase credentials:

```bash
cp env.example .env.local
```

### 3. Set Up Supabase Locally (Optional)

For local development with a local Supabase instance:

```bash
# Start local Supabase services (requires Docker)
supabase start

# This will output local credentials - update .env.local with these values
```

To use a remote Supabase project instead:

```bash
# Link to your Supabase project
supabase link

# Push all migrations to the database
supabase db push
```

### 4. Run the Development Server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

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
