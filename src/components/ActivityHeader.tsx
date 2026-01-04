'use client';

import { useState } from 'react';
import { ActivityTypeManager, useActivityTypes } from './ActivityCalendar';

export function ActivityHeader() {
  const [managerOpen, setManagerOpen] = useState(false);
  const { activeTypes } = useActivityTypes();

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
        <button
          onClick={() => setManagerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:border-muted-foreground/50 hover:bg-muted/50 transition-all text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span className="hidden sm:inline">Settings</span>
        </button>
      </div>

      <ActivityTypeManager open={managerOpen} onOpenChange={setManagerOpen} />
    </>
  );
}

