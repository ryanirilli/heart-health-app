'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Goal, GoalMap } from '@/lib/goals';

export const GOALS_QUERY_KEY = ['goals'] as const;

export function useGoalsQuery(initialData?: GoalMap) {
  return useQuery({
    queryKey: GOALS_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch('/api/goals');
      if (!response.ok) {
        throw new Error('Failed to fetch goals');
      }
      return response.json() as Promise<GoalMap>;
    },
    initialData,
    // Use a reasonable stale time instead of Infinity
    // This ensures data will refresh after mutations
    staleTime: initialData ? 5 * 60 * 1000 : 0, // 5 minutes if SSR data, immediate otherwise
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goal: Omit<Goal, 'id'> & { id?: string }) => {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goal),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create goal');
      }

      const data = await response.json();
      return data.goal as Goal;
    },
    onMutate: async (newGoal) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: GOALS_QUERY_KEY });

      // Snapshot the previous value
      const previousGoals = queryClient.getQueryData<GoalMap>(GOALS_QUERY_KEY);

      // Optimistically add the new goal with a temporary ID
      const tempId = newGoal.id || `temp_${Date.now()}`;
      queryClient.setQueryData<GoalMap>(GOALS_QUERY_KEY, (old) => ({
        ...old,
        [tempId]: { ...newGoal, id: tempId } as Goal,
      }));

      return { previousGoals, tempId };
    },
    onError: (_err, _variables, context) => {
      // Roll back on error
      if (context?.previousGoals) {
        queryClient.setQueryData(GOALS_QUERY_KEY, context.previousGoals);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goal: Goal) => {
      const response = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goal),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update goal');
      }

      const data = await response.json();
      return data.goal as Goal;
    },
    onMutate: async (updatedGoal) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: GOALS_QUERY_KEY });

      // Snapshot the previous value
      const previousGoals = queryClient.getQueryData<GoalMap>(GOALS_QUERY_KEY);

      // Optimistically update the goal
      queryClient.setQueryData<GoalMap>(GOALS_QUERY_KEY, (old) => ({
        ...old,
        [updatedGoal.id]: updatedGoal,
      }));

      return { previousGoals };
    },
    onError: (_err, _variables, context) => {
      // Roll back on error
      if (context?.previousGoals) {
        queryClient.setQueryData(GOALS_QUERY_KEY, context.previousGoals);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId: string) => {
      const response = await fetch(`/api/goals?id=${goalId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete goal');
      }

      return goalId;
    },
    onMutate: async (goalId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: GOALS_QUERY_KEY });

      // Snapshot the previous value
      const previousGoals = queryClient.getQueryData<GoalMap>(GOALS_QUERY_KEY);

      // Optimistically remove the goal
      queryClient.setQueryData<GoalMap>(GOALS_QUERY_KEY, (old) => {
        if (!old) return {};
        const next = { ...old };
        delete next[goalId];
        return next;
      });

      return { previousGoals };
    },
    onError: (_err, _variables, context) => {
      // Roll back on error
      if (context?.previousGoals) {
        queryClient.setQueryData(GOALS_QUERY_KEY, context.previousGoals);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY });
    },
  });
}
