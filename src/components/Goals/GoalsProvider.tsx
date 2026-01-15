'use client';

import { createContext, useContext, ReactNode, useState, useCallback, useMemo } from 'react';
import { Goal, GoalMap, createDefaultGoal } from '@/lib/goals';
import {
  useGoalsQuery,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
} from '@/lib/hooks/useGoalsQuery';

interface GoalsContextValue {
  // Goals data
  goals: GoalMap;
  goalsList: Goal[];
  isLoading: boolean;

  // Mutations
  createGoal: (goal: Omit<Goal, 'id'>) => void;
  updateGoal: (goal: Goal) => void;
  deleteGoal: (goalId: string) => void;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;

  // Dialog state
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  editingGoal: Goal | null;
  preFilledGoal: Partial<Goal> | null; // For pre-filling from activity creation
  openCreateDialog: () => void;
  openCreateDialogWithActivity: (activityTypeId: string, activityName: string) => void;
  openEditDialog: (goal: Goal) => void;
  closeDialog: () => void;
  
  // Transition state
  isTransitioning: boolean;
  setTransitioning: (transitioning: boolean) => void;
}

const GoalsContext = createContext<GoalsContextValue>({
  goals: {},
  goalsList: [],
  isLoading: false,
  createGoal: () => {},
  updateGoal: () => {},
  deleteGoal: () => {},
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  dialogOpen: false,
  setDialogOpen: () => {},
  editingGoal: null,
  preFilledGoal: null,
  openCreateDialog: () => {},
  openCreateDialogWithActivity: () => {},
  openEditDialog: () => {},
  closeDialog: () => {},
  isTransitioning: false,
  setTransitioning: () => {},
});

interface GoalsProviderProps {
  children: ReactNode;
  initialGoals?: GoalMap;
}

export function GoalsProvider({ children, initialGoals = {} }: GoalsProviderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [preFilledGoal, setPreFilledGoal] = useState<Partial<Goal> | null>(null);
  const [isTransitioning, setTransitioning] = useState(false);

  // React Query hooks
  const { data: goals = {}, isLoading } = useGoalsQuery(initialGoals);
  const createGoalMutation = useCreateGoal();
  const updateGoalMutation = useUpdateGoal();
  const deleteGoalMutation = useDeleteGoal();

  // Convert goals map to sorted list
  const goalsList = useMemo(() => {
    return Object.values(goals).sort((a, b) => {
      // Sort by name alphabetically
      return a.name.localeCompare(b.name);
    });
  }, [goals]);

  // Dialog handlers
  const openCreateDialog = useCallback(() => {
    setEditingGoal(null);
    setPreFilledGoal(null);
    setDialogOpen(true);
  }, []);

  const openCreateDialogWithActivity = useCallback((activityTypeId: string, activityName: string) => {
    setEditingGoal(null);
    setPreFilledGoal({
      activityTypeId,
      name: `${activityName} Goal`,
    });
    // Ensure transition overlay is cleared when dialog opens
    setTransitioning(false);
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((goal: Goal) => {
    setEditingGoal(goal);
    setPreFilledGoal(null);
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingGoal(null);
    setPreFilledGoal(null);
  }, []);

  // CRUD operations
  const createGoal = useCallback((goal: Omit<Goal, 'id'>) => {
    createGoalMutation.mutate(goal, {
      onSuccess: () => {
        closeDialog();
      },
    });
  }, [createGoalMutation, closeDialog]);

  const updateGoal = useCallback((goal: Goal) => {
    updateGoalMutation.mutate(goal, {
      onSuccess: () => {
        closeDialog();
      },
    });
  }, [updateGoalMutation, closeDialog]);

  const deleteGoal = useCallback((goalId: string) => {
    deleteGoalMutation.mutate(goalId, {
      onSuccess: () => {
        closeDialog();
      },
    });
  }, [deleteGoalMutation, closeDialog]);

  const contextValue = useMemo(() => ({
    goals,
    goalsList,
    isLoading,
    createGoal,
    updateGoal,
    deleteGoal,
    isCreating: createGoalMutation.isPending,
    isUpdating: updateGoalMutation.isPending,
    isDeleting: deleteGoalMutation.isPending,
    dialogOpen,
    setDialogOpen,
    editingGoal,
    preFilledGoal,
    openCreateDialog,
    openCreateDialogWithActivity,
    openEditDialog,
    closeDialog,
    isTransitioning,
    setTransitioning,
  }), [
    goals,
    goalsList,
    isLoading,
    createGoalMutation,
    updateGoalMutation,
    deleteGoalMutation,
    dialogOpen,
    editingGoal,
    preFilledGoal,
    isTransitioning,
    openCreateDialog,
    openCreateDialogWithActivity,
    openEditDialog,
    closeDialog,
    setTransitioning,
  ]);

  return (
    <GoalsContext.Provider value={contextValue}>
      {children}
      {/* Global loading overlay for transitions */}
      {isTransitioning && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
          <div className="flex flex-col items-center gap-3">
             <svg
              className="animate-spin h-8 w-8 text-primary"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="text-sm font-medium text-muted-foreground">Loading...</p>
          </div>
        </div>
      )}
    </GoalsContext.Provider>
  );
}

export function useGoals() {
  const context = useContext(GoalsContext);
  if (!context) {
    throw new Error('useGoals must be used within a GoalsProvider');
  }
  return context;
}

// Re-export utilities
export { createDefaultGoal };

