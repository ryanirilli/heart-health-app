import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Goal, isValidGoalIcon, GOAL_DATE_TYPES } from '@/lib/goals';
import { DbGoal } from '@/lib/supabase/types';

// GET all goals for the authenticated user
export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch goals
    const { data: dbGoals, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch goals:', error);
      return NextResponse.json(
        { error: 'Failed to fetch goals' },
        { status: 500 }
      );
    }

    // Convert DB goals to app format
    const goals: { [id: string]: Goal } = {};
    (dbGoals as DbGoal[] | null)?.forEach((g) => {
      goals[g.id] = {
        id: g.id,
        activityTypeId: g.activity_type_id,
        name: g.name,
        targetValue: g.target_value,
        icon: isValidGoalIcon(g.icon) ? g.icon : 'target',
        dateType: g.date_type,
        targetDate: g.target_date ?? undefined,
        startDate: g.start_date ?? undefined,
        endDate: g.end_date ?? undefined,
      };
    });

    return NextResponse.json(goals);
  } catch (error) {
    console.error('Failed to fetch goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
      { status: 500 }
    );
  }
}

// Create a new goal
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const goal = await request.json() as Goal;

    // Validate required fields
    if (!goal.name?.trim()) {
      return NextResponse.json(
        { error: 'Goal name is required' },
        { status: 400 }
      );
    }

    if (!goal.activityTypeId) {
      return NextResponse.json(
        { error: 'Activity type is required' },
        { status: 400 }
      );
    }

    if (goal.targetValue === undefined || goal.targetValue === null || goal.targetValue < 0) {
      return NextResponse.json(
        { error: 'Target value cannot be negative' },
        { status: 400 }
      );
    }

    if (!isValidGoalIcon(goal.icon)) {
      return NextResponse.json(
        { error: 'Invalid icon' },
        { status: 400 }
      );
    }

    if (!GOAL_DATE_TYPES.includes(goal.dateType)) {
      return NextResponse.json(
        { error: 'Invalid date type' },
        { status: 400 }
      );
    }

    // Validate date fields based on date type
    if (goal.dateType === 'by_date' && !goal.targetDate) {
      return NextResponse.json(
        { error: 'Target date is required for "By Date" goals' },
        { status: 400 }
      );
    }

    if (goal.dateType === 'date_range') {
      if (!goal.startDate || !goal.endDate) {
        return NextResponse.json(
          { error: 'Start and end dates are required for "Date Range" goals' },
          { status: 400 }
        );
      }
      if (goal.endDate < goal.startDate) {
        return NextResponse.json(
          { error: 'End date must be after start date' },
          { status: 400 }
        );
      }
    }

    // Insert the new goal
    const { data: insertedGoal, error } = await supabase
      .from('goals')
      .insert({
        user_id: user.id,
        activity_type_id: goal.activityTypeId,
        name: goal.name.trim(),
        target_value: goal.targetValue,
        icon: goal.icon,
        date_type: goal.dateType,
        target_date: goal.dateType === 'by_date' ? goal.targetDate : null,
        start_date: goal.dateType === 'date_range' ? goal.startDate : null,
        end_date: goal.dateType === 'date_range' ? goal.endDate : null,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create goal:', error);
      return NextResponse.json(
        { error: 'Failed to create goal' },
        { status: 500 }
      );
    }

    // Return the created goal in app format
    const createdGoal: Goal = {
      id: insertedGoal.id,
      activityTypeId: insertedGoal.activity_type_id,
      name: insertedGoal.name,
      targetValue: insertedGoal.target_value,
      icon: isValidGoalIcon(insertedGoal.icon) ? insertedGoal.icon : 'target',
      dateType: insertedGoal.date_type,
      targetDate: insertedGoal.target_date ?? undefined,
      startDate: insertedGoal.start_date ?? undefined,
      endDate: insertedGoal.end_date ?? undefined,
    };

    return NextResponse.json({ success: true, goal: createdGoal });
  } catch (error) {
    console.error('Failed to create goal:', error);
    return NextResponse.json(
      { error: 'Failed to create goal' },
      { status: 500 }
    );
  }
}

// Update an existing goal
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const goal = await request.json() as Goal;

    if (!goal.id) {
      return NextResponse.json(
        { error: 'Goal ID is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!goal.name?.trim()) {
      return NextResponse.json(
        { error: 'Goal name is required' },
        { status: 400 }
      );
    }

    if (!goal.activityTypeId) {
      return NextResponse.json(
        { error: 'Activity type is required' },
        { status: 400 }
      );
    }

    if (goal.targetValue === undefined || goal.targetValue === null || goal.targetValue < 0) {
      return NextResponse.json(
        { error: 'Target value cannot be negative' },
        { status: 400 }
      );
    }

    if (!isValidGoalIcon(goal.icon)) {
      return NextResponse.json(
        { error: 'Invalid icon' },
        { status: 400 }
      );
    }

    if (!GOAL_DATE_TYPES.includes(goal.dateType)) {
      return NextResponse.json(
        { error: 'Invalid date type' },
        { status: 400 }
      );
    }

    // Validate date fields based on date type
    if (goal.dateType === 'by_date' && !goal.targetDate) {
      return NextResponse.json(
        { error: 'Target date is required for "By Date" goals' },
        { status: 400 }
      );
    }

    if (goal.dateType === 'date_range') {
      if (!goal.startDate || !goal.endDate) {
        return NextResponse.json(
          { error: 'Start and end dates are required for "Date Range" goals' },
          { status: 400 }
        );
      }
      if (goal.endDate < goal.startDate) {
        return NextResponse.json(
          { error: 'End date must be after start date' },
          { status: 400 }
        );
      }
    }

    // Update the goal (RLS ensures user can only update their own)
    const { data: updatedGoal, error } = await supabase
      .from('goals')
      .update({
        activity_type_id: goal.activityTypeId,
        name: goal.name.trim(),
        target_value: goal.targetValue,
        icon: goal.icon,
        date_type: goal.dateType,
        target_date: goal.dateType === 'by_date' ? goal.targetDate : null,
        start_date: goal.dateType === 'date_range' ? goal.startDate : null,
        end_date: goal.dateType === 'date_range' ? goal.endDate : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goal.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update goal:', error);
      return NextResponse.json(
        { error: 'Failed to update goal' },
        { status: 500 }
      );
    }

    // Return the updated goal in app format
    const returnGoal: Goal = {
      id: updatedGoal.id,
      activityTypeId: updatedGoal.activity_type_id,
      name: updatedGoal.name,
      targetValue: updatedGoal.target_value,
      icon: isValidGoalIcon(updatedGoal.icon) ? updatedGoal.icon : 'target',
      dateType: updatedGoal.date_type,
      targetDate: updatedGoal.target_date ?? undefined,
      startDate: updatedGoal.start_date ?? undefined,
      endDate: updatedGoal.end_date ?? undefined,
    };

    return NextResponse.json({ success: true, goal: returnGoal });
  } catch (error) {
    console.error('Failed to update goal:', error);
    return NextResponse.json(
      { error: 'Failed to update goal' },
      { status: 500 }
    );
  }
}

// Delete a goal
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Goal ID is required' },
        { status: 400 }
      );
    }

    // Delete the goal (RLS ensures user can only delete their own)
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to delete goal:', error);
      return NextResponse.json(
        { error: 'Failed to delete goal' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete goal:', error);
    return NextResponse.json(
      { error: 'Failed to delete goal' },
      { status: 500 }
    );
  }
}

