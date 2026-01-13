"use client";

import { useMemo, useRef } from "react";
import { Star, Frown, Check } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Goal,
  GoalMap,
  getRelevantGoalsForDate,
  isGoalMet,
  getGoalIconComponent,
  getDaysUntilGoal,
  isGoalExpired,
  shouldShowGoalIndicator,
  GOAL_DATE_TYPE_LABELS,
  getWeekStart,
  getMonthStart,
  getValuesForPeriod,
  getEffectiveValueForGoal,
  type GoalValueResult,
} from "@/lib/goals";
import {
  ActivityTypeMap,
  formatValueOnly,
  getGoalType,
} from "@/lib/activityTypes";
import { Activity, ActivityMap } from "@/lib/activities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGoals } from "@/components/Goals";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/** Format goal date info for display */
function formatGoalDateInfo(goal: Goal): string {
  switch (goal.dateType) {
    case "daily":
    case "weekly":
    case "monthly":
      return GOAL_DATE_TYPE_LABELS[goal.dateType];
    case "by_date":
      return goal.targetDate
        ? `By ${format(parseISO(goal.targetDate), "MMM d")}`
        : "By date";
    case "date_range":
      if (goal.startDate && goal.endDate) {
        return `${format(parseISO(goal.startDate), "MMM d")} - ${format(
          parseISO(goal.endDate),
          "MMM d"
        )}`;
      }
      return "Date range";
    default:
      return "";
  }
}

interface GoalStatusSectionProps {
  dateStr: string;
  goals: GoalMap;
  activityTypes: ActivityTypeMap;
  activity?: Activity;
  /** All activities - needed for cumulative goal calculations */
  allActivities?: ActivityMap;
}

type GoalDisplayStatus = "met" | "in_progress" | "evaluation_day" | "missed";

interface GoalWithStatus {
  goal: Goal;
  activityValue: number | undefined;
  effectiveValue: number | undefined;
  daysMetTarget: number;
  dayCount: number;
  displayStatus: GoalDisplayStatus;
  daysRemaining: number | null;
  isEvaluationDay: boolean;
  usesAverageValue: boolean;
  usesAbsoluteTracking: boolean;
}

/**
 * Calculate cumulative value for a goal from creation date to today.
 * Used for "by_date" goals to check if the goal is still achievable.
 */
function getCumulativeValue(
  goal: Goal,
  allActivities: ActivityMap | undefined
): number {
  if (!allActivities || !goal.createdAt) return 0;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  let total = 0;
  for (const [dateStr, activity] of Object.entries(allActivities)) {
    // Only count activities from goal creation to today
    if (dateStr >= goal.createdAt && dateStr <= todayStr) {
      const value = activity.entries?.[goal.activityTypeId]?.value;
      if (value !== undefined) {
        total += value;
      }
    }
  }
  return total;
}

export function GoalStatusSection({
  dateStr,
  goals,
  activityTypes,
  activity,
  allActivities,
}: GoalStatusSectionProps) {
  const goalsWithStatus = useMemo(() => {
    const relevantGoals = getRelevantGoalsForDate(goals, dateStr);

    return relevantGoals.map((goal): GoalWithStatus => {
      const activityType = activityTypes[goal.activityTypeId];
      const activityValue = activity?.entries?.[goal.activityTypeId]?.value;
      const isEvaluationDay = shouldShowGoalIndicator(goal, dateStr);
      // Check if expired relative to TODAY (not the card's date)
      const expired = isGoalExpired(goal);
      // Calculate days remaining from the card's date for display
      const daysRemaining = getDaysUntilGoal(goal, dateStr);

      // Determine goal status based on goal type
      let isMet = false;
      let isFailed = false;

      // Check if this is a discrete option type (buttonGroup or toggle)
      const isDiscreteType =
        activityType?.uiType === "buttonGroup" ||
        activityType?.uiType === "toggle";

      // Check if this goal uses absolute tracking (buttonGroup or toggle with absolute)
      // Note: trackingType might be undefined for goals created before this field existed
      // Use strict comparison and handle potential whitespace/case issues
      const goalTrackingType =
        goal.trackingType?.toString().trim().toLowerCase() || "average";
      const usesAbsoluteTracking = goalTrackingType === "absolute";
      const usesAverageTracking = goalTrackingType === "average";

      if (goal.dateType === "daily") {
        // For daily goals, use single day value (exact match for discrete types)
        if (isDiscreteType) {
          // For discrete types, daily goal is met when value === target
          isMet = activityValue === goal.targetValue;
        } else {
          isMet = isGoalMet(goal, activityValue, activityType);
        }
      } else if (activityType) {
        // For non-daily goals, calculate effective value based on activity type
        const goalType = getGoalType(activityType);
        const valueResult = getEffectiveValueForGoal(
          goal,
          activityType,
          allActivities,
          dateStr
        );

        if (isDiscreteType || usesAbsoluteTracking || usesAverageTracking) {
          // For discrete types (buttonGroup/toggle):
          // - Absolute tracking: "Every day must match target" (allDaysMet)
          // - Average tracking: "Most days match target" (>50% of days)
          if (usesAbsoluteTracking) {
            // Absolute: goal is met only if ALL logged days matched the target
            // If ANY day doesn't match, the goal is immediately failed
            if (valueResult.dayCount > 0 && !valueResult.allDaysMet) {
              // At least one day didn't match - goal is failed
              isFailed = true;
            } else if (isEvaluationDay || expired) {
              // On evaluation day, check if goal is met
              isMet = valueResult.allDaysMet && valueResult.dayCount > 0;
            }
            // Before evaluation day with all days matching, stay in progress
          } else {
            // Average: goal is met when majority (>50%) of days match target
            // effectiveValue is the ratio of matching days (0 to 1)
            if (goal.dateType === "weekly" || goal.dateType === "monthly") {
              // Only show as met on evaluation day
              if (isEvaluationDay) {
                isMet =
                  valueResult.effectiveValue > 0.5 && valueResult.dayCount > 0;
              }
            } else {
              // For by_date and date_range, can turn green early
              isMet =
                valueResult.effectiveValue > 0.5 && valueResult.dayCount > 0;
            }
          }
        } else if (goalType === "negative") {
          // For negative goals (less is better) with continuous values
          if (activityType.uiType === "increment") {
            // For increment types (sum-based), fail immediately if value exceeds target
            if (valueResult.effectiveValue > goal.targetValue) {
              isFailed = true;
            }
          } else if (isEvaluationDay || expired) {
            // On evaluation day or after, check if goal is met (for average-based goals like slider)
            isMet = valueResult.effectiveValue <= goal.targetValue;
          }
        } else if (goalType === "positive") {
          // For positive goals (more is better) with continuous values:
          // - Weekly/monthly goals only turn green on the evaluation day (Sunday/last day of month)
          // - Other goals (by_date, date_range) can turn green early
          if (goal.dateType === "weekly" || goal.dateType === "monthly") {
            // Only show as met on the evaluation day itself
            if (isEvaluationDay) {
              isMet = valueResult.effectiveValue >= goal.targetValue;
            }
          } else {
            // For by_date and date_range, goal is met as soon as target is reached
            isMet = valueResult.effectiveValue >= goal.targetValue;
          }
        } else {
          // Neutral with continuous values - only check on evaluation day
          if (isEvaluationDay || expired) {
            isMet = valueResult.effectiveValue === goal.targetValue;
          }
        }
      }

      // Determine if this is truly the "last day" for evaluation
      // For date_range goals, only the end date is the evaluation day
      // For other goals, use the existing isEvaluationDay logic
      const isActualEvaluationDay =
        goal.dateType === "date_range"
          ? dateStr === goal.endDate
          : isEvaluationDay;

      let displayStatus: GoalDisplayStatus;
      if (isMet) {
        displayStatus = "met";
      } else if (isFailed || expired) {
        displayStatus = "missed";
      } else if (isActualEvaluationDay && goal.dateType !== "daily") {
        // Daily goals don't get special "evaluation day" treatment -
        // they're either met (green) or not (muted)
        displayStatus = "evaluation_day";
      } else {
        displayStatus = "in_progress";
      }

      const usesAverageValueDisplay = goalTrackingType === "average";

      const usesAbsoluteTrackingDisplay = goalTrackingType === "absolute";

      // Get the value result for display
      const valueResultForDisplay =
        goal.dateType === "daily"
          ? {
              effectiveValue: activityValue ?? 0,
              daysMetTarget: 0,
              dayCount: 0,
              allDaysMet: false,
            }
          : getEffectiveValueForGoal(
              goal,
              activityType,
              allActivities,
              dateStr
            );

      return {
        goal,
        activityValue,
        effectiveValue: valueResultForDisplay.effectiveValue,
        daysMetTarget: valueResultForDisplay.daysMetTarget,
        dayCount: valueResultForDisplay.dayCount,
        displayStatus,
        daysRemaining,
        isEvaluationDay,
        usesAverageValue: usesAverageValueDisplay,
        usesAbsoluteTracking: usesAbsoluteTrackingDisplay,
      };
    });
  }, [goals, dateStr, activity, activityTypes, allActivities]);

  const accordionRef = useRef<HTMLDivElement>(null);

  const handleValueChange = (value: string) => {
    if (value === "goals" && accordionRef.current) {
      // Wait for the accordion animation to complete before scrolling
      setTimeout(() => {
        const element = accordionRef.current;
        if (!element) return;

        // Get the element's position and add extra padding for mobile floating nav
        const rect = element.getBoundingClientRect();
        const scrollContainer =
          element.closest("[data-scroll-container]") || window;

        if (scrollContainer === window) {
          // For window scrolling, calculate with extra bottom padding for floating nav
          const bottomPadding = 100; // Extra space for floating footer bar
          const viewportHeight = window.innerHeight;
          const elementBottom = rect.bottom;

          if (elementBottom + bottomPadding > viewportHeight) {
            window.scrollBy({
              top: elementBottom - viewportHeight + bottomPadding,
              behavior: "smooth",
            });
          }
        } else {
          // For container scrolling
          element.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }
      }, 200);
    }
  };

  if (goalsWithStatus.length === 0) {
    return null;
  }

  return (
    <Accordion
      type="single"
      collapsible
      onValueChange={handleValueChange}
      ref={accordionRef}
    >
      <AccordionItem value="goals" className="border-0 bg-transparent px-0">
        <AccordionTrigger className="py-0 hover:no-underline">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            <span className="text-sm font-medium">Goals</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-0 pt-3">
          <div className="space-y-2">
            {goalsWithStatus.map(
              ({
                goal,
                activityValue,
                effectiveValue,
                daysMetTarget,
                dayCount,
                displayStatus,
                daysRemaining,
                isEvaluationDay,
                usesAverageValue,
                usesAbsoluteTracking,
              }) => (
                <GoalStatusItem
                  key={goal.id}
                  goal={goal}
                  activityValue={activityValue}
                  effectiveValue={effectiveValue}
                  daysMetTarget={daysMetTarget}
                  dayCount={dayCount}
                  displayStatus={displayStatus}
                  daysRemaining={daysRemaining}
                  isEvaluationDay={isEvaluationDay}
                  usesAverageValue={usesAverageValue}
                  usesAbsoluteTracking={usesAbsoluteTracking}
                  activityType={activityTypes[goal.activityTypeId]}
                />
              )
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

interface GoalStatusStyles {
  container: string;
  goalIcon: string;
  goalIconColor: string;
  textColor: string;
  badgeVariant: "goalMet" | "goalWarning" | "goalProgress" | "goalMissed";
  badgeOutlineVariant:
    | "goalMetOutline"
    | "goalWarningOutline"
    | "goalProgressOutline"
    | "goalMissedOutline";
}

interface GoalStatusItemProps {
  goal: Goal;
  activityValue: number | undefined;
  effectiveValue: number | undefined;
  daysMetTarget: number;
  dayCount: number;
  displayStatus: GoalDisplayStatus;
  daysRemaining: number | null;
  isEvaluationDay: boolean;
  usesAverageValue: boolean;
  usesAbsoluteTracking: boolean;
  activityType?: ActivityTypeMap[string];
}

function GoalStatusItem({
  goal,
  activityValue,
  effectiveValue,
  daysMetTarget,
  dayCount,
  displayStatus,
  daysRemaining,
  isEvaluationDay,
  usesAverageValue,
  usesAbsoluteTracking,
  activityType,
}: GoalStatusItemProps) {
  const { openEditDialog } = useGoals();
  const IconComponent = getGoalIconComponent(goal.icon);

  const getStatusStyles = () => {
    switch (displayStatus) {
      case "met":
        // Accomplished - soft green, celebratory but calm
        return {
          container: "bg-emerald-500/10 border-transparent",
          goalIcon: "bg-emerald-500/20",
          goalIconColor: "text-emerald-600 dark:text-emerald-400",
          textColor: "text-emerald-700 dark:text-emerald-300",
          badgeVariant: "goalMet" as const,
          badgeOutlineVariant: "goalMetOutline" as const,
        };
      case "evaluation_day":
        // Last day - warm amber, gentle attention
        return {
          container: "bg-amber-500/10 border-transparent",
          goalIcon: "bg-amber-500/20",
          goalIconColor: "text-amber-600 dark:text-amber-400",
          textColor: "text-amber-700 dark:text-amber-300",
          badgeVariant: "goalWarning" as const,
          badgeOutlineVariant: "goalWarningOutline" as const,
        };
      case "in_progress":
        // In progress - subtle, blends with content
        return {
          container: "bg-muted/20 border-transparent",
          goalIcon: "bg-muted",
          goalIconColor: "text-muted-foreground",
          textColor: "text-foreground",
          badgeVariant: "goalProgress" as const,
          badgeOutlineVariant: "goalProgressOutline" as const,
        };
      case "missed":
      default:
        // Missed - very subtle, not discouraging
        return {
          container: "bg-muted/30 border-transparent",
          goalIcon: "bg-muted/60",
          goalIconColor: "text-muted-foreground/60",
          textColor: "text-muted-foreground/80",
          badgeVariant: "goalMissed" as const,
          badgeOutlineVariant: "goalMissedOutline" as const,
        };
    }
  };

  const styles = getStatusStyles();

  const getSubtitle = (): { text: string; goalBadge?: string } => {
    // For missed goals, show encouraging message based on goal type
    if (displayStatus === "missed") {
      switch (goal.dateType) {
        case "daily":
          return { text: "Try again tomorrow" };
        case "weekly":
          return { text: "Try again next week" };
        case "monthly":
          return { text: "Try again next month" };
        case "by_date":
        case "date_range":
        default:
          return { text: "Ready to set a new goal?" };
      }
    }

    // For goals with countdown (by_date, date_range, weekly, monthly), show days remaining
    if (
      (goal.dateType === "by_date" ||
        goal.dateType === "date_range" ||
        goal.dateType === "weekly" ||
        goal.dateType === "monthly") &&
      daysRemaining !== null &&
      !isEvaluationDay
    ) {
      // Get the current progress value for display
      let progressValue: string;
      let goalTargetDisplay: string;

      if (activityType) {
        if (
          activityType.uiType === "buttonGroup" ||
          activityType.uiType === "toggle"
        ) {
          // Check tracking type directly from goal as well (defensive)
          const isAbsolute =
            usesAbsoluteTracking || goal.trackingType === "absolute";

          // Find target label first (same for both tracking types)
          if (activityType.uiType === "toggle") {
            goalTargetDisplay = goal.targetValue === 1 ? "Yes" : "No";
          } else {
            const targetOption = activityType.buttonOptions?.find(
              (o) => o.value === goal.targetValue
            );
            goalTargetDisplay = targetOption?.label || String(goal.targetValue);
          }

          if (isAbsolute) {
            // For absolute tracking, show "X/Y days at [target]"
            progressValue = `${daysMetTarget}/${dayCount} days at ${goalTargetDisplay}`;
          } else {
            // For average tracking - show "X/Y days" format with percentage
            const percentage =
              effectiveValue !== undefined
                ? Math.round(effectiveValue * 100)
                : 0;
            progressValue = `${daysMetTarget}/${dayCount} days (${percentage}%)`;
          }
        } else {
          // For slider/increment types, show value with units in progressValue
          // and just the number in goalTargetDisplay
          progressValue =
            effectiveValue !== undefined
              ? formatValueOnly(effectiveValue, activityType)
              : "0";
          goalTargetDisplay = String(goal.targetValue);
        }
      } else {
        progressValue = String(effectiveValue ?? 0);
        goalTargetDisplay = String(goal.targetValue);
      }

      // For by_date goals, show "since [created date]" to clarify the tracking period
      const sinceText =
        goal.dateType === "by_date" && goal.createdAt
          ? ` · since ${format(parseISO(goal.createdAt), "MMM d")}`
          : "";

      if (daysRemaining === 0) {
        return {
          text: `${progressValue}${sinceText}`,
          goalBadge: `Goal: ${goalTargetDisplay} · due today`,
        };
      } else if (daysRemaining === 1) {
        return {
          text: `${progressValue}${sinceText}`,
          goalBadge: `Goal: ${goalTargetDisplay} · 1 day left`,
        };
      } else if (daysRemaining > 0) {
        return {
          text: `${progressValue}${sinceText}`,
          goalBadge: `Goal: ${goalTargetDisplay} · ${daysRemaining} days left`,
        };
      }
    }

    // For evaluation days or other goal types, show progress
    if (activityType) {
      // For toggle types, show Yes/No
      if (activityType.uiType === "toggle") {
        const targetLabel = goal.targetValue === 1 ? "Yes" : "No";
        if (goal.dateType === "daily") {
          const currentLabel = activityValue === 1 ? "Yes" : "No";
          return { text: currentLabel, goalBadge: `Goal: ${targetLabel}` };
        } else if (usesAbsoluteTracking) {
          // For absolute tracking, show days met / total days
          return {
            text: `${daysMetTarget}/${dayCount} days at ${targetLabel}`,
            goalBadge: `Goal: Every day`,
          };
        } else {
          // For average tracking, show days matching / total days
          // effectiveValue is the ratio of matching days (0 to 1)
          const percentage =
            effectiveValue !== undefined ? Math.round(effectiveValue * 100) : 0;
          return {
            text: `${daysMetTarget}/${dayCount} days (${percentage}%)`,
            goalBadge: `Goal: Most days ${targetLabel}`,
          };
        }
      }

      // For absolute tracking (any type except toggle which is handled above)
      if (
        usesAbsoluteTracking &&
        goal.dateType !== "daily"
      ) {
        // For buttonGroup/toggle, target is a label
        if (
          activityType.uiType === "buttonGroup"
        ) {
          const targetOption = activityType.buttonOptions?.find(
            (o) => o.value === goal.targetValue
          );
          const targetLabel = targetOption?.label || String(goal.targetValue);
          return {
            text: `${daysMetTarget}/${dayCount} days at ${targetLabel}`,
            goalBadge: `Goal: Every day`,
          };
        }

        // For slider/increment, target is a value with unit
        const targetLabel = formatValueOnly(goal.targetValue, activityType);
        return {
          text: `${daysMetTarget}/${dayCount} days met`,
          goalBadge: `Goal: Every day ${targetLabel}`,
        };
      }

      // For non-daily goals that use average (slider and buttonGroup with average tracking)
      if (usesAverageValue && goal.dateType !== "daily") {
        // For buttonGroup types, show "X/Y days" format
        if (activityType.uiType === "buttonGroup") {
          // effectiveValue is the ratio of matching days (0 to 1)
          const percentage =
            effectiveValue !== undefined ? Math.round(effectiveValue * 100) : 0;
          // Find target label
          const targetOption = activityType.buttonOptions?.find(
            (o) => o.value === goal.targetValue
          );
          const targetLabel = targetOption?.label || String(goal.targetValue);
          return {
            text: `${daysMetTarget}/${dayCount} days (${percentage}%)`,
            goalBadge: `Goal: Most days ${targetLabel}`,
          };
        }
        // For slider types, show decimal average with unit
        const avgValue =
          effectiveValue !== undefined
            ? formatValueOnly(
                Math.round(effectiveValue * 10) / 10,
                activityType
              )
            : "0";
        // Goal badge shows just the number, unit is already in avgValue
        return {
          text: `Avg: ${avgValue}`,
          goalBadge: `Goal: ${goal.targetValue}`,
        };
      }

      // For daily buttonGroup goals, show the label instead of numeric value
      if (goal.dateType === "daily" && activityType.uiType === "buttonGroup") {
        const currentOption = activityType.buttonOptions?.find(
          (o) => o.value === activityValue
        );
        const targetOption = activityType.buttonOptions?.find(
          (o) => o.value === goal.targetValue
        );
        const currentLabel = currentOption?.label || String(activityValue ?? 0);
        const targetLabel = targetOption?.label || String(goal.targetValue);
        return {
          text: currentLabel,
          goalBadge: `Goal: ${targetLabel}`,
        };
      }

      // For daily goals or increment types (and 'sum' goals), show current/cumulative value with unit
      const rawValue =
        goal.dateType === "daily" ? activityValue ?? 0 : effectiveValue ?? 0;
      const currentValue = formatValueOnly(rawValue, activityType);
      
      // Format target value properly
      const targetValueDisplay = formatValueOnly(goal.targetValue, activityType);
      
      // Goal badge shows the formatted target
      return {
        text: currentValue,
        goalBadge: `Goal: ${targetValueDisplay}`,
      };
    }

    return {
      text: String(activityValue ?? 0),
      goalBadge: `Goal: ${goal.targetValue}`,
    };
  };

  const subtitle = getSubtitle();

  // Only show Update Goal button for by_date and date_range goals
  const showUpdateButton =
    displayStatus === "missed" &&
    (goal.dateType === "by_date" || goal.dateType === "date_range");

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border",
        styles.container
      )}
    >
      {/* Goal Icon - show sad face for missed goals */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
          styles.goalIcon
        )}
      >
        {displayStatus === "missed" ? (
          <Frown className={cn("h-4 w-4", styles.goalIconColor)} />
        ) : (
          <IconComponent className={cn("h-4 w-4", styles.goalIconColor)} />
        )}
      </div>

      {/* Goal Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn("text-sm font-medium truncate", styles.textColor)}>
            {goal.name}
          </p>
          {displayStatus === "evaluation_day" && (
            <Badge
              variant={styles.badgeVariant}
              className="text-[10px] px-1.5 py-0"
            >
              Last Day
            </Badge>
          )}
        </div>
        <div className="text-xs space-y-0.5">
          <div className={styles.textColor}>{subtitle.text}</div>
          {subtitle.goalBadge && displayStatus !== "met" && (
            <div className={cn("text-[11px]", styles.textColor, "opacity-70")}>
              {subtitle.goalBadge}
            </div>
          )}
        </div>
      </div>

      {/* Completed indicator, Duration Badge, or Update Goal button */}
      {displayStatus === "met" ? (
        <div
          className={cn(
            "flex items-center gap-1 flex-shrink-0 text-xs font-medium",
            styles.textColor
          )}
        >
          <Check className="h-3.5 w-3.5" />
          <span>Completed</span>
        </div>
      ) : showUpdateButton ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openEditDialog(goal)}
          className="flex-shrink-0 text-xs text-muted-foreground"
        >
          Update Goal
        </Button>
      ) : (
        <Badge
          variant={styles.badgeVariant}
          className="flex-shrink-0 text-[10px]"
        >
          {formatGoalDateInfo(goal)}
        </Badge>
      )}
    </div>
  );
}
