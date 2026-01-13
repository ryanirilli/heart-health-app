"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { toast, Toaster } from "sonner";
import { TrendsView } from "@/components/Trends/TrendsView";

const VALID_VIEWS: AppView[] = ["activities", "goals", "trends"];

interface DashboardContentProps {
  types: ActivityTypeMap;
  activities: ActivityMap;
  goals: GoalMap;
  showWelcomeToast?: boolean;
}

export function DashboardContent({
  types,
  activities,
  goals,
  showWelcomeToast,
}: DashboardContentProps) {
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view") as AppView | null;
  const initialView: AppView = viewParam && VALID_VIEWS.includes(viewParam) ? viewParam : "activities";
  
  // Use local state for instant view switching
  const [currentView, setCurrentView] = useState<AppView>(initialView);
  const pendingViewRef = useRef<AppView | null>(null);

  // Show welcome toast for newly confirmed users
  useEffect(() => {
    if (showWelcomeToast) {
      toast.success("Email confirmed!", {
        description: "Welcome to Rhythm. Start tracking your first activity.",
      });
      // Clean up the URL param without triggering navigation
      window.history.replaceState(null, "", "/dashboard");
    }
  }, [showWelcomeToast]);

  // Sync URL when view changes (for bookmarking/sharing)
  useEffect(() => {
    const url = currentView === "activities" ? "/dashboard" : `/dashboard?view=${currentView}`;
    // Use pushState to update URL without triggering Next.js navigation
    // This allows for instant UI updates while keeping URL in sync
    window.history.pushState(null, "", url);
  }, [currentView]);

  const handleViewChange = useCallback((view: AppView) => {
    const scrollY = window.scrollY || document.documentElement.scrollTop;

    if (scrollY > 0) {
      // Store the pending view change
      pendingViewRef.current = view;

      // Smooth scroll to top first
      window.scrollTo({ top: 0, behavior: "smooth" });

      // Set a timeout fallback - if scroll doesn't complete in 500ms, change view anyway
      // This handles cases where smooth scroll is interrupted or doesn't work (e.g., after drawer closes on mobile)
      const timeoutId = setTimeout(() => {
        if (pendingViewRef.current === view) {
          pendingViewRef.current = null;
          window.scrollTo({ top: 0, behavior: "instant" });
          setCurrentView(view);
        }
      }, 500);

      // Poll for scroll completion using requestAnimationFrame (non-blocking)
      const checkScrollComplete = () => {
        // If a different view was requested, abandon this one
        if (pendingViewRef.current !== view) {
          clearTimeout(timeoutId);
          return;
        }

        const currentScroll =
          window.scrollY || document.documentElement.scrollTop;
        if (currentScroll <= 1) {
          // Scroll complete, change view
          clearTimeout(timeoutId);
          pendingViewRef.current = null;
          setCurrentView(view);
        } else {
          // Keep polling
          requestAnimationFrame(checkScrollComplete);
        }
      };
      requestAnimationFrame(checkScrollComplete);
    } else {
      // Already at top, change view immediately
      pendingViewRef.current = null;
      setCurrentView(view);
    }
  }, []);

  // Z-axis animation - scale down/fade out, scale up/fade in
  // Important: pointer-events must be disabled during exit to prevent blocking clicks on new view
  const variants = {
    enter: {
      scale: 0.95,
      opacity: 0,
      pointerEvents: "auto" as const,
    },
    center: {
      scale: 1,
      opacity: 1,
      pointerEvents: "auto" as const,
    },
    exit: {
      scale: 1.05,
      opacity: 0,
      pointerEvents: "none" as const,
    },
  };

  return (
    <ActivityProvider initialTypes={types} initialActivities={activities}>
      <GoalsProvider initialGoals={goals}>
        <main className="min-h-screen p-6 pb-40 md:px-12 md:pt-12 md:pb-40">
          <div className="max-w-5xl mx-auto">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={currentView}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  type: "tween",
                  duration: 0.2,
                  ease: "easeInOut",
                }}
                className="space-y-6"
              >
                {currentView === "activities" ? (
                  <>
                    <ActivityHeader />
                    <ActivityCalendar />
                  </>
                ) : currentView === "goals" ? (
                  <GoalsView />
                ) : (
                  <TrendsView />
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
        <GoalFormDialog />
        {/* Toast notifications */}
        <Toaster position="top-center" richColors theme="dark" />
      </GoalsProvider>
    </ActivityProvider>
  );
}
