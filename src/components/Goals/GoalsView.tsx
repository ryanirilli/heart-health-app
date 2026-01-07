'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActivityTypeMap } from '@/lib/activityTypes';
import { useGoals } from './GoalsProvider';
import { GoalCard } from './GoalCard';
import { GoalFormDialog } from './GoalFormDialog';

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Goals</h2>
          <p className="text-sm text-muted-foreground">
            Track your progress toward your health goals
          </p>
        </div>
        <Button onClick={openCreateDialog} size="pill">
          <Plus className="h-4 w-4 mr-1" />
          New Goal
        </Button>
      </div>

      {/* Goals Grid */}
      {goalsList.length === 0 ? (
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

      {/* Form Dialog */}
      <GoalFormDialog activityTypes={activityTypes} />
    </div>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Plus className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">No goals yet</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        Create your first goal to start tracking your progress toward better health.
      </p>
      <Button onClick={onCreateClick} size="pill">
        <Plus className="h-4 w-4 mr-1" />
        Create Your First Goal
      </Button>
    </div>
  );
}

