'use client';

import { ActivityTypeManager, useActivityTypes } from './ActivityCalendar';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

export function ActivityHeader() {
  const { activeTypes, settingsOpen, setSettingsOpen, settingsStartInAddMode } = useActivityTypes();

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Activity Tracker
          </h2>
          <p className="text-muted-foreground">
            {activeTypes.length === 0 
              ? 'Set up your activity types to start tracking'
              : `Tracking ${activeTypes.length} ${activeTypes.length === 1 ? 'activity' : 'activities'}`}
          </p>
        </div>
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
      />
    </>
  );
}
