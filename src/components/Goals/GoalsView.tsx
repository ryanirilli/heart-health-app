import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { isGoalExpired } from '@/lib/goals';
import { useGoals } from './GoalsProvider';
import { GoalCard } from './GoalCard';
import { AchievementsTable } from './AchievementsTable';
import { useActivityTypes } from '@/components/ActivityCalendar/ActivityProvider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const MAX_GOALS = 5;

interface GoalsViewProps {
  onNavigateToActivities: () => void;
}

export function GoalsView({ onNavigateToActivities }: GoalsViewProps) {
  const { goalsList, isLoading, openCreateDialog, openEditDialog } = useGoals();
  const { activityTypes, openSettingsToAdd } = useActivityTypes();
  const [showNoActivitiesDialog, setShowNoActivitiesDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading goals...</div>
      </div>
    );
  }

  const activeGoals = goalsList.filter(goal => !isGoalExpired(goal));
  const pastGoals = goalsList.filter(goal => isGoalExpired(goal));

  const canAddMore = activeGoals.length < MAX_GOALS;

  const activeTypes = Object.values(activityTypes).filter(t => !t.deleted);
  const hasActivities = activeTypes.length > 0;

  const handleCreateClick = () => {
    if (!hasActivities) {
      setShowNoActivitiesDialog(true);
      return;
    }
    openCreateDialog();
  };

  const handleCreateActivityFromDialog = () => {
    setShowNoActivitiesDialog(false);
    openSettingsToAdd();
    onNavigateToActivities();
  };

  return (
    <div className="space-y-8">
      {/* Goals Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Goals</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              activityType={activityTypes[goal.activityTypeId]}
              onClick={() => openEditDialog(goal)}
            />
          ))}
          {canAddMore && <AddGoalCard onClick={handleCreateClick} />}
        </div>
      </div>

      {/* Past Goals Section */}
      {pastGoals.length > 0 && (
        <div className="space-y-4 pt-4 border-t">
          <h2 className="text-xl font-semibold tracking-tight text-muted-foreground">Past Goals</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 opacity-75">
            {pastGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                activityType={activityTypes[goal.activityTypeId]}
                onClick={() => openEditDialog(goal)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Achievements Section */}
      <AchievementsTable />

      {/* No Activities Dialog */}
      <Dialog open={showNoActivitiesDialog} onOpenChange={setShowNoActivitiesDialog}>
        <DialogContent hideCloseButton>
          <DialogHeader>
            <DialogTitle className="sr-only">Create an Activity First</DialogTitle>
            <div className="text-lg font-semibold leading-none tracking-tight text-left">
              Create an Activity First
            </div>
            <DialogDescription className="text-left">
              Goals track your progress on specific activities. You need to create an activity (like "Running" or "Meditation") before you can set a goal for it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-4">
            <Button size="pill" onClick={handleCreateActivityFromDialog}>
              Create Activity
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
        "min-h-[88px]", // Match approximate height of GoalCard
        "touch-action-manipulation"
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
