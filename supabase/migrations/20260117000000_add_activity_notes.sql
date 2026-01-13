-- Create activity_notes table to store one note per user per date
CREATE TABLE IF NOT EXISTS public.activity_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  note text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT activity_notes_pkey PRIMARY KEY (id),
  CONSTRAINT activity_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT activity_notes_user_date_unique UNIQUE (user_id, date)
);

-- Enable RLS
ALTER TABLE public.activity_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own notes
CREATE POLICY "Users can manage their own activity notes"
  ON public.activity_notes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
