'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ActivityType, ActivityTypeMap } from '@/lib/activityTypes';
import { ACTIVITIES_QUERY_KEY } from './useActivitiesQuery';

export const ACTIVITY_TYPES_QUERY_KEY = ['activityTypes'] as const;

export function useActivityTypesQuery(initialData?: ActivityTypeMap) {
  return useQuery({
    queryKey: ACTIVITY_TYPES_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch('/api/activity-types');
      if (!response.ok) {
        throw new Error('Failed to fetch activity types');
      }
      return response.json() as Promise<ActivityTypeMap>;
    },
    initialData,
    // Use a reasonable stale time instead of Infinity
    // This ensures data will refresh after mutations
    staleTime: initialData ? 5 * 60 * 1000 : 0, // 5 minutes if SSR data, immediate otherwise
  });
}

export function useCreateActivityType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newType: ActivityType) => {
      const response = await fetch('/api/activity-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newType),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create activity type');
      }

      return newType;
    },
    onMutate: async (newType) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ACTIVITY_TYPES_QUERY_KEY });

      // Snapshot the previous value
      const previousTypes = queryClient.getQueryData<ActivityTypeMap>(ACTIVITY_TYPES_QUERY_KEY);

      // Optimistically add the new type
      queryClient.setQueryData<ActivityTypeMap>(ACTIVITY_TYPES_QUERY_KEY, (old) => ({
        ...old,
        [newType.id]: newType,
      }));

      return { previousTypes };
    },
    onError: (_err, _variables, context) => {
      // Roll back on error
      if (context?.previousTypes) {
        queryClient.setQueryData(ACTIVITY_TYPES_QUERY_KEY, context.previousTypes);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ACTIVITY_TYPES_QUERY_KEY });
    },
  });
}

export function useUpdateActivityType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updatedType: ActivityType) => {
      const response = await fetch('/api/activity-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedType),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update activity type');
      }

      return updatedType;
    },
    onMutate: async (updatedType) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ACTIVITY_TYPES_QUERY_KEY });

      // Snapshot the previous value
      const previousTypes = queryClient.getQueryData<ActivityTypeMap>(ACTIVITY_TYPES_QUERY_KEY);

      // Optimistically update the type
      queryClient.setQueryData<ActivityTypeMap>(ACTIVITY_TYPES_QUERY_KEY, (old) => ({
        ...old,
        [updatedType.id]: updatedType,
      }));

      return { previousTypes };
    },
    onError: (_err, _variables, context) => {
      // Roll back on error
      if (context?.previousTypes) {
        queryClient.setQueryData(ACTIVITY_TYPES_QUERY_KEY, context.previousTypes);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ACTIVITY_TYPES_QUERY_KEY });
      // Also invalidate activities since they display type information
      queryClient.invalidateQueries({ queryKey: ACTIVITIES_QUERY_KEY });
    },
  });
}

export function useDeleteActivityType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (typeId: string) => {
      const response = await fetch(`/api/activity-types?id=${typeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete activity type');
      }

      return typeId;
    },
    onMutate: async (typeId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ACTIVITY_TYPES_QUERY_KEY });

      // Snapshot the previous value
      const previousTypes = queryClient.getQueryData<ActivityTypeMap>(ACTIVITY_TYPES_QUERY_KEY);

      // Optimistically mark the type as deleted
      queryClient.setQueryData<ActivityTypeMap>(ACTIVITY_TYPES_QUERY_KEY, (old) => {
        if (!old || !old[typeId]) return old;
        return {
          ...old,
          [typeId]: { ...old[typeId], deleted: true },
        };
      });

      return { previousTypes };
    },
    onError: (_err, _variables, context) => {
      // Roll back on error
      if (context?.previousTypes) {
        queryClient.setQueryData(ACTIVITY_TYPES_QUERY_KEY, context.previousTypes);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ACTIVITY_TYPES_QUERY_KEY });
    },
  });
}

