-- Fix discrete option goal evaluation
-- This migration fixes the goal evaluation logic for buttonGroup and toggle types:
-- 
-- For discrete options (buttonGroup/toggle):
-- - "day met" always means EXACT MATCH (value === target)
-- - Absolute tracking: goal met when ALL logged days match target
-- - Average tracking: goal met when MAJORITY (>50%) of logged days match target
--
-- This is different from continuous values (slider/increment) which use:
-- - positive: value >= target
-- - negative: value <= target
-- - neutral: value === target

-- Update evaluate_achievements function with correct discrete option logic
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
  v_total_value numeric;
  v_avg_value numeric;
  v_days_met integer;
  v_day_count integer;
  v_match_ratio numeric;
  v_goal_met boolean;
  v_goal_type text;
  v_ui_type text;
  v_is_discrete_type boolean;
BEGIN
  -- Get the goal_type and ui_type from activity_type for comparison logic
  SELECT goal_type, ui_type INTO v_goal_type, v_ui_type
  FROM public.activity_types
  WHERE id = p_activity_type_id AND user_id = p_user_id;
  
  -- Default to 'positive' if not set
  IF v_goal_type IS NULL THEN
    v_goal_type := 'positive';
  END IF;
  
  -- Check if this is a discrete option type
  v_is_discrete_type := v_ui_type IN ('buttonGroup', 'toggle');

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

    -- Calculate values for this period
    -- For discrete types: count days where value === target (exact match)
    -- For continuous types: count based on goal_type comparison
    IF v_is_discrete_type THEN
      -- Discrete types always use exact match
      SELECT 
        COALESCE(SUM(a.value), 0),
        COALESCE(AVG(a.value), 0),
        COUNT(CASE WHEN a.value = v_goal.target_value THEN 1 END),
        COUNT(*)
      INTO v_total_value, v_avg_value, v_days_met, v_day_count
      FROM public.activities a
      WHERE a.user_id = p_user_id
        AND a.activity_type_id = p_activity_type_id
        AND a.date >= v_period_start
        AND a.date <= v_period_end;
    ELSE
      -- Continuous types use goal_type comparison
      SELECT 
        COALESCE(SUM(a.value), 0),
        COALESCE(AVG(a.value), 0),
        COUNT(CASE 
          WHEN v_goal_type = 'negative' AND a.value <= v_goal.target_value THEN 1
          WHEN v_goal_type = 'neutral' AND a.value = v_goal.target_value THEN 1
          WHEN v_goal_type = 'positive' AND a.value >= v_goal.target_value THEN 1
        END),
        COUNT(*)
      INTO v_total_value, v_avg_value, v_days_met, v_day_count
      FROM public.activities a
      WHERE a.user_id = p_user_id
        AND a.activity_type_id = p_activity_type_id
        AND a.date >= v_period_start
        AND a.date <= v_period_end;
    END IF;

    -- Calculate match ratio for average tracking
    v_match_ratio := CASE WHEN v_day_count > 0 THEN v_days_met::numeric / v_day_count ELSE 0 END;

    -- Determine if goal is met based on type and tracking
    IF v_is_discrete_type THEN
      -- For discrete types (buttonGroup/toggle):
      -- - Absolute tracking: ALL days must match target
      -- - Average tracking: MAJORITY (>50%) of days must match target
      IF COALESCE(v_goal.tracking_type, 'average') = 'absolute' THEN
        -- Absolute: goal met only if ALL logged days matched the target
        v_goal_met := v_day_count > 0 AND v_days_met = v_day_count;
      ELSE
        -- Average: goal met when majority (>50%) of days match target
        v_goal_met := v_day_count > 0 AND v_match_ratio > 0.5;
      END IF;
    ELSIF v_ui_type = 'slider' THEN
      -- Slider always uses average value
      CASE v_goal_type
        WHEN 'negative' THEN
          v_goal_met := v_avg_value <= v_goal.target_value;
        WHEN 'neutral' THEN
          v_goal_met := v_avg_value = v_goal.target_value;
        ELSE -- 'positive'
          v_goal_met := v_avg_value >= v_goal.target_value;
      END CASE;
    ELSE
      -- Increment uses sum
      CASE v_goal_type
        WHEN 'negative' THEN
          v_goal_met := v_total_value <= v_goal.target_value;
        WHEN 'neutral' THEN
          v_goal_met := v_total_value = v_goal.target_value;
        ELSE -- 'positive'
          v_goal_met := v_total_value >= v_goal.target_value;
      END CASE;
    END IF;

    IF v_goal_met THEN
      -- Goal is met - upsert achievement
      -- For discrete types, store the days_met count as achieved_value
      -- For continuous types, store the effective value (avg or sum)
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
        CASE 
          WHEN v_is_discrete_type THEN v_days_met
          WHEN v_ui_type = 'slider' THEN v_avg_value::integer
          ELSE v_total_value::integer
        END,
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

-- Add comment for documentation
COMMENT ON FUNCTION evaluate_achievements IS 'Evaluates all goals for a user/activity_type/date and updates achievements. For discrete types (buttonGroup/toggle), uses exact match counting. For continuous types, uses goal_type comparison.';

