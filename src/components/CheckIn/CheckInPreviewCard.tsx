"use client";

import { format, parseISO } from "date-fns";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckIn } from "@/lib/checkIns";

interface CheckInPreviewCardProps {
  checkIn: CheckIn;
  onClick?: () => void;
}

/**
 * Preview card for navigation sidebar.
 * Shows a condensed view of the check-in with date and summary excerpt.
 */
export function CheckInPreviewCard({ checkIn, onClick }: CheckInPreviewCardProps) {
  const { analysis, createdAt } = checkIn;

  // Get first sentence of summary for preview
  const summaryExcerpt = analysis.overallSummary
    .split(/[.!?]/)[0]
    ?.trim()
    .slice(0, 100);

  return (
    <Card
      className={cn(
        "opacity-50 transition-all duration-200",
        onClick && "cursor-pointer hover:opacity-80 hover:scale-[1.02]"
      )}
      onClick={onClick}
    >
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          Check-In
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {format(parseISO(createdAt), "MMMM d, yyyy")}
        </p>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-xs text-muted-foreground line-clamp-3">
          {summaryExcerpt}...
        </p>
      </CardContent>
    </Card>
  );
}
