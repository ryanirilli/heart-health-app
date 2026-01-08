"use client";

import { useState, useCallback } from "react";
import {
  ActivityCalendar,
  ActivityProvider,
} from "@/components/ActivityCalendar";
import { ActivityHeader } from "@/components/ActivityHeader";
import { GoalsProvider, GoalsView, GoalFormDialog } from "@/components/Goals";
import { FloatingNavBar, AppView } from "@/components/FloatingNavBar";
import { ActivityTypeMap } from "@/lib/activityTypes";
import { ActivityMap } from "@/lib/activities";
import { GoalMap } from "@/lib/goals";

interface DashboardContentProps {
  types: ActivityTypeMap;
  activities: ActivityMap;
  goals: GoalMap;
}

export function DashboardContent({
  types,
  activities,
  goals,
}: DashboardContentProps) {
  const [currentView, setCurrentView] = useState<AppView>("activities");

  const handleViewChange = useCallback((view: AppView) => {
    setCurrentView(view);
    // Scroll to top when switching views
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <ActivityProvider initialTypes={types} initialActivities={activities}>
      <GoalsProvider initialGoals={goals}>
        <main className="min-h-screen p-6 md:p-12 pb-24">
          <div className="max-w-5xl mx-auto space-y-6">
            {currentView === "activities" ? (
              <>
                <ActivityHeader />
                <ActivityCalendar />
              </>
            ) : (
              <GoalsView activityTypes={types} />
            )}
          </div>
        </main>
        <FloatingNavBar
          currentView={currentView}
          onViewChange={handleViewChange}
        />
        {/* Goal form dialog - always mounted so it can be opened from anywhere */}
        <GoalFormDialog activityTypes={types} />
      </GoalsProvider>
    </ActivityProvider>
  );
}
