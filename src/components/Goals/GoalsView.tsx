'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ActivityTypeMap } from '@/lib/activityTypes';
import { useGoals } from './GoalsProvider';
import { GoalCard } from './GoalCard';

interface GoalsViewProps {
  activityTypes: ActivityTypeMap;
}

export function GoalsView({ activityTypes }: GoalsViewProps) {
  const { goalsList, isLoading, openCreateDialog, openEditDialog } = useGoals();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading goals...</div>
      </div>
    );
  }

  const isEmpty = goalsList.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Goals</h2>
          {/* Hide tagline on mobile */}
          <p className="hidden sm:block text-sm text-muted-foreground">
            Track your progress toward your health goals
          </p>
        </div>
        {/* Hide button when empty (empty state has its own CTA) */}
        {!isEmpty && (
          <Button onClick={openCreateDialog} size="pill">
            <Plus className="h-4 w-4 mr-1" />
            New Goal
          </Button>
        )}
      </div>

      {/* Goals Grid */}
      {isEmpty ? (
        <EmptyState onCreateClick={openCreateDialog} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goalsList.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              activityType={activityTypes[goal.activityTypeId]}
              onClick={() => openEditDialog(goal)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <button
      onClick={onCreateClick}
      className={cn(
        "w-full py-12 rounded-xl",
        "border border-dashed border-muted-foreground/25",
        "bg-muted/30",
        "flex flex-col items-center justify-center gap-3",
        "text-muted-foreground",
        "hover:border-muted-foreground/40 hover:bg-muted/50",
        "transition-colors duration-200",
        "cursor-pointer"
      )}
    >
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <Plus className="h-6 w-6" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">No goals yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Tap to create your first goal
        </p>
      </div>
    </button>
  );
}
