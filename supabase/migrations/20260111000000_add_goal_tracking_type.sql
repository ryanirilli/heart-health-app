-- Add tracking_type column to goals table
-- This determines how discrete value goals (buttonGroup/options) are evaluated:
-- - 'average': Target is compared against the average value over the period
-- - 'absolute': Target is compared against the sum/total over the period

ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS tracking_type text DEFAULT 'average' 
CHECK (tracking_type = ANY (ARRAY['average'::text, 'absolute'::text]));

-- Add comment for documentation
COMMENT ON COLUMN public.goals.tracking_type IS 'How discrete value goals are evaluated: average (mean over period) or absolute (sum/total over period)';

