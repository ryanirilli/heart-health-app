"use client";

import { useMemo } from "react";
import { Star, Frown } from "lucide-react";
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
  displayStatus: GoalDisplayStatus;
  daysRemaining: number | null;
  isEvaluationDay: boolean;
  usesAverageValue: boolean;
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

/**
 * Get the start of the week (Monday) for a given date string.
 */
function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const day = date.getDay();
  // Adjust for Monday start (0 = Sunday, so we need to go back 6 days, 1 = Monday = 0 days back, etc.)
  const daysToSubtract = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - daysToSubtract);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Get the start of the month for a given date string.
 */
function getMonthStart(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-01`;
}

/**
 * Calculate average value for a goal over a specific period.
 * Used for slider-type activities where we want the average instead of sum.
 *
 * @param goal - The goal to calculate for
 * @param allActivities - All activities
 * @param startDate - Start of the period (inclusive)
 * @param endDate - End of the period (inclusive)
 * @returns Object with sum, count, and average
 */
function getAverageValueForPeriod(
  goal: Goal,
  allActivities: ActivityMap | undefined,
  startDate: string,
  endDate: string
): { sum: number; count: number; average: number } {
  if (!allActivities) return { sum: 0, count: 0, average: 0 };

  let sum = 0;
  let count = 0;

  for (const [dateStr, activity] of Object.entries(allActivities)) {
    if (dateStr >= startDate && dateStr <= endDate) {
      const value = activity.entries?.[goal.activityTypeId]?.value;
      if (value !== undefined) {
        sum += value;
        count++;
      }
    }
  }

  return {
    sum,
    count,
    average: count > 0 ? sum / count : 0,
  };
}

/**
 * Get the effective value for goal comparison based on activity type.
 * For slider, buttonGroup, and toggle types, returns the average over the period.
 * For other types (increment), returns the sum.
 *
 * ButtonGroup and toggle types use average because summing discrete choice values
 * doesn't make semantic sense.
 */
function getEffectiveValueForGoal(
  goal: Goal,
  activityType: ActivityTypeMap[string] | undefined,
  allActivities: ActivityMap | undefined,
  dateStr: string
): number {
  if (!allActivities || !activityType) return 0;

  // Slider, buttonGroup, and toggle use average (not sum)
  const useAverage =
    activityType.uiType === "slider" ||
    activityType.uiType === "buttonGroup" ||
    activityType.uiType === "toggle";

  // Determine the period based on goal date type
  let startDate: string;
  let endDate: string;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  switch (goal.dateType) {
    case "daily":
      // For daily goals, just use the single day value
      return allActivities[dateStr]?.entries?.[goal.activityTypeId]?.value ?? 0;

    case "weekly":
      // Week starts on Monday, ends on Sunday (dateStr)
      startDate = getWeekStart(dateStr);
      endDate = dateStr;
      break;

    case "monthly":
      // Month starts on 1st, ends on last day (dateStr)
      startDate = getMonthStart(dateStr);
      endDate = dateStr;
      break;

    case "by_date":
      // From goal creation to target date (or today if before target)
      startDate = goal.createdAt || todayStr;
      endDate =
        todayStr < (goal.targetDate || todayStr)
          ? todayStr
          : goal.targetDate || todayStr;
      break;

    case "date_range":
      // From start date to end date (or today if before end)
      startDate = goal.startDate || todayStr;
      endDate =
        todayStr < (goal.endDate || todayStr)
          ? todayStr
          : goal.endDate || todayStr;
      break;

    default:
      return 0;
  }

  const { sum, average } = getAverageValueForPeriod(
    goal,
    allActivities,
    startDate,
    endDate
  );

  // For slider and buttonGroup types, use average; for others, use sum
  return useAverage ? average : sum;
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

      if (goal.dateType === "daily") {
        // For daily goals, use single day value
        isMet = isGoalMet(goal, activityValue, activityType);
      } else if (activityType) {
        // For non-daily goals, calculate effective value based on activity type
        // Slider types use average, others use sum
        const goalType = getGoalType(activityType);
        const effectiveValue = getEffectiveValueForGoal(
          goal,
          activityType,
          allActivities,
          dateStr
        );

        if (goalType === "negative") {
          // For negative goals (less is better), check if value exceeds target
          // For slider (average): if average > target, goal is failed
          // For sum: if cumulative > target, goal is failed
          if (
            activityType.uiType !== "slider" &&
            effectiveValue > goal.targetValue
          ) {
            // Only fail immediately for sum-based goals (can't undo past activities)
            isFailed = true;
          } else if (isEvaluationDay || expired) {
            // On evaluation day or after, check if goal is met
            isMet = effectiveValue <= goal.targetValue;
          }
        } else if (goalType === "positive") {
          // For positive goals (more is better):
          // - Weekly/monthly goals only turn green on the evaluation day (Sunday/last day of month)
          // - Other goals (by_date, date_range) can turn green early
          if (goal.dateType === "weekly" || goal.dateType === "monthly") {
            // Only show as met on the evaluation day itself
            if (isEvaluationDay) {
              isMet = effectiveValue >= goal.targetValue;
            }
          } else {
            // For by_date and date_range, goal is met as soon as target is reached
            isMet = effectiveValue >= goal.targetValue;
          }
        } else {
          // Neutral - only check on evaluation day
          if (isEvaluationDay || expired) {
            isMet = effectiveValue === goal.targetValue;
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

      // Calculate effective value for non-daily goals
      // Slider, buttonGroup, and toggle types use average (not sum)
      const usesAverageValue =
        activityType?.uiType === "slider" ||
        activityType?.uiType === "buttonGroup" ||
        activityType?.uiType === "toggle";
      const effectiveValue =
        goal.dateType === "daily"
          ? activityValue
          : getEffectiveValueForGoal(
              goal,
              activityType,
              allActivities,
              dateStr
            );

      return {
        goal,
        activityValue,
        effectiveValue,
        displayStatus,
        daysRemaining,
        isEvaluationDay,
        usesAverageValue,
      };
    });
  }, [goals, dateStr, activity, activityTypes, allActivities]);

  if (goalsWithStatus.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
        <span className="text-sm font-medium text-muted-foreground">Goals</span>
      </div>

      {/* Goal Items */}
      <div className="space-y-2">
        {goalsWithStatus.map(
          ({
            goal,
            activityValue,
            effectiveValue,
            displayStatus,
            daysRemaining,
            isEvaluationDay,
            usesAverageValue,
          }) => (
            <GoalStatusItem
              key={goal.id}
              goal={goal}
              activityValue={activityValue}
              effectiveValue={effectiveValue}
              displayStatus={displayStatus}
              daysRemaining={daysRemaining}
              isEvaluationDay={isEvaluationDay}
              usesAverageValue={usesAverageValue}
              activityType={activityTypes[goal.activityTypeId]}
            />
          )
        )}
      </div>
    </div>
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
  displayStatus: GoalDisplayStatus;
  daysRemaining: number | null;
  isEvaluationDay: boolean;
  usesAverageValue: boolean;
  activityType?: ActivityTypeMap[string];
}

function GoalStatusItem({
  goal,
  activityValue,
  effectiveValue,
  displayStatus,
  daysRemaining,
  isEvaluationDay,
  usesAverageValue,
  activityType,
}: GoalStatusItemProps) {
  const { openEditDialog } = useGoals();
  const IconComponent = getGoalIconComponent(goal.icon);

  const getStatusStyles = () => {
    switch (displayStatus) {
      case "met":
        // Accomplished - strong green emphasis
        return {
          container: "bg-green-500/15 border-green-500/50",
          goalIcon: "bg-green-500/25",
          goalIconColor: "text-green-600 dark:text-green-400",
          textColor: "text-green-700 dark:text-green-300",
          badgeVariant: "goalMet" as const,
          badgeOutlineVariant: "goalMetOutline" as const,
        };
      case "evaluation_day":
        // Last day - amber attention
        return {
          container: "bg-amber-500/15 border-amber-500/50",
          goalIcon: "bg-amber-500/25",
          goalIconColor: "text-amber-600 dark:text-amber-400",
          textColor: "text-amber-700 dark:text-amber-300",
          badgeVariant: "goalWarning" as const,
          badgeOutlineVariant: "goalWarningOutline" as const,
        };
      case "in_progress":
        // In progress - subtle but clear
        return {
          container: "bg-primary/5 border-primary/20",
          goalIcon: "bg-primary/10",
          goalIconColor: "text-primary",
          textColor: "text-foreground",
          badgeVariant: "goalProgress" as const,
          badgeOutlineVariant: "goalProgressOutline" as const,
        };
      case "missed":
      default:
        // Missed - de-emphasized, muted
        return {
          container: "bg-muted/20 border-muted-foreground/10",
          goalIcon: "bg-muted/50",
          goalIconColor: "text-muted-foreground/70",
          textColor: "text-muted-foreground",
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

    // For goals with countdown (by_date, weekly, monthly), show days remaining
    if (
      (goal.dateType === "by_date" ||
        goal.dateType === "weekly" ||
        goal.dateType === "monthly") &&
      daysRemaining !== null &&
      !isEvaluationDay
    ) {
      // Get the current progress value for display
      let progressValue: string;
      if (activityType) {
        if (activityType.uiType === "buttonGroup") {
          // For buttonGroup, round the average to find the closest option label
          const roundedValue =
            effectiveValue !== undefined ? Math.round(effectiveValue) : 0;
          const option = activityType.buttonOptions?.find(
            (o) => o.value === roundedValue
          );
          progressValue = option?.label || "--";
        } else {
          progressValue =
            effectiveValue !== undefined
              ? formatValueOnly(effectiveValue, activityType)
              : "0";
        }
      } else {
        progressValue = String(effectiveValue ?? 0);
      }

      // Format goal target value
      const goalTargetDisplay = activityType
        ? formatValueOnly(goal.targetValue, activityType)
        : String(goal.targetValue);

      if (daysRemaining === 0) {
        return {
          text: "Due today",
          goalBadge: `Goal: ${goalTargetDisplay}`,
        };
      } else if (daysRemaining === 1) {
        return {
          text: `${progressValue} · 1 day left`,
          goalBadge: `Goal: ${goalTargetDisplay}`,
        };
      } else if (daysRemaining > 0) {
        return {
          text: `${progressValue} · ${daysRemaining} days left`,
          goalBadge: `Goal: ${goalTargetDisplay}`,
        };
      }
    }

    // For evaluation days or other goal types, show progress
    if (activityType) {
      // For toggle types, show Yes/No
      if (activityType.uiType === "toggle") {
        if (goal.dateType === "daily") {
          const currentLabel = activityValue === 1 ? "Yes" : "No";
          const targetLabel = goal.targetValue === 1 ? "Yes" : "No";
          return { text: currentLabel, goalBadge: `Goal: ${targetLabel}` };
        } else {
          // For non-daily toggle goals, show percentage of Yes days
          const avgValue = effectiveValue !== undefined ? effectiveValue : 0;
          const percentage = Math.round(avgValue * 100);
          const targetLabel = goal.targetValue === 1 ? "Yes" : "No";
          return {
            text: `${percentage}% Yes`,
            goalBadge: `Goal: ${targetLabel}`,
          };
        }
      }

      // For non-daily goals that use average (slider and buttonGroup)
      if (usesAverageValue && goal.dateType !== "daily") {
        // For buttonGroup types, just show "Average: {label}"
        if (activityType.uiType === "buttonGroup") {
          const roundedValue =
            effectiveValue !== undefined ? Math.round(effectiveValue) : 0;
          // Find the matching button option label
          const option = activityType.buttonOptions?.find(
            (o) => o.value === roundedValue
          );
          const label = option?.label || "--";
          // Find target label
          const targetOption = activityType.buttonOptions?.find(
            (o) => o.value === goal.targetValue
          );
          const targetLabel = targetOption?.label || String(goal.targetValue);
          return { text: `Avg: ${label}`, goalBadge: `Goal: ${targetLabel}` };
        }
        // For slider types, show decimal average with unit
        const avgValue =
          effectiveValue !== undefined
            ? formatValueOnly(
                Math.round(effectiveValue * 10) / 10,
                activityType
              )
            : "0";
        const sliderGoalTarget = formatValueOnly(goal.targetValue, activityType);
        return {
          text: `Avg: ${avgValue}`,
          goalBadge: `Goal: ${sliderGoalTarget}`,
        };
      }

      // For daily goals or increment types, show current/cumulative value with unit
      const currentValue =
        goal.dateType === "daily"
          ? activityValue !== undefined
            ? formatValueOnly(activityValue, activityType)
            : "0"
          : effectiveValue !== undefined
          ? formatValueOnly(effectiveValue, activityType)
          : "0";
      const goalTarget = formatValueOnly(goal.targetValue, activityType);
      return {
        text: currentValue,
        goalBadge: `Goal: ${goalTarget}`,
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
        <div className="text-xs space-y-1">
          <span className={styles.textColor}>{subtitle.text}</span>
          {subtitle.goalBadge && (
            <div>
              <Badge
                variant={styles.badgeOutlineVariant}
                className="text-[10px] px-1.5 py-0 font-normal"
              >
                {subtitle.goalBadge}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Duration Badge or Update Goal button */}
      {showUpdateButton ? (
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
