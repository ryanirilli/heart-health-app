"use client";

import { format, parseISO } from "date-fns";
import {
  Sparkles,
  Trophy,
  Lightbulb,
  Target,
  ExternalLink,
  Focus,
  Quote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckIn, CheckInResource } from "@/lib/checkIns";

interface CheckInCardProps {
  checkIn: CheckIn;
}

/**
 * Full check-in card displaying all analysis sections.
 * This is the main content card shown when viewing a check-in.
 */
export function CheckInCard({ checkIn }: CheckInCardProps) {
  const { analysis, periodStart, periodEnd, createdAt } = checkIn;

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Weekly Check in
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {format(parseISO(createdAt), "MMMM d, yyyy")}
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {format(parseISO(periodStart), "MMM d")} -{" "}
            {format(parseISO(periodEnd), "MMM d")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 1. Overall Summary - The Heart */}
        <section>
          <div className="space-y-4">
            {analysis.overallSummary.split("\n\n").map((paragraph, i) => (
              <p key={i} className="text-sm leading-relaxed text-foreground">
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        {/* 2. Celebrations */}
        {analysis.celebrations.length > 0 && (
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-medium text-sm">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              Celebrations
            </h3>
            <ul className="space-y-2">
              {analysis.celebrations.map((celebration, i) => (
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
        {analysis.insights.length > 0 && (
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-medium text-sm">
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
              Insights
            </h3>
            <ul className="space-y-2">
              {analysis.insights.map((insight, i) => (
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
        {analysis.recommendations.length > 0 && (
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-medium text-sm">
              <Target className="h-4 w-4 text-muted-foreground" />
              Recommendations
            </h3>
            <ul className="space-y-2">
              {analysis.recommendations.map((rec, i) => (
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

        {/* 5. Resources */}
        {analysis.resources.length > 0 && (
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-medium text-sm">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              Resources for You
            </h3>
            <div className="space-y-2">
              {analysis.resources.map((resource, i) => (
                <ResourceCard key={i} resource={resource} />
              ))}
            </div>
          </section>
        )}

        {/* 6. Weekly Focus */}
        {analysis.weeklyFocus && (
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-medium text-sm">
              <Focus className="h-4 w-4 text-muted-foreground" />
              This Week&apos;s Focus
            </h3>
            <div className="bg-muted/50 rounded-lg p-4 border">
              <p className="text-sm font-medium">{analysis.weeklyFocus}</p>
            </div>
          </section>
        )}

        {/* 7. Motivation */}
        {analysis.motivation && (
          <section className="mt-6 pt-6 border-t border-muted">
            <div className="flex items-start gap-3">
              <Quote className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
              <blockquote className="text-sm italic text-muted-foreground">
                {analysis.motivation}
              </blockquote>
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
}

function ResourceCard({ resource }: { resource: CheckInResource }) {
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block rounded-lg p-3 border",
        "hover:bg-muted/50 transition-colors",
        "group"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">
              {resource.title}
            </span>
            <Badge variant="secondary" className="text-xs">
              {resource.type}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {resource.description}
          </p>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
      </div>
    </a>
  );
}
