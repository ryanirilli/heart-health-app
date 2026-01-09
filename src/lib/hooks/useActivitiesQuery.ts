'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ActivityMap, ActivityEntry } from '@/lib/activities';
import { GOALS_QUERY_KEY } from './useGoalsQuery';

export const ACTIVITIES_QUERY_KEY = ['activities'] as const;

interface SaveActivityParams {
  date: string;
  entries: { [typeId: string]: ActivityEntry };
}

interface DeleteActivityParams {
  date: string;
}

export function useActivitiesQuery(initialData?: ActivityMap) {
  return useQuery({
    queryKey: ACTIVITIES_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch('/api/activities');
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      return response.json() as Promise<ActivityMap>;
    },
    initialData,
    // Use a reasonable stale time instead of Infinity
    // This ensures data will refresh after mutations
    staleTime: initialData ? 5 * 60 * 1000 : 0, // 5 minutes if SSR data, immediate otherwise
  });
}

export function useSaveActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, entries }: SaveActivityParams) => {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, entries }),
      });

      if (!response.ok) {
        throw new Error('Failed to save activity');
      }

      return { date, entries };
    },
    onMutate: async ({ date, entries }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ACTIVITIES_QUERY_KEY });

      // Snapshot the previous value
      const previousActivities = queryClient.getQueryData<ActivityMap>(ACTIVITIES_QUERY_KEY);

      // Optimistically update to the new value
      queryClient.setQueryData<ActivityMap>(ACTIVITIES_QUERY_KEY, (old) => {
        if (!old) return { [date]: { date, entries } };
        return {
          ...old,
          [date]: { date, entries },
        };
      });

      return { previousActivities };
    },
    onError: (_err, _variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousActivities) {
        queryClient.setQueryData(ACTIVITIES_QUERY_KEY, context.previousActivities);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we're in sync
      queryClient.invalidateQueries({ queryKey: ACTIVITIES_QUERY_KEY });
      // Also invalidate goals since goal progress depends on activities
      queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY });
    },
  });
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date }: DeleteActivityParams) => {
      const response = await fetch(`/api/activities?date=${date}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete activity');
      }

      return { date };
    },
    onMutate: async ({ date }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ACTIVITIES_QUERY_KEY });

      // Snapshot the previous value
      const previousActivities = queryClient.getQueryData<ActivityMap>(ACTIVITIES_QUERY_KEY);

      // Optimistically update to remove the activity
      queryClient.setQueryData<ActivityMap>(ACTIVITIES_QUERY_KEY, (old) => {
        if (!old) return {};
        const next = { ...old };
        delete next[date];
        return next;
      });

      return { previousActivities };
    },
    onError: (_err, _variables, context) => {
      // If the mutation fails, roll back
      if (context?.previousActivities) {
        queryClient.setQueryData(ACTIVITIES_QUERY_KEY, context.previousActivities);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ACTIVITIES_QUERY_KEY });
      // Also invalidate goals since goal progress depends on activities
      queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY });
    },
  });
}

