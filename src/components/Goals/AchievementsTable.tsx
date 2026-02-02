'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useAchievementsQuery, Achievement } from '@/lib/hooks/useAchievementsQuery';
import { getGoalIconComponent, GoalIcon, isValidGoalIcon } from '@/lib/goals';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE = 10;

function AchievementRow({ achievement }: { achievement: Achievement }) {
  const goal = achievement.goals;
  const IconComponent = isValidGoalIcon(goal.icon) 
    ? getGoalIconComponent(goal.icon as GoalIcon) 
    : Trophy;

  const periodStart = parseISO(achievement.period_start);
  const periodEnd = parseISO(achievement.period_end);
  const achievedAt = parseISO(achievement.achieved_at);

  // Format period display
  const isSameDay = achievement.period_start === achievement.period_end;
  const periodDisplay = isSameDay
    ? format(periodStart, 'MMM d, yyyy')
    : `${format(periodStart, 'MMM d')} - ${format(periodEnd, 'MMM d, yyyy')}`;

  // Determine effective goal type (positive/negative/neutral)
  const activityInfo = goal.activity_types;
  let isPositiveGoal = true; // Default behavior

  if (activityInfo) {
    if (activityInfo.goal_type) {
      isPositiveGoal = activityInfo.goal_type === 'positive';
    } else if (activityInfo.is_negative !== null && activityInfo.is_negative !== undefined) {
      isPositiveGoal = !activityInfo.is_negative;
    }
  }

  // For non-positive goals (negative/neutral) that span a period (not same day),
  // the 'achievement' is effectively maintaining status until the end.
  // So we show the period end date to avoid confusion (e.g. "Jan 23" for a "Dry Jan" goal).
  const displayDate = (!isPositiveGoal && !isSameDay) ? periodEnd : achievedAt;

  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        {/* Goal Icon */}
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <IconComponent className="h-4 w-4 text-emerald-600" />
        </div>

        {/* Goal Name & Period */}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{goal.name}</p>
          <p className="text-xs text-muted-foreground">{periodDisplay}</p>
        </div>
      </div>

      {/* Achieved indicator & Date */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-xs text-muted-foreground">
          {format(displayDate, 'MMM d')}
        </span>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted" />
            <div className="space-y-1.5">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
          </div>
          <div className="h-6 w-16 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Trophy className="h-12 w-12 text-muted-foreground/30 mb-4" />
      <p className="text-sm text-muted-foreground">No achievements yet</p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        Complete your goals to earn achievements!
      </p>
    </div>
  );
}

export function AchievementsTable() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useAchievementsQuery(page, ITEMS_PER_PAGE);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Achievements</h2>
        <div className="bg-card border rounded-2xl p-5 shadow-sm">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Achievements</h2>
        <div className="bg-card border rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-destructive">Failed to load achievements</p>
        </div>
      </div>
    );
  }

  const { achievements, totalPages, total } = data || { achievements: [], totalPages: 0, total: 0 };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Achievements</h2>
        {total > 0 && (
          <span className="text-sm text-muted-foreground">{total} total</span>
        )}
      </div>

      <div className="bg-card border rounded-2xl p-5 shadow-sm">
        {achievements.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="divide-y divide-border/50">
              {achievements.map((achievement) => (
                <AchievementRow key={achievement.id} achievement={achievement} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination className="mt-6">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className={cn(
                        'cursor-pointer',
                        page === 1 && 'pointer-events-none opacity-50'
                      )}
                    />
                  </PaginationItem>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setPage(pageNum)}
                          isActive={page === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className={cn(
                        'cursor-pointer',
                        page === totalPages && 'pointer-events-none opacity-50'
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </div>
    </div>
  );
}
