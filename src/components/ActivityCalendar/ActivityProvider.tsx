'use client';

import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { Activity, ActivityMap, ActivityEntry } from '@/lib/activities';
import { 
  ActivityType, 
  ActivityTypeMap, 
  getActiveActivityTypes, 
  canAddActivityType,
  createDefaultActivityType,
  MAX_ACTIVITY_TYPES 
} from '@/lib/activityTypes';

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
  const [activities, setActivities] = useState<ActivityMap>(initialActivities);

  // Computed values
  const activeTypes = getActiveActivityTypes(activityTypes);
  const canAddType = canAddActivityType(activityTypes);

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

  // Activity management
  const updateActivity = useCallback((date: string, entries: { [typeId: string]: ActivityEntry }) => {
    setActivities((prev) => ({
      ...prev,
      [date]: {
        date,
        entries,
      },
    }));
  }, []);

  const deleteActivity = useCallback((date: string) => {
    setActivities((prev) => {
      const next = { ...prev };
      delete next[date];
      return next;
    });
  }, []);

  const deleteActivityEntry = useCallback((date: string, typeId: string) => {
    setActivities((prev) => {
      const activity = prev[date];
      if (!activity) return prev;

      const newEntries = { ...activity.entries };
      delete newEntries[typeId];

      // If no entries left, remove the whole activity
      if (Object.keys(newEntries).length === 0) {
        const next = { ...prev };
        delete next[date];
        return next;
      }

      return {
        ...prev,
        [date]: {
          ...activity,
          entries: newEntries,
        },
      };
    });
  }, []);

  return (
    <ActivityContext.Provider value={{ 
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
    }}>
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
  const { activities, updateActivity, deleteActivity, deleteActivityEntry } = useContext(ActivityContext);
  return { activities, updateActivity, deleteActivity, deleteActivityEntry };
}

// Re-export for convenience
export { formatValueWithUnit } from '@/lib/activityTypes';
