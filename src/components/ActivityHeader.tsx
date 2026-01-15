'use client';

import { ActivityTypeManager, useActivityTypes } from './ActivityCalendar';
import { useGoals } from './Goals/GoalsProvider';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

export function ActivityHeader() {
  const { settingsOpen, setSettingsOpen, settingsStartInAddMode } = useActivityTypes();
  const { openCreateDialogWithActivity } = useGoals();

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Activity Tracker
        </h2>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          className="sm:w-auto sm:h-auto sm:px-4 sm:py-2"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">Settings</span>
        </Button>
      </div>

      <ActivityTypeManager 
        open={settingsOpen} 
        onOpenChange={setSettingsOpen}
        startInAddMode={settingsStartInAddMode}
        onActivityCreatedWithGoal={(activityType) => {
          openCreateDialogWithActivity(activityType.id, activityType.name);
        }}
      />
    </>
  );
}
