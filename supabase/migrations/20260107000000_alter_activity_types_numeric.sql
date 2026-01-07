-- Migration to change step, min_value, max_value from integer to numeric
-- This allows for decimal values like 0.5 for sleep hours

ALTER TABLE public.activity_types
  ALTER COLUMN step TYPE numeric USING step::numeric,
  ALTER COLUMN min_value TYPE numeric USING min_value::numeric,
  ALTER COLUMN max_value TYPE numeric USING max_value::numeric;

-- Update the default value for step
ALTER TABLE public.activity_types
  ALTER COLUMN step SET DEFAULT 1;

