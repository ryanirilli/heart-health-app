-- Migration to change activities.value from integer to numeric
-- This allows for decimal values like 7.5 for sleep hours (step: 0.5)

ALTER TABLE public.activities
  ALTER COLUMN value TYPE numeric USING value::numeric;
