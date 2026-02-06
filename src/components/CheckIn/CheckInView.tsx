"use client";

import { useState, useCallback, useMemo } from "react";
import { useCheckIns } from "@/lib/hooks/useCheckInsQuery";
import { CheckIn } from "@/lib/checkIns";
import { CheckInCard } from "./CheckInCard";
import { CheckInPreviewCard } from "./CheckInPreviewCard";
import { GenerateCheckInCard } from "./GenerateCheckInCard";
import { Loader2, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { ScrollToTop } from "./ScrollToTop";
import { useActivityTypes } from "@/components/ActivityCalendar/ActivityProvider";
import { AnimatePresence, motion } from "framer-motion";

interface CheckInViewProps {
  onNavigateToActivities?: () => void;
}

// Animation variants - "left" means content exits to the left (going to older)
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

// Skeleton placeholder for when there's no newer check-in (matches DayView pattern)
function SkeletonCheckInCard() {
  return (
    <Card className="opacity-25">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          Next Check-In
        </CardTitle>
        <p className="text-xs text-muted-foreground">Coming soon</p>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded animate-pulse" />
          <div className="h-3 bg-muted rounded animate-pulse w-4/5" />
          <div className="h-3 bg-muted rounded animate-pulse w-3/5" />
        </div>
      </CardContent>
    </Card>
  );
}

export function CheckInView({ onNavigateToActivities }: CheckInViewProps) {
  const {
    checkIns,
    canGenerateNew,
    nextAvailableDate,
    dataState,
    dataStateDetails,
    isLoading,
    isGenerating,
    streamingStatus,
    streamingMessage,
    streamingContent,
    generationError,
    generateCheckIn,
  } = useCheckIns();

  const { openSettingsToAdd } = useActivityTypes();

  // Navigation state - start at index 0 (most recent check-in)
  // checkIns array is newest-first from the API
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("left");

  // Track the newly generated check-in ID to show it without animation after generation
  const [newlyGeneratedId, setNewlyGeneratedId] = useState<string | null>(null);

  // Items array: generate card first (if applicable), then check-ins (newest first)
  const items = useMemo(() => {
    const result: Array<{ type: "generate" } | { type: "checkIn"; data: CheckIn }> = [];

    // Add generate card first if applicable
    if (canGenerateNew || dataState === "no_activity_types" || checkIns.length === 0) {
      result.push({ type: "generate" });
    }

    // Add check-ins (already newest-first from API)
    for (const checkIn of checkIns) {
      result.push({ type: "checkIn", data: checkIn });
    }

    return result;
  }, [checkIns, canGenerateNew, dataState]);

  // Navigation handlers
  // Left arrow = go to older check-in (higher index)
  // Content should slide right-to-left (exits left, older enters from right)
  const handleOlder = useCallback(() => {
    setSlideDirection("left");
    setCurrentIndex((prev) => Math.min(items.length - 1, prev + 1));
  }, [items.length]);

  // Right arrow = go to newer check-in (lower index)
  // Content should slide left-to-right (exits right, newer enters from left)
  const handleNewer = useCallback(() => {
    setSlideDirection("right");
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNavigateToIndex = useCallback(
    (index: number) => {
      if (index > currentIndex) {
        // Going to older (higher index) - slide left
        setSlideDirection("left");
      } else {
        // Going to newer (lower index) - slide right
        setSlideDirection("right");
      }
      setCurrentIndex(index);
    },
    [currentIndex]
  );

  // Handle generation - after successful generation, stay on the new check-in
  const handleGenerate = useCallback(async () => {
    const result = await generateCheckIn();
    if (result) {
      setNewlyGeneratedId(result.id);
      // New check-in will be at index 0 (or 1 if generate card is gone)
      setCurrentIndex(0);
      setTimeout(() => {
        setNewlyGeneratedId(null);
      }, 100);
    }
  }, [generateCheckIn]);

  // Get current item
  const currentItem = items[currentIndex];
  const olderItem = items[currentIndex + 1]; // higher index = older
  const newerItem = currentIndex > 0 ? items[currentIndex - 1] : null; // lower index = newer

  const itemKey = useMemo(() => {
    if (currentItem?.type === "generate") return "generate";
    if (currentItem?.type === "checkIn") return currentItem.data.id;
    return "empty";
  }, [currentItem]);

  // Navigation label
  const getNavigationLabel = useCallback(() => {
    if (!currentItem) return "";
    if (currentItem.type === "generate") return "New";
    return format(parseISO(currentItem.data.createdAt), "MMM d");
  }, [currentItem]);

  const canGoOlder = currentIndex < items.length - 1;
  const canGoNewer = currentIndex > 0;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Days until next check-in badge
  const daysUntilNextBadge = !canGenerateNew && nextAvailableDate ? (
    <Badge variant="secondary" className="text-xs">
      {differenceInCalendarDays(parseISO(nextAvailableDate), new Date()) > 1
        ? `${differenceInCalendarDays(parseISO(nextAvailableDate), new Date())} days until next check in`
        : "1 day until next check in"}
    </Badge>
  ) : null;

  // Render main content with optional badge
  const renderMainContent = (showBadge = true) => {
    if (!currentItem) return null;

    if (currentItem.type === "generate") {
      return (
        <GenerateCheckInCard
          dataState={dataState}
          dataStateDetails={dataStateDetails}
          canGenerateNew={canGenerateNew}
          nextAvailableDate={nextAvailableDate}
          isGenerating={isGenerating}
          streamingStatus={streamingStatus}
          streamingMessage={streamingMessage}
          streamingContent={streamingContent}
          generationError={generationError}
          onGenerate={handleGenerate}
          onNavigateToActivities={() => {
            openSettingsToAdd();
            onNavigateToActivities?.();
          }}
        />
      );
    }

    // Show badge on the most recent check-in (index 0)
    const showBadgeOnCard = showBadge && currentIndex === 0 ? daysUntilNextBadge : undefined;
    return <CheckInCard checkIn={currentItem.data} headerExtra={showBadgeOnCard} />;
  };

  // Render preview card
  const renderPreview = (
    item: { type: "generate" } | { type: "checkIn"; data: CheckIn },
    index: number,
    onClick?: () => void
  ) => {
    if (item.type === "generate") {
      return (
        <div
          className="opacity-50 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={onClick}
        >
          <GenerateCheckInCard
            dataState={dataState}
            dataStateDetails={dataStateDetails}
            canGenerateNew={canGenerateNew}
            nextAvailableDate={nextAvailableDate}
            isGenerating={false}
            streamingStatus={null}
            streamingMessage={null}
            streamingContent={null}
            generationError={null}
            onGenerate={() => {}}
          />
        </div>
      );
    }
    return (
      <CheckInPreviewCard
        checkIn={item.data}
        onClick={onClick ? () => handleNavigateToIndex(index) : undefined}
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Check in</h2>
          <p className="text-sm text-muted-foreground">
            Insights on your rhythm
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* "Latest" button - shown when not at the newest item (index 0) */}
          <AnimatePresence>
            {currentIndex > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="hidden md:block"
              >
                <Button
                  variant="outline"
                  size="pill-sm"
                  className="text-xs"
                  onClick={() => handleNavigateToIndex(0)}
                >
                  Latest
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation arrows - hidden on mobile (swipe instead) */}
          {items.length > 1 && (
            <div className="hidden md:flex items-center rounded-full border border-border bg-muted p-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleOlder}
                disabled={!canGoOlder}
                aria-label="Older check-in"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <span className="text-sm font-medium text-foreground min-w-[48px] text-center px-1">
                {getNavigationLabel()}
              </span>

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleNewer}
                disabled={!canGoNewer}
                aria-label="Newer check-in"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* During generation or showing newly generated, use same grid layout for consistent width */}
      {isGenerating || (newlyGeneratedId && checkIns[0]?.id === newlyGeneratedId) ? (
        <>
          {/* Large screens: Match the 3-column grid */}
          <div className="hidden lg:block">
            <div className="grid grid-cols-[1fr_3fr_1fr] gap-4 items-start">
              <div />
              {isGenerating ? (
                <GenerateCheckInCard
                  dataState={dataState}
                  dataStateDetails={dataStateDetails}
                  canGenerateNew={canGenerateNew}
                  nextAvailableDate={nextAvailableDate}
                  isGenerating={isGenerating}
                  streamingStatus={streamingStatus}
                  streamingMessage={streamingMessage}
                  streamingContent={streamingContent}
                  generationError={generationError}
                  onGenerate={handleGenerate}
                  onNavigateToActivities={() => {
                    openSettingsToAdd();
                    onNavigateToActivities?.();
                  }}
                />
              ) : (
                <CheckInCard checkIn={checkIns[0]} />
              )}
              <div />
            </div>
          </div>
          {/* Medium screens: Match the 2-column grid */}
          <div className="hidden md:block lg:hidden">
            <div className="grid grid-cols-2 gap-4 items-start">
              {isGenerating ? (
                <GenerateCheckInCard
                  dataState={dataState}
                  dataStateDetails={dataStateDetails}
                  canGenerateNew={canGenerateNew}
                  nextAvailableDate={nextAvailableDate}
                  isGenerating={isGenerating}
                  streamingStatus={streamingStatus}
                  streamingMessage={streamingMessage}
                  streamingContent={streamingContent}
                  generationError={generationError}
                  onGenerate={handleGenerate}
                  onNavigateToActivities={() => {
                    openSettingsToAdd();
                    onNavigateToActivities?.();
                  }}
                />
              ) : (
                <CheckInCard checkIn={checkIns[0]} />
              )}
              <div />
            </div>
          </div>
          {/* Mobile: Full width */}
          <div className="md:hidden">
            {isGenerating ? (
              <GenerateCheckInCard
                dataState={dataState}
                dataStateDetails={dataStateDetails}
                canGenerateNew={canGenerateNew}
                nextAvailableDate={nextAvailableDate}
                isGenerating={isGenerating}
                streamingStatus={streamingStatus}
                streamingMessage={streamingMessage}
                streamingContent={streamingContent}
                generationError={generationError}
                onGenerate={handleGenerate}
                onNavigateToActivities={() => {
                  openSettingsToAdd();
                  onNavigateToActivities?.();
                }}
              />
            ) : (
              <CheckInCard checkIn={checkIns[0]} />
            )}
          </div>
        </>
      ) : items.length > 0 ? (
        <>
          {/* Large screens: Three-column layout */}
          {/* Left = older (higher index), Center = current, Right = newer (lower index) */}
          <div className="hidden lg:block overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false} custom={slideDirection}>
              <motion.div
                key={itemKey}
                custom={slideDirection}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={transition}
                className="grid grid-cols-[1fr_3fr_1fr] gap-4 items-start"
              >
                {/* Left column: OLDER check-in (higher index) */}
                {olderItem ? (
                  renderPreview(olderItem, currentIndex + 1, canGoOlder ? handleOlder : undefined)
                ) : (
                  <div />
                )}

                {/* Center column: Current */}
                {renderMainContent()}

                {/* Right column: NEWER check-in (lower index) or skeleton placeholder */}
                {newerItem ? (
                  renderPreview(newerItem, currentIndex - 1, canGoNewer ? handleNewer : undefined)
                ) : (
                  <SkeletonCheckInCard />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Medium screens: Two-column layout (current + older) */}
          <div className="hidden md:block lg:hidden overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false} custom={slideDirection}>
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
                {renderMainContent()}
                {olderItem ? (
                  renderPreview(olderItem, currentIndex + 1, canGoOlder ? handleOlder : undefined)
                ) : (
                  <div />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Mobile: Single card with swipe */}
          <div className="md:hidden overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false} custom={slideDirection}>
              <motion.div
                key={itemKey}
                custom={slideDirection}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={transition}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(_event, info) => {
                  const { offset, velocity } = info;
                  const swipeThreshold = 50;
                  const swipeConfidenceThreshold = 10000;
                  const swipePower = Math.abs(offset.x) * velocity.x;

                  // Swipe left = go to older (higher index)
                  if (offset.x < -swipeThreshold || swipePower < -swipeConfidenceThreshold) {
                    if (canGoOlder) handleOlder();
                  }
                  // Swipe right = go to newer (lower index)
                  else if (offset.x > swipeThreshold || swipePower > swipeConfidenceThreshold) {
                    if (canGoNewer) handleNewer();
                  }
                }}
                style={{ touchAction: "pan-y" }}
              >
                {renderMainContent()}
              </motion.div>
            </AnimatePresence>
            <div className="mt-4 text-center text-xs text-muted-foreground/50">
              Swipe to see more check-ins
            </div>
          </div>
        </>
      ) : (
        <GenerateCheckInCard
          dataState={dataState}
          dataStateDetails={dataStateDetails}
          canGenerateNew={canGenerateNew}
          nextAvailableDate={nextAvailableDate}
          isGenerating={isGenerating}
          streamingStatus={streamingStatus}
          streamingMessage={streamingMessage}
          streamingContent={streamingContent}
          generationError={generationError}
          onGenerate={handleGenerate}
          onNavigateToActivities={() => {
            openSettingsToAdd();
            onNavigateToActivities?.();
          }}
        />
      )}
      <ScrollToTop />
    </div>
  );
}
