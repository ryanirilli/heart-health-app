-- Update evaluate_achievements function to handle tracking_type for buttonGroup activities
-- This adds support for 'average' and 'absolute' tracking types

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
  v_effective_value numeric;
  v_goal_met boolean;
  v_goal_type text;
  v_ui_type text;
BEGIN
  -- Get the goal_type and ui_type from activity_type for comparison logic
  SELECT goal_type, ui_type INTO v_goal_type, v_ui_type
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

    -- Calculate values for this period
    SELECT 
      COALESCE(SUM(a.value), 0),
      COALESCE(AVG(a.value), 0),
      COUNT(CASE WHEN a.value >= v_goal.target_value THEN 1 END),
      COUNT(*)
    INTO v_total_value, v_avg_value, v_days_met, v_day_count
    FROM public.activities a
    WHERE a.user_id = p_user_id
      AND a.activity_type_id = p_activity_type_id
      AND a.date >= v_period_start
      AND a.date <= v_period_end;

    -- Determine the effective value based on ui_type and tracking_type
    -- For buttonGroup and toggle with 'absolute' tracking, goal is met only if ALL days met target
    -- For buttonGroup and toggle with 'average' tracking, use average
    -- For slider, always use average
    -- For increment, use sum
    IF v_ui_type IN ('buttonGroup', 'toggle') THEN
      IF COALESCE(v_goal.tracking_type, 'average') = 'absolute' THEN
        -- Absolute tracking: goal is met only if ALL logged days met the target
        -- We check this by comparing days_met to day_count
        IF v_day_count > 0 AND v_days_met = v_day_count THEN
          -- All days met the target - set effective value to target so comparison passes
          v_effective_value := v_goal.target_value;
        ELSE
          -- Not all days met - set effective value to fail the comparison
          -- For positive goals, set below target; for negative, set above target
          IF v_goal_type = 'negative' THEN
            v_effective_value := v_goal.target_value + 1;
          ELSE
            v_effective_value := v_goal.target_value - 1;
          END IF;
        END IF;
      ELSE
        -- Average tracking: use the average value
        v_effective_value := v_avg_value;
      END IF;
    ELSIF v_ui_type = 'slider' THEN
      -- Slider always uses average
      v_effective_value := v_avg_value;
    ELSE
      -- Increment uses sum
      v_effective_value := v_total_value;
    END IF;

    -- Determine if goal is met based on goal_type
    CASE v_goal_type
      WHEN 'negative' THEN
        -- Less is better: goal met when value <= target
        v_goal_met := v_effective_value <= v_goal.target_value;
      WHEN 'neutral' THEN
        -- Exact match required
        v_goal_met := v_effective_value = v_goal.target_value;
      ELSE -- 'positive' or default
        -- More is better: goal met when value >= target
        v_goal_met := v_effective_value >= v_goal.target_value;
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
        v_effective_value::integer,
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

