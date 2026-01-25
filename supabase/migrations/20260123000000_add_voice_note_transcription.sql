-- Add transcription fields to voice_notes table
ALTER TABLE public.voice_notes
  ADD COLUMN IF NOT EXISTS transcription text,
  ADD COLUMN IF NOT EXISTS transcription_status text CHECK (transcription_status IN ('pending', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS extracted_activities jsonb;

-- Create index for faster queries on transcription status
CREATE INDEX IF NOT EXISTS idx_voice_notes_transcription_status ON public.voice_notes(transcription_status);
