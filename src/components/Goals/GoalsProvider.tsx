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
  openCreateDialog: () => void;
  openEditDialog: (goal: Goal) => void;
  closeDialog: () => void;
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
  openCreateDialog: () => {},
  openEditDialog: () => {},
  closeDialog: () => {},
});

interface GoalsProviderProps {
  children: ReactNode;
  initialGoals?: GoalMap;
}

export function GoalsProvider({ children, initialGoals = {} }: GoalsProviderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

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
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((goal: Goal) => {
    setEditingGoal(goal);
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingGoal(null);
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
    openCreateDialog,
    openEditDialog,
    closeDialog,
  }), [
    goals,
    goalsList,
    isLoading,
    createGoal,
    updateGoal,
    deleteGoal,
    createGoalMutation.isPending,
    updateGoalMutation.isPending,
    deleteGoalMutation.isPending,
    dialogOpen,
    editingGoal,
    openCreateDialog,
    openEditDialog,
    closeDialog,
  ]);

  return (
    <GoalsContext.Provider value={contextValue}>
      {children}
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

