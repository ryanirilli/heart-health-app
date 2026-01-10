-- Achievements System Migration
-- Automatically tracks goal achievements via PostgreSQL triggers
-- Achievements are added/removed in real-time as activities change

-- =============================================================================
-- ACHIEVEMENTS TABLE
-- =============================================================================

-- Stores achieved goals with their evaluation period
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  goal_id uuid NOT NULL,
  -- The period this achievement covers (for recurring goals)
  period_start date NOT NULL,
  period_end date NOT NULL,
  -- The actual value achieved
  achieved_value integer NOT NULL,
  -- The target that was met
  target_value integer NOT NULL,
  -- Timestamp when the achievement was first recorded
  achieved_at timestamp with time zone DEFAULT now(),
  -- Timestamp when the achievement was last updated (value changed but still met)
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT achievements_pkey PRIMARY KEY (id),
  CONSTRAINT achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT achievements_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE,
  -- Ensure one achievement per goal per period
  CONSTRAINT achievements_unique_goal_period UNIQUE (goal_id, period_start, period_end)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS achievements_user_id_idx ON public.achievements(user_id);
CREATE INDEX IF NOT EXISTS achievements_goal_id_idx ON public.achievements(goal_id);
CREATE INDEX IF NOT EXISTS achievements_period_idx ON public.achievements(period_start, period_end);
CREATE INDEX IF NOT EXISTS achievements_achieved_at_idx ON public.achievements(achieved_at);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Users can only view their own achievements
CREATE POLICY "Users can view their own achievements"
  ON public.achievements
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only the system (triggers) can insert/update/delete achievements
-- Users cannot manually modify achievements
CREATE POLICY "System can manage achievements"
  ON public.achievements
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get the start of the week (Monday) for a given date
CREATE OR REPLACE FUNCTION get_week_start(d date)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  -- ISO week starts on Monday
  SELECT d - EXTRACT(ISODOW FROM d)::integer + 1;
$$;

-- Get the end of the week (Sunday) for a given date
CREATE OR REPLACE FUNCTION get_week_end(d date)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT d - EXTRACT(ISODOW FROM d)::integer + 7;
$$;

-- Get the start of the month for a given date
CREATE OR REPLACE FUNCTION get_month_start(d date)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT date_trunc('month', d)::date;
$$;

-- Get the end of the month for a given date
CREATE OR REPLACE FUNCTION get_month_end(d date)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (date_trunc('month', d) + interval '1 month' - interval '1 day')::date;
$$;

-- =============================================================================
-- MAIN ACHIEVEMENT EVALUATION FUNCTION
-- =============================================================================

-- Evaluates all goals for a user/activity_type/date and updates achievements accordingly
CREATE OR REPLACE FUNCTION evaluate_achievements(
  p_user_id uuid,
  p_activity_type_id text,
  p_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_goal RECORD;
  v_period_start date;
  v_period_end date;
  v_total_value integer;
  v_goal_met boolean;
  v_goal_type text;
BEGIN
  -- Get the goal_type from activity_type for comparison logic
  SELECT goal_type INTO v_goal_type
  FROM public.activity_types
  WHERE id = p_activity_type_id AND user_id = p_user_id;
  
  -- Default to 'positive' if not set
  IF v_goal_type IS NULL THEN
    v_goal_type := 'positive';
  END IF;

  -- Loop through all goals for this user and activity type
  FOR v_goal IN
    SELECT g.*
    FROM public.goals g
    WHERE g.user_id = p_user_id
      AND g.activity_type_id = p_activity_type_id
  LOOP
    -- Determine the evaluation period based on goal date_type
    CASE v_goal.date_type
      WHEN 'daily' THEN
        v_period_start := p_date;
        v_period_end := p_date;
        
      WHEN 'weekly' THEN
        v_period_start := get_week_start(p_date);
        v_period_end := get_week_end(p_date);
        
      WHEN 'monthly' THEN
        v_period_start := get_month_start(p_date);
        v_period_end := get_month_end(p_date);
        
      WHEN 'by_date' THEN
        -- For by_date goals, check if the activity date is before or on target date
        IF p_date > v_goal.target_date THEN
          -- Activity is after target date, skip this goal
          CONTINUE;
        END IF;
        -- Period is from goal creation to target date
        v_period_start := v_goal.created_at::date;
        v_period_end := v_goal.target_date;
        
      WHEN 'date_range' THEN
        -- For date_range goals, check if activity date is within range
        IF p_date < v_goal.start_date OR p_date > v_goal.end_date THEN
          -- Activity is outside the range, skip this goal
          CONTINUE;
        END IF;
        v_period_start := v_goal.start_date;
        v_period_end := v_goal.end_date;
        
      ELSE
        -- Unknown date_type, skip
        CONTINUE;
    END CASE;

    -- Calculate total value for this period
    SELECT COALESCE(SUM(a.value), 0) INTO v_total_value
    FROM public.activities a
    WHERE a.user_id = p_user_id
      AND a.activity_type_id = p_activity_type_id
      AND a.date >= v_period_start
      AND a.date <= v_period_end;

    -- Determine if goal is met based on goal_type
    CASE v_goal_type
      WHEN 'negative' THEN
        -- Less is better: goal met when value <= target
        v_goal_met := v_total_value <= v_goal.target_value;
      WHEN 'neutral' THEN
        -- Exact match required
        v_goal_met := v_total_value = v_goal.target_value;
      ELSE -- 'positive' or default
        -- More is better: goal met when value >= target
        v_goal_met := v_total_value >= v_goal.target_value;
    END CASE;

    IF v_goal_met THEN
      -- Goal is met - upsert achievement
      INSERT INTO public.achievements (
        user_id,
        goal_id,
        period_start,
        period_end,
        achieved_value,
        target_value,
        achieved_at,
        updated_at
      )
      VALUES (
        p_user_id,
        v_goal.id,
        v_period_start,
        v_period_end,
        v_total_value,
        v_goal.target_value,
        now(),
        now()
      )
      ON CONFLICT (goal_id, period_start, period_end)
      DO UPDATE SET
        achieved_value = EXCLUDED.achieved_value,
        updated_at = now();
    ELSE
      -- Goal is not met - remove achievement if it exists
      DELETE FROM public.achievements
      WHERE goal_id = v_goal.id
        AND period_start = v_period_start
        AND period_end = v_period_end;
    END IF;
  END LOOP;
END;
$$;

-- =============================================================================
-- TRIGGER FUNCTION
-- =============================================================================

-- Trigger function that fires on activity changes
CREATE OR REPLACE FUNCTION trigger_evaluate_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_activity_type_id text;
  v_date date;
  v_old_date date;
BEGIN
  -- Determine the affected user, activity type, and date(s)
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
    v_activity_type_id := OLD.activity_type_id;
    v_date := OLD.date;
  ELSIF TG_OP = 'UPDATE' THEN
    v_user_id := NEW.user_id;
    v_activity_type_id := NEW.activity_type_id;
    v_date := NEW.date;
    v_old_date := OLD.date;
  ELSE -- INSERT
    v_user_id := NEW.user_id;
    v_activity_type_id := NEW.activity_type_id;
    v_date := NEW.date;
  END IF;

  -- Evaluate achievements for the current date
  PERFORM evaluate_achievements(v_user_id, v_activity_type_id, v_date);

  -- If the date changed on update, also re-evaluate the old date
  IF TG_OP = 'UPDATE' AND v_old_date IS DISTINCT FROM v_date THEN
    PERFORM evaluate_achievements(v_user_id, v_activity_type_id, v_old_date);
  END IF;

  -- If activity type changed on update, also re-evaluate old activity type
  IF TG_OP = 'UPDATE' AND OLD.activity_type_id IS DISTINCT FROM NEW.activity_type_id THEN
    PERFORM evaluate_achievements(v_user_id, OLD.activity_type_id, OLD.date);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =============================================================================
-- TRIGGERS ON ACTIVITIES TABLE
-- =============================================================================

-- Drop existing triggers if they exist (for idempotency)
DROP TRIGGER IF EXISTS achievements_on_activity_insert ON public.activities;
DROP TRIGGER IF EXISTS achievements_on_activity_update ON public.activities;
DROP TRIGGER IF EXISTS achievements_on_activity_delete ON public.activities;

-- Create triggers
CREATE TRIGGER achievements_on_activity_insert
  AFTER INSERT ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION trigger_evaluate_achievements();

CREATE TRIGGER achievements_on_activity_update
  AFTER UPDATE ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION trigger_evaluate_achievements();

CREATE TRIGGER achievements_on_activity_delete
  AFTER DELETE ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION trigger_evaluate_achievements();

-- =============================================================================
-- TRIGGER FOR GOAL CHANGES
-- =============================================================================

-- When a goal is updated (target changed), re-evaluate all relevant achievements
CREATE OR REPLACE FUNCTION trigger_reevaluate_goal_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_activity RECORD;
BEGIN
  -- If target_value changed, we need to re-evaluate all achievements for this goal
  IF TG_OP = 'UPDATE' AND (
    OLD.target_value IS DISTINCT FROM NEW.target_value OR
    OLD.date_type IS DISTINCT FROM NEW.date_type OR
    OLD.target_date IS DISTINCT FROM NEW.target_date OR
    OLD.start_date IS DISTINCT FROM NEW.start_date OR
    OLD.end_date IS DISTINCT FROM NEW.end_date
  ) THEN
    -- Delete all existing achievements for this goal (they'll be re-created if still valid)
    DELETE FROM public.achievements WHERE goal_id = NEW.id;
    
    -- Re-evaluate for each unique date that has activities for this activity type
    FOR v_activity IN
      SELECT DISTINCT a.date
      FROM public.activities a
      WHERE a.user_id = NEW.user_id
        AND a.activity_type_id = NEW.activity_type_id
    LOOP
      PERFORM evaluate_achievements(NEW.user_id, NEW.activity_type_id, v_activity.date);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS achievements_on_goal_update ON public.goals;

CREATE TRIGGER achievements_on_goal_update
  AFTER UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION trigger_reevaluate_goal_achievements();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE public.achievements IS 'Automatically tracked goal achievements. Managed by triggers - do not modify directly.';
COMMENT ON COLUMN public.achievements.period_start IS 'Start date of the evaluation period (inclusive)';
COMMENT ON COLUMN public.achievements.period_end IS 'End date of the evaluation period (inclusive)';
COMMENT ON COLUMN public.achievements.achieved_value IS 'The actual value achieved during the period';
COMMENT ON COLUMN public.achievements.target_value IS 'The target value that was met (snapshot from goal at time of achievement)';
COMMENT ON COLUMN public.achievements.achieved_at IS 'When the achievement was first recorded';
COMMENT ON COLUMN public.achievements.updated_at IS 'When the achievement was last updated (value changed but still met)';

COMMENT ON FUNCTION evaluate_achievements IS 'Evaluates all goals for a user/activity_type/date and updates achievements accordingly';
COMMENT ON FUNCTION trigger_evaluate_achievements IS 'Trigger function that fires on activity changes to update achievements';
COMMENT ON FUNCTION trigger_reevaluate_goal_achievements IS 'Trigger function that re-evaluates achievements when goal parameters change';

