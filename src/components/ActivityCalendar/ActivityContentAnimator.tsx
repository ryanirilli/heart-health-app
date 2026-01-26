"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

export type AnimationMode = "view" | "edit" | "note" | "voiceNote" | "activitySuggestions";

interface ActivityContentAnimatorProps {
  mode: AnimationMode;
  children: ReactNode;
  /** Direction for slide animation (usually for note transitions) */
  customDirection?: number;
}

/**
 * Shared animator component for activity content transitions.
 * Ensures consistent animation behavior across DayView and ActivityEntryDialog.
 */
export function ActivityContentAnimator({
  mode,
  children,
  customDirection = 0,
}: ActivityContentAnimatorProps) {
  // Determine key for animation uniqueness based on functionality group
  // "view" and "edit" often share the "main" slot in some contexts, but let's keep them distinct if we accept them as modes.
  // In DayView logic: key={mode === "note" ? "note" : mode === "voiceNote" ? "voiceNote" : "main"}
  // Wait, DayView logic was:
  // key={mode === "note" ? "note" : mode === "voiceNote" ? "voiceNote" : mode === "activitySuggestions" ? "activitySuggestions" : "main"}
  
  const animationKey = 
    mode === "note" ? "note" : 
    mode === "voiceNote" ? "voiceNote" : 
    mode === "activitySuggestions" ? "activitySuggestions" : 
    "main"; // Groups view and edit together as "main" to prevent slide animation between them if desired, 
            // OR we can make them distinct. 
            // In DayView, switching from view->edit does NOT trigger the big slide animation usually?
            // Actually DayView implementation:
            // content variable changes based on mode.
            // if mode changes from view to edit, key stays "main", so framer motion sees same key -> NO exit/enter animation.
            // This is desired (instant switch between view/edit form).
            // Slide animation only happens when entering/exiting "sub-pages" like Note/VoiceNote.

  return (
    <AnimatePresence mode="popLayout" initial={false} custom={customDirection}>
      <motion.div
        key={animationKey}
        custom={customDirection}
        variants={{
          initial: (direction: number) => ({ x: direction * 100, opacity: 0 }),
          animate: { x: 0, opacity: 1 },
          exit: (direction: number) => ({ x: direction * -100, opacity: 0 }),
        }}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          duration: 0.7,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
