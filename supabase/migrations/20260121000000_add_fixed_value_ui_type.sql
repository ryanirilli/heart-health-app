-- Add 'fixedValue' to the allowed UI types for activity_types
-- This enables fixed value tracking for activities (e.g., "10 pushups" always logs 10)

-- Drop the existing check constraint
ALTER TABLE activity_types DROP CONSTRAINT IF EXISTS activity_types_ui_type_check;

-- Add the new check constraint that includes 'fixedValue'
ALTER TABLE activity_types ADD CONSTRAINT activity_types_ui_type_check 
  CHECK (ui_type = ANY (ARRAY['increment'::text, 'slider'::text, 'buttonGroup'::text, 'toggle'::text, 'fixedValue'::text]));

-- Add the fixed_value column if it doesn't exist
ALTER TABLE activity_types ADD COLUMN IF NOT EXISTS fixed_value INTEGER DEFAULT 1;
