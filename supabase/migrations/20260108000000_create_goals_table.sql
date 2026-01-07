-- Goals table migration
-- Stores user goals scoped to activity types

-- =============================================================================
-- TABLES
-- =============================================================================

-- Goals table
CREATE TABLE IF NOT EXISTS public.goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_type_id text NOT NULL,
  name text NOT NULL,
  target_value integer NOT NULL,
  icon text NOT NULL DEFAULT 'target',
  date_type text NOT NULL DEFAULT 'daily' CHECK (date_type = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text, 'by_date'::text, 'date_range'::text])),
  target_date date,
  start_date date,
  end_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT goals_pkey PRIMARY KEY (id),
  CONSTRAINT goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT goals_activity_type_id_fkey FOREIGN KEY (activity_type_id) REFERENCES public.activity_types(id),
  -- Validate date fields based on date_type
  CONSTRAINT goals_date_validation CHECK (
    (date_type = 'by_date' AND target_date IS NOT NULL) OR
    (date_type = 'date_range' AND start_date IS NOT NULL AND end_date IS NOT NULL AND end_date >= start_date) OR
    (date_type IN ('daily', 'weekly', 'monthly'))
  )
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS goals_user_id_idx ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS goals_activity_type_id_idx ON public.goals(activity_type_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on goals table
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own goals
CREATE POLICY "Users can manage their own goals"
  ON public.goals
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

