-- Add 'toggle' to the allowed UI types for activity_types
-- This enables binary Yes/No tracking for activities

-- Drop the existing check constraint
ALTER TABLE activity_types DROP CONSTRAINT IF EXISTS activity_types_ui_type_check;

-- Add the new check constraint that includes 'toggle'
ALTER TABLE activity_types ADD CONSTRAINT activity_types_ui_type_check 
  CHECK (ui_type = ANY (ARRAY['increment'::text, 'slider'::text, 'buttonGroup'::text, 'toggle'::text]));

