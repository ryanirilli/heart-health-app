"use client";

import { useMemo, useCallback, ReactNode } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";

const SWIPE_THRESHOLD = 50;

// Animation variants for slide transitions
const slideOffset = 300;
const variants = {
  enter: (direction: "left" | "right") => ({
    x: direction === "left" ? slideOffset : -slideOffset,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: "left" | "right") => ({
    x: direction === "left" ? -slideOffset : slideOffset,
    opacity: 0,
  }),
};

const transition = {
  x: { type: "spring" as const, stiffness: 400, damping: 35 },
  opacity: { duration: 0.2 },
};

export interface ContentNavigatorProps<T> {
  /** Array of items to navigate through */
  items: T[];
  /** Index of the currently selected item */
  currentIndex: number;
  /** Direction of the last slide animation */
  slideDirection: "left" | "right";
  /** Callback when navigating to previous item */
  onPrevious: () => void;
  /** Callback when navigating to next item */
  onNext: () => void;
  /** Whether the user can navigate to the next item */
  canGoNext: boolean;
  /** Whether the user can navigate to the previous item */
  canGoPrevious: boolean;
  /** Unique key for the current item (for animation) */
  itemKey: string;
  /** Render the main content for an item */
  renderItem: (item: T, index: number) => ReactNode;
  /** Render a preview card for an adjacent item (for desktop) */
  renderPreview: (item: T, index: number, onClick?: () => void) => ReactNode;
  /** Render a placeholder when there's no previous/next item */
  renderPlaceholder?: (position: "previous" | "next") => ReactNode;
  /** Whether swipe is enabled (defaults to true on mobile when not blocked) */
  canSwipe?: boolean;
  /** Optional hint text shown below the content on mobile */
  swipeHint?: string;
  /** Use full width layout with navigation below (for long-form content) */
  fullWidth?: boolean;
}

/**
 * A shared navigation component that provides responsive layouts:
 * - Large screens (lg): Three-column layout (previous | current | next)
 * - Medium screens (md): Two-column layout (current | next)
 * - Mobile: Single card with swipe gestures
 *
 * Based on DayView's navigation pattern for consistency across the app.
 */
export function ContentNavigator<T>({
  items,
  currentIndex,
  slideDirection,
  onPrevious,
  onNext,
  canGoNext,
  canGoPrevious,
  itemKey,
  renderItem,
  renderPreview,
  renderPlaceholder,
  canSwipe = true,
  swipeHint,
  fullWidth = false,
}: ContentNavigatorProps<T>) {
  const isMobile = useIsMobile();

  // Get adjacent items
  const previousItem = currentIndex > 0 ? items[currentIndex - 1] : null;
  const currentItem = items[currentIndex];
  const nextItem =
    currentIndex < items.length - 1 ? items[currentIndex + 1] : null;

  // Handle mobile swipe gesture
  const handleMobileDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset, velocity } = info;
      const swipeConfidenceThreshold = 10000;
      const swipePower = Math.abs(offset.x) * velocity.x;

      // Swiped Left -> Next (forward in time/index)
      if (
        offset.x < -SWIPE_THRESHOLD ||
        swipePower < -swipeConfidenceThreshold
      ) {
        if (canGoNext) onNext();
      }
      // Swiped Right -> Previous (backward in time/index)
      else if (
        offset.x > SWIPE_THRESHOLD ||
        swipePower > swipeConfidenceThreshold
      ) {
        if (canGoPrevious) onPrevious();
      }
    },
    [canGoNext, canGoPrevious, onNext, onPrevious]
  );

  // Enable swipe on mobile when not explicitly disabled
  const swipeEnabled = isMobile && canSwipe;

  // Main content
  const mainContent = currentItem ? renderItem(currentItem, currentIndex) : null;

  // Full-width layout for long-form content
  if (fullWidth) {
    return (
      <>
        {/* Desktop: Constrained width content with navigation strip below */}
        <div className="hidden md:block overflow-hidden">
          <AnimatePresence
            mode="popLayout"
            initial={false}
            custom={slideDirection}
          >
            <motion.div
              key={itemKey}
              custom={slideDirection}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              className="max-w-2xl mx-auto"
            >
              {mainContent}
            </motion.div>
          </AnimatePresence>

          {/* Navigation previews below (horizontal scroll) */}
          {items.length > 1 && (
            <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
              {items.map((item, index) => (
                <div
                  key={index}
                  className={`flex-shrink-0 w-64 transition-opacity ${
                    index === currentIndex ? "opacity-100" : "opacity-50 hover:opacity-80"
                  }`}
                >
                  {renderPreview(
                    item,
                    index,
                    index !== currentIndex
                      ? () => {
                          if (index < currentIndex) onPrevious();
                          else onNext();
                        }
                      : undefined
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile: Single card with swipe gesture */}
        <div className="md:hidden overflow-hidden relative">
          <AnimatePresence
            mode="popLayout"
            initial={false}
            custom={slideDirection}
          >
            <motion.div
              key={itemKey}
              custom={slideDirection}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              drag={swipeEnabled ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleMobileDragEnd}
              style={{
                touchAction: swipeEnabled ? "pan-y" : "auto",
              }}
            >
              {mainContent}
            </motion.div>
          </AnimatePresence>

          {/* Swipe hint */}
          {swipeEnabled && swipeHint && (
            <div className="mt-4 text-center text-xs text-muted-foreground/50">
              {swipeHint}
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Large screens: Three-column layout with animation */}
      <div className="hidden lg:block overflow-hidden">
        <AnimatePresence
          mode="popLayout"
          initial={false}
          custom={slideDirection}
        >
          <motion.div
            key={itemKey}
            custom={slideDirection}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            className="grid grid-cols-[1fr_1.2fr_1fr] gap-4 items-start"
          >
            {/* Previous item */}
            {previousItem ? (
              renderPreview(previousItem, currentIndex - 1, canGoPrevious ? onPrevious : undefined)
            ) : (
              renderPlaceholder?.("previous") || <div />
            )}

            {/* Current item (main interactive content) */}
            {mainContent}

            {/* Next item */}
            {nextItem ? (
              renderPreview(nextItem, currentIndex + 1, canGoNext ? onNext : undefined)
            ) : (
              renderPlaceholder?.("next") || <div />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Medium screens: Two-column layout (current + next) */}
      <div className="hidden md:block lg:hidden overflow-hidden">
        <AnimatePresence
          mode="popLayout"
          initial={false}
          custom={slideDirection}
        >
          <motion.div
            key={itemKey}
            custom={slideDirection}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            className="grid grid-cols-2 gap-4 items-start"
          >
            {/* Current item (main interactive content) */}
            {mainContent}

            {/* Next item */}
            {nextItem ? (
              renderPreview(nextItem, currentIndex + 1, canGoNext ? onNext : undefined)
            ) : (
              renderPlaceholder?.("next") || <div />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mobile: Single card with swipe gesture */}
      <div className="md:hidden overflow-hidden relative">
        <AnimatePresence
          mode="popLayout"
          initial={false}
          custom={slideDirection}
        >
          <motion.div
            key={itemKey}
            custom={slideDirection}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            drag={swipeEnabled ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleMobileDragEnd}
            style={{
              touchAction: swipeEnabled ? "pan-y" : "auto",
            }}
          >
            {mainContent}
          </motion.div>
        </AnimatePresence>

        {/* Swipe hint */}
        {swipeEnabled && swipeHint && (
          <div className="mt-4 text-center text-xs text-muted-foreground/50">
            {swipeHint}
          </div>
        )}
      </div>
    </>
  );
}
