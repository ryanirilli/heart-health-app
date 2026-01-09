'use client';

import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActivityTypeMap } from '@/lib/activityTypes';
import { useGoals } from './GoalsProvider';
import { GoalCard } from './GoalCard';

interface GoalsViewProps {
  activityTypes: ActivityTypeMap;
}

const MAX_GOALS = 5;

export function GoalsView({ activityTypes }: GoalsViewProps) {
  const { goalsList, isLoading, openCreateDialog, openEditDialog } = useGoals();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading goals...</div>
      </div>
    );
  }

  const canAddMore = goalsList.length < MAX_GOALS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <h2 className="text-2xl font-semibold tracking-tight">Goals</h2>

      {/* Goals Grid - always show grid with add card */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {goalsList.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            activityType={activityTypes[goal.activityTypeId]}
            onClick={() => openEditDialog(goal)}
          />
        ))}
        {/* Add Goal Card - only shown if under limit */}
        {canAddMore && <AddGoalCard onClick={openCreateDialog} />}
      </div>
    </div>
  );
}

function AddGoalCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl p-4",
        "border border-dashed border-muted-foreground/25",
        "bg-muted/30",
        "flex items-center gap-3",
        "text-muted-foreground",
        "hover:border-muted-foreground/40 hover:bg-muted/50",
        "transition-colors duration-200",
        "cursor-pointer",
        "min-h-[88px]" // Match approximate height of GoalCard
      )}
    >
      {/* Icon - matches GoalCard icon styling */}
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
        <Plus className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="text-left">
        <p className="text-sm font-medium text-foreground">Add Goal</p>
        <p className="text-xs text-muted-foreground">
          Create a new goal
        </p>
      </div>
    </button>
  );
}
