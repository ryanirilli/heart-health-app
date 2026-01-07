-- Add unique constraint for upsert operations
-- This constraint ensures a user can only have one activity entry per type per day
-- and enables the ON CONFLICT clause in upsert operations

CREATE UNIQUE INDEX IF NOT EXISTS activities_user_type_date_unique 
  ON public.activities (user_id, activity_type_id, date);

