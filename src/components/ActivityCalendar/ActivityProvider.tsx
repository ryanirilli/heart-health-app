'use client';

import { createContext, useContext, ReactNode, useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ActivityMap, ActivityEntry } from '@/lib/activities';
import { 
  ActivityType, 
  ActivityTypeMap, 
  getActiveActivityTypes, 
  canAddActivityType,
  createDefaultActivityType,
  MAX_ACTIVITY_TYPES 
} from '@/lib/activityTypes';
import { 
  useActivitiesQuery, 
  useSaveActivity, 
  useDeleteActivity,
  ACTIVITIES_QUERY_KEY 
} from '@/lib/hooks/useActivitiesQuery';

interface ActivityContextValue {
  // Activity Types
  activityTypes: ActivityTypeMap;
  activeTypes: ActivityType[];
  canAddType: boolean;
  addActivityType: (type: ActivityType) => void;
  updateActivityType: (type: ActivityType) => void;
  deleteActivityType: (typeId: string) => void;
  
  // Activities
  activities: ActivityMap;
  updateActivity: (date: string, entries: { [typeId: string]: ActivityEntry }) => void;
  deleteActivity: (date: string) => void;
  deleteActivityEntry: (date: string, typeId: string) => void;
  isLoading: boolean;
  isSaving: boolean;
  isDeleting: boolean;
}

const ActivityContext = createContext<ActivityContextValue>({
  activityTypes: {},
  activeTypes: [],
  canAddType: true,
  addActivityType: () => {},
  updateActivityType: () => {},
  deleteActivityType: () => {},
  activities: {},
  updateActivity: () => {},
  deleteActivity: () => {},
  deleteActivityEntry: () => {},
  isLoading: false,
  isSaving: false,
  isDeleting: false,
});

interface ActivityProviderProps {
  children: ReactNode;
  initialTypes?: ActivityTypeMap;
  initialActivities?: ActivityMap;
}

export function ActivityProvider({ 
  children, 
  initialTypes = {}, 
  initialActivities = {} 
}: ActivityProviderProps) {
  const [activityTypes, setActivityTypes] = useState<ActivityTypeMap>(initialTypes);
  const queryClient = useQueryClient();
  
  // Use React Query for activities
  const { data: activities = {}, isLoading } = useActivitiesQuery(initialActivities);
  const saveActivityMutation = useSaveActivity();
  const deleteActivityMutation = useDeleteActivity();

  // Computed values
  const activeTypes = useMemo(() => getActiveActivityTypes(activityTypes), [activityTypes]);
  const canAddType = useMemo(() => canAddActivityType(activityTypes), [activityTypes]);

  // Activity Type management
  const addActivityType = useCallback((type: ActivityType) => {
    if (!canAddActivityType(activityTypes)) return;
    
    setActivityTypes((prev) => ({
      ...prev,
      [type.id]: type,
    }));
  }, [activityTypes]);

  const updateActivityType = useCallback((type: ActivityType) => {
    setActivityTypes((prev) => ({
      ...prev,
      [type.id]: type,
    }));
  }, []);

  const deleteActivityType = useCallback((typeId: string) => {
    // Soft delete - mark as deleted but keep the type for existing entries
    setActivityTypes((prev) => ({
      ...prev,
      [typeId]: {
        ...prev[typeId],
        deleted: true,
      },
    }));
  }, []);

  // Activity management using React Query mutations
  const updateActivity = useCallback((date: string, entries: { [typeId: string]: ActivityEntry }) => {
    // The mutation handles optimistic updates
    saveActivityMutation.mutate({ date, entries });
  }, [saveActivityMutation]);

  const deleteActivity = useCallback((date: string) => {
    // The mutation handles optimistic updates
    deleteActivityMutation.mutate({ date });
  }, [deleteActivityMutation]);

  const deleteActivityEntry = useCallback((date: string, typeId: string) => {
    // Get current activity and remove the entry
    const currentActivities = queryClient.getQueryData<ActivityMap>(ACTIVITIES_QUERY_KEY);
    const activity = currentActivities?.[date];
    if (!activity) return;

    const newEntries = { ...activity.entries };
    delete newEntries[typeId];

    // If no entries left, delete the whole activity
    if (Object.keys(newEntries).length === 0) {
      deleteActivityMutation.mutate({ date });
    } else {
      saveActivityMutation.mutate({ date, entries: newEntries });
    }
  }, [queryClient, saveActivityMutation, deleteActivityMutation]);

  const isSaving = saveActivityMutation.isPending;
  const isDeleting = deleteActivityMutation.isPending;

  const contextValue = useMemo(() => ({
    activityTypes,
    activeTypes,
    canAddType,
    addActivityType,
    updateActivityType,
    deleteActivityType,
    activities, 
    updateActivity, 
    deleteActivity,
    deleteActivityEntry,
    isLoading,
    isSaving,
    isDeleting,
  }), [
    activityTypes,
    activeTypes,
    canAddType,
    addActivityType,
    updateActivityType,
    deleteActivityType,
    activities,
    updateActivity,
    deleteActivity,
    deleteActivityEntry,
    isLoading,
    isSaving,
    isDeleting,
  ]);

  return (
    <ActivityContext.Provider value={contextValue}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivityTypes() {
  const { 
    activityTypes, 
    activeTypes, 
    canAddType, 
    addActivityType, 
    updateActivityType, 
    deleteActivityType 
  } = useContext(ActivityContext);
  
  return { 
    activityTypes, 
    activeTypes, 
    canAddType, 
    addActivityType, 
    updateActivityType, 
    deleteActivityType,
    maxTypes: MAX_ACTIVITY_TYPES,
    createDefaultType: createDefaultActivityType,
  };
}

export function useActivities() {
  const { activities, updateActivity, deleteActivity, deleteActivityEntry, isLoading, isSaving, isDeleting } = useContext(ActivityContext);
  return { activities, updateActivity, deleteActivity, deleteActivityEntry, isLoading, isSaving, isDeleting };
}

// Re-export for convenience
export { formatValueWithUnit } from '@/lib/activityTypes';
