"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    // Smooth scroll to top, then change view after scroll completes
    const scrollY = window.scrollY || document.documentElement.scrollTop;

    if (scrollY > 0) {
      // Scroll to top first
      window.scrollTo({ top: 0, behavior: "smooth" });

      // Wait for scroll to complete, then change view
      // Estimate scroll duration based on distance (roughly 300-500ms for most scrolls)
      const scrollDuration = Math.min(Math.max(scrollY * 0.5, 150), 400);
      setTimeout(() => {
        setCurrentView(view);
      }, scrollDuration);
    } else {
      // Already at top, change view immediately
      setCurrentView(view);
    }
  }, []);

  // Z-axis animation - scale down/fade out, scale up/fade in
  const variants = {
    enter: {
      scale: 0.95,
      opacity: 0,
    },
    center: {
      scale: 1,
      opacity: 1,
    },
    exit: {
      scale: 1.05,
      opacity: 0,
    },
  };

  return (
    <ActivityProvider initialTypes={types} initialActivities={activities}>
      <GoalsProvider initialGoals={goals}>
        <main className="min-h-screen p-6 pb-40 md:px-12 md:pt-12 md:pb-40">
          <div className="max-w-5xl mx-auto">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentView}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  scale: { type: "spring", stiffness: 400, damping: 30 },
                  opacity: { duration: 0.15 },
                }}
                className="space-y-6"
              >
                {currentView === "activities" ? (
                  <>
                    <ActivityHeader />
                    <ActivityCalendar />
                  </>
                ) : (
                  <GoalsView activityTypes={types} />
                )}
              </motion.div>
            </AnimatePresence>
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
