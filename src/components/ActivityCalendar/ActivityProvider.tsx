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
import {
  useActivityTypesQuery,
  useCreateActivityType,
  useUpdateActivityType,
  useDeleteActivityType,
} from '@/lib/hooks/useActivityTypesQuery';

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
  
  // Settings
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  settingsStartInAddMode: boolean;
  openSettingsToAdd: () => void;
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
  settingsOpen: false,
  setSettingsOpen: () => {},
  settingsStartInAddMode: false,
  openSettingsToAdd: () => {},
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsStartInAddMode, setSettingsStartInAddMode] = useState(false);
  const queryClient = useQueryClient();

  // Helper to open settings directly to add mode
  const openSettingsToAdd = useCallback(() => {
    setSettingsStartInAddMode(true);
    setSettingsOpen(true);
  }, []);

  // Reset add mode flag when settings closes
  const handleSetSettingsOpen = useCallback((open: boolean) => {
    setSettingsOpen(open);
    if (!open) {
      setSettingsStartInAddMode(false);
    }
  }, []);
  
  // Use React Query for activity types
  const { data: activityTypes = {}, isLoading: isLoadingTypes } = useActivityTypesQuery(initialTypes);
  const createActivityTypeMutation = useCreateActivityType();
  const updateActivityTypeMutation = useUpdateActivityType();
  const deleteActivityTypeMutation = useDeleteActivityType();
  
  // Use React Query for activities
  const { data: activities = {}, isLoading: isLoadingActivities } = useActivitiesQuery(initialActivities);
  const saveActivityMutation = useSaveActivity();
  const deleteActivityMutation = useDeleteActivity();
  
  const isLoading = isLoadingTypes || isLoadingActivities;

  // Computed values
  const activeTypes = useMemo(() => getActiveActivityTypes(activityTypes), [activityTypes]);
  const canAddType = useMemo(() => canAddActivityType(activityTypes), [activityTypes]);

  // Activity Type management - now using React Query mutations
  const addActivityType = useCallback((type: ActivityType) => {
    if (!canAddActivityType(activityTypes)) return;
    createActivityTypeMutation.mutate(type);
  }, [activityTypes, createActivityTypeMutation]);

  const updateActivityType = useCallback((type: ActivityType) => {
    updateActivityTypeMutation.mutate(type);
  }, [updateActivityTypeMutation]);

  const deleteActivityType = useCallback((typeId: string) => {
    // Soft delete - mark as deleted but keep the type for existing entries
    deleteActivityTypeMutation.mutate(typeId);
  }, [deleteActivityTypeMutation]);

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
    settingsOpen,
    setSettingsOpen: handleSetSettingsOpen,
    settingsStartInAddMode,
    openSettingsToAdd,
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
    settingsOpen,
    handleSetSettingsOpen,
    settingsStartInAddMode,
    openSettingsToAdd,
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
    deleteActivityType,
    settingsOpen,
    setSettingsOpen,
    settingsStartInAddMode,
    openSettingsToAdd,
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
    settingsOpen,
    setSettingsOpen,
    settingsStartInAddMode,
    openSettingsToAdd,
  };
}

export function useActivities() {
  const { activities, updateActivity, deleteActivity, deleteActivityEntry, isLoading, isSaving, isDeleting } = useContext(ActivityContext);
  return { activities, updateActivity, deleteActivity, deleteActivityEntry, isLoading, isSaving, isDeleting };
}

// Re-export for convenience
export { formatValueWithUnit } from '@/lib/activityTypes';
