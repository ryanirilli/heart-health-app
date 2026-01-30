-- Create check_ins table for AI-powered weekly health journey analysis
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Analysis period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- AI-generated content (JSONB for flexibility)
  analysis JSONB NOT NULL,

  -- Metadata about what was analyzed
  data_summary JSONB NOT NULL,

  -- Generation status for streaming support
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  error_message TEXT
);

-- Index for user queries and rate limiting
CREATE INDEX idx_check_ins_user_created ON check_ins(user_id, created_at DESC);

-- RLS Policies
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own check-ins"
  ON check_ins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own check-ins"
  ON check_ins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own check-ins"
  ON check_ins FOR UPDATE
  USING (auth.uid() = user_id);
