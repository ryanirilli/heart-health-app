"use client";

import { format, parseISO } from "date-fns";
import {
  Sparkles,
  Clock,
  Database,
  Brain,
  Search,
  Save,
  Loader2,
  Plus,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DataState,
  CheckInStreamingStatusType,
  PartialCheckInAnalysis,
  STREAMING_STATUS_MESSAGES,
} from "@/lib/checkIns";
import { StreamingCheckInCard } from "./StreamingCheckInCard";

interface GenerateCheckInCardProps {
  dataState: DataState;
  dataStateDetails: {
    activityTypeCount: number;
    daysWithEntries: number;
    totalEntries: number;
  };
  canGenerateNew: boolean;
  nextAvailableDate: string | null;
  isGenerating: boolean;
  streamingStatus: CheckInStreamingStatusType | null;
  streamingMessage: string | null;
  streamingContent: PartialCheckInAnalysis | null;
  generationError: string | null;
  onGenerate: () => void;
  onNavigateToActivities?: () => void;
}

// Map streaming status to icon
const STATUS_ICONS: Record<CheckInStreamingStatusType, typeof Clock> = {
  checking_rate_limit: Clock,
  aggregating_data: Database,
  analyzing: Brain,
  searching: Search,
  generating: Sparkles,
  streaming_content: Sparkles,
  saving: Save,
  complete: Sparkles,
  error: Clock,
};

export function GenerateCheckInCard({
  dataState,
  dataStateDetails,
  canGenerateNew,
  nextAvailableDate,
  isGenerating,
  streamingStatus,
  streamingMessage,
  streamingContent,
  generationError,
  onGenerate,
  onNavigateToActivities,
}: GenerateCheckInCardProps) {
  // State 1: No activity types - onboarding
  if (dataState === "no_activity_types") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="text-lg font-semibold leading-none tracking-tight text-left">
            Create an Activity First
          </div>
          <p className="text-sm text-muted-foreground text-left mt-1.5">
            Check-ins provide insights on your activities. You need to create an activity (like "Running" or "Meditation") before you can generate a check-in.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center pt-4">
            {onNavigateToActivities && (
              <Button onClick={onNavigateToActivities} size="pill">
                Create Activity
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // State 2: Generating - show streaming content or status interstitial
  if (isGenerating && streamingStatus) {
    // If we have streaming content, keep showing it even during "saving" phase
    // to avoid a flash back to the interstitial
    if (streamingContent && (streamingStatus === "streaming_content" || streamingStatus === "saving")) {
      return <StreamingCheckInCard partialAnalysis={streamingContent} />;
    }

    // Otherwise show the status interstitial for early stages
    const StatusIcon = STATUS_ICONS[streamingStatus] || Sparkles;

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Creating Your Check in
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
              <div className="relative w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <StatusIcon className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div className="text-center">
              <p className="font-medium">
                {streamingMessage || STREAMING_STATUS_MESSAGES[streamingStatus]}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                This may take a moment...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // State 3: Rate limited
  if (!canGenerateNew && nextAvailableDate) {
    const formattedDate = format(parseISO(nextAvailableDate), "MMMM d");

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Weekly Check in
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">Your Next Check-In</h3>
            <p className="text-sm text-muted-foreground">
              Available on <span className="font-medium">{formattedDate}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Keep logging your activities! Your next check-in will have even
              more insights.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // State 4: Error
  if (generationError) {
    return (
      <Card className="border-2 border-destructive/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-destructive" />
            Weekly Check in
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            <p className="text-sm text-destructive mb-4">{generationError}</p>
            <Button onClick={onGenerate} variant="outline" className="rounded-full">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // State 5: Ready to generate (with data state context)
  const getReadyContent = () => {
    switch (dataState) {
      case "no_entries":
        return {
          title: "Get Your First Check in",
          description:
            "You've set up your activities! Generate a personalized check in with tips to get started on your health journey.",
          buttonText: "Generate Getting Started Guide",
        };
      case "minimal_data":
        return {
          title: "Ready for Your Check in",
          description: `You've logged ${dataStateDetails.daysWithEntries} day${dataStateDetails.daysWithEntries === 1 ? "" : "s"} of activities. Get a check in focused on building momentum!`,
          buttonText: "Generate Check in",
        };
      case "sufficient_data":
      default:
        return {
          title: "Generate Your Weekly Check in",
          description: `Based on ${dataStateDetails.daysWithEntries} days of activity data, we'll create a personalized analysis of your health journey.`,
          buttonText: "Generate Check in",
        };
    }
  };

  const content = getReadyContent();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          {content.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{content.description}</p>
        <Button onClick={onGenerate} className="rounded-full" disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              {content.buttonText}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
