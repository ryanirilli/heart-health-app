"use client";

import { useState, useCallback, useMemo } from "react";
import { useCheckIns } from "@/lib/hooks/useCheckInsQuery";
import { CheckIn } from "@/lib/checkIns";
import { ContentNavigator } from "@/components/ui/content-navigator";
import { CheckInCard } from "./CheckInCard";
import { CheckInPreviewCard } from "./CheckInPreviewCard";
import { GenerateCheckInCard } from "./GenerateCheckInCard";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { ScrollToTop } from "./ScrollToTop";

interface CheckInViewProps {
  onNavigateToActivities?: () => void;
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

  // Navigation state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("left");

  // Track the newly generated check-in ID to show it without animation after generation
  const [newlyGeneratedId, setNewlyGeneratedId] = useState<string | null>(null);

  // Create items array: generation card first (if applicable), then check-ins
  const items = useMemo(() => {
    const result: Array<{ type: "generate" } | { type: "checkIn"; data: CheckIn }> = [];

    // Always show generate card first if user can generate or has no activity types
    if (canGenerateNew || dataState === "no_activity_types" || checkIns.length === 0) {
      result.push({ type: "generate" });
    }

    // Add existing check-ins
    for (const checkIn of checkIns) {
      result.push({ type: "checkIn", data: checkIn });
    }

    return result;
  }, [checkIns, canGenerateNew, dataState]);

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    setSlideDirection("right");
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setSlideDirection("left");
    setCurrentIndex((prev) => Math.min(items.length - 1, prev + 1));
  }, [items.length]);

  const handleNavigateToIndex = useCallback(
    (index: number) => {
      if (index < currentIndex) {
        setSlideDirection("right");
      } else {
        setSlideDirection("left");
      }
      setCurrentIndex(index);
    },
    [currentIndex]
  );

  // Handle generation - after successful generation, stay on the new check-in
  const handleGenerate = useCallback(async () => {
    const result = await generateCheckIn();
    if (result) {
      // Store the new check-in ID so we can show it without animation
      setNewlyGeneratedId(result.id);
      // The new check-in will be at index 0 since canGenerateNew becomes false
      setCurrentIndex(0);
      // Clear the state after a short delay so future navigations animate normally
      setTimeout(() => {
        setNewlyGeneratedId(null);
      }, 100);
    }
  }, [generateCheckIn]);

  // Get current item key - must be before any conditional returns
  const currentItem = items[currentIndex];
  const itemKey = useMemo(() => {
    if (currentItem?.type === "generate") {
      return "generate";
    }
    if (currentItem?.type === "checkIn") {
      return currentItem.data.id;
    }
    return "empty";
  }, [currentItem]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Render item
  const renderItem = (
    item: { type: "generate" } | { type: "checkIn"; data: CheckIn }
  ) => {
    if (item.type === "generate") {
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
          onNavigateToActivities={onNavigateToActivities}
        />
      );
    }
    return <CheckInCard checkIn={item.data} />;
  };

  // Render preview
  const renderPreview = (
    item: { type: "generate" } | { type: "checkIn"; data: CheckIn },
    index: number,
    onClick?: () => void
  ) => {
    if (item.type === "generate") {
      // Show a simplified preview of the generate card
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

  // Empty state placeholder
  const renderPlaceholder = (position: "previous" | "next") => {
    return <div className="opacity-0" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Check in</h2>
          <p className="text-sm text-muted-foreground">
            Insights on your rhythm
          </p>
        </div>
        {!canGenerateNew && nextAvailableDate && (
          <Badge variant="secondary" className="text-xs">
            {differenceInCalendarDays(parseISO(nextAvailableDate), new Date()) > 1
              ? `${differenceInCalendarDays(
                  parseISO(nextAvailableDate),
                  new Date()
                )} days until next check in`
              : "1 day until next check in"}
          </Badge>
        )}
      </div>

      {/* During generation, render directly without ContentNavigator to avoid animation issues */}
      {isGenerating ? (
        <div className="max-w-2xl mx-auto">
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
            onNavigateToActivities={onNavigateToActivities}
          />
        </div>
      ) : /* Show newly generated check-in directly without animation */
      newlyGeneratedId && checkIns[0]?.id === newlyGeneratedId ? (
        <div className="max-w-2xl mx-auto">
          <CheckInCard checkIn={checkIns[0]} />
        </div>
      ) : items.length > 0 ? (
        <ContentNavigator
          items={items}
          currentIndex={currentIndex}
          slideDirection={slideDirection}
          onPrevious={handlePrevious}
          onNext={handleNext}
          canGoNext={currentIndex < items.length - 1}
          canGoPrevious={currentIndex > 0}
          itemKey={itemKey}
          renderItem={renderItem}
          renderPreview={renderPreview}
          renderPlaceholder={renderPlaceholder}
          canSwipe={!isGenerating}
          swipeHint="Swipe to see more check-ins"
          fullWidth
        />
      ) : (
        // Fallback if somehow no items (shouldn't happen due to generate card)
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
          onNavigateToActivities={onNavigateToActivities}
        />
      )}
      <ScrollToTop />
    </div>
  );
}
