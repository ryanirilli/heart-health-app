-- Initial schema migration for heart-health-app
-- This captures the existing production schema as of January 2026

-- =============================================================================
-- TABLES
-- =============================================================================

-- Activity Types table
-- Stores user-defined activity types with customizable UI configurations
CREATE TABLE IF NOT EXISTS public.activity_types (
  id text NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  unit text,
  pluralize boolean DEFAULT true,
  is_negative boolean,
  goal_type text CHECK (goal_type = ANY (ARRAY['positive'::text, 'negative'::text, 'neutral'::text])),
  ui_type text NOT NULL DEFAULT 'increment'::text CHECK (ui_type = ANY (ARRAY['increment'::text, 'slider'::text, 'buttonGroup'::text])),
  min_value integer,
  max_value integer,
  step integer DEFAULT 1,
  button_options jsonb,
  deleted boolean DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT activity_types_pkey PRIMARY KEY (id),
  CONSTRAINT activity_types_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Activities table
-- Stores individual activity entries for users
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_type_id text NOT NULL,
  date date NOT NULL,
  value integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT activities_pkey PRIMARY KEY (id),
  CONSTRAINT activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT activities_activity_type_id_fkey FOREIGN KEY (activity_type_id) REFERENCES public.activity_types(id)
);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on both tables
ALTER TABLE public.activity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own activity types
CREATE POLICY "Users can manage their own activity types"
  ON public.activity_types
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only access their own activities
CREATE POLICY "Users can manage their own activities"
  ON public.activities
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

