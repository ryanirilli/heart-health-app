"use client";

import { format } from "date-fns";
import {
  Sparkles,
  Trophy,
  Lightbulb,
  Target,
  Focus,
  Quote,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PartialCheckInAnalysis } from "@/lib/checkIns";

interface StreamingCheckInCardProps {
  partialAnalysis: PartialCheckInAnalysis;
}

/**
 * Streaming check-in card that progressively displays content as it generates.
 * Shows a skeleton/placeholder for sections that haven't loaded yet.
 */
export function StreamingCheckInCard({ partialAnalysis }: StreamingCheckInCardProps) {
  const today = new Date();

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              Weekly Check in
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {format(today, "MMMM d, yyyy")}
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            Generating...
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 1. Overall Summary - The Heart */}
        <section>
          <div className="space-y-4">
            {partialAnalysis.overallSummary ? (
              partialAnalysis.overallSummary.split("\n\n").map((paragraph, i) => (
                <p key={i} className="text-sm leading-relaxed text-foreground">
                  {paragraph}
                  {/* Show cursor at end of last paragraph while still streaming */}
                  {i === partialAnalysis.overallSummary!.split("\n\n").length - 1 && (
                    <span className="inline-block w-2 h-4 bg-primary/50 animate-pulse ml-0.5 align-middle" />
                  )}
                </p>
              ))
            ) : (
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-full" />
                <div className="h-4 bg-muted rounded animate-pulse w-11/12" />
                <div className="h-4 bg-muted rounded animate-pulse w-10/12" />
              </div>
            )}
          </div>
        </section>

        {/* 2. Celebrations */}
        {(partialAnalysis.celebrations && partialAnalysis.celebrations.length > 0) && (
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-medium text-sm">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              Celebrations
            </h3>
            <ul className="space-y-2">
              {partialAnalysis.celebrations.map((celebration, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm bg-muted/50 rounded-lg p-3 border"
                >
                  <span className="text-muted-foreground mt-0.5">🎉</span>
                  <span>{celebration}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 3. Insights */}
        {(partialAnalysis.insights && partialAnalysis.insights.length > 0) && (
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-medium text-sm">
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
              Insights
            </h3>
            <ul className="space-y-2">
              {partialAnalysis.insights.map((insight, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm"
                >
                  <span className="text-muted-foreground mt-1">•</span>
                  <span className="text-muted-foreground">{insight}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 4. Recommendations */}
        {(partialAnalysis.recommendations && partialAnalysis.recommendations.length > 0) && (
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-medium text-sm">
              <Target className="h-4 w-4 text-muted-foreground" />
              Recommendations
            </h3>
            <ul className="space-y-2">
              {partialAnalysis.recommendations.map((rec, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm bg-muted/50 rounded-lg p-3 border"
                >
                  <span className="text-muted-foreground font-medium">{i + 1}.</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 5. Weekly Focus */}
        {partialAnalysis.weeklyFocus && (
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-medium text-sm">
              <Focus className="h-4 w-4 text-muted-foreground" />
              This Week&apos;s Focus
            </h3>
            <div className="bg-muted/50 rounded-lg p-4 border">
              <p className="text-sm font-medium">{partialAnalysis.weeklyFocus}</p>
            </div>
          </section>
        )}

        {/* 6. Motivation */}
        {partialAnalysis.motivation && (
          <section className="mt-6 pt-6 border-t border-muted">
            <div className="flex items-start gap-3">
              <Quote className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
              <blockquote className="text-sm italic text-muted-foreground">
                {partialAnalysis.motivation}
              </blockquote>
            </div>
          </section>
        )}

        {/* Loading indicator for sections not yet generated */}
        {!partialAnalysis.motivation && (
          <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 mr-2 animate-spin" />
            Still writing...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
