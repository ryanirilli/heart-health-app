// Activity Type definitions and utilities
import pluralizeLib from "pluralize-esm";
const { plural } = pluralizeLib;

export type UIType = "increment" | "slider" | "buttonGroup" | "toggle";

/**
 * Goal type determines how the activity is framed:
 * - 'positive': More is better (e.g., exercise, water intake)
 * - 'negative': Less is better (e.g., alcohol, sugar)
 * - 'neutral': Just tracking, no judgment (e.g., mood, sleep quality)
 */
export type GoalType = "positive" | "negative" | "neutral";

/** A button option for buttonGroup UI type */
export interface ButtonOption {
  label: string;
  value: number;
}

/** Maximum number of button options allowed */
export const MAX_BUTTON_OPTIONS = 3;

export interface ActivityType {
  /** Unique identifier for the activity type */
  id: string;
  /** Display name for the activity */
  name: string;
  /** Unit label (e.g., "drinks", "minutes", "steps") - optional for buttonGroup */
  unit?: string;
  /** Whether to pluralize the unit when value > 1 - optional for buttonGroup */
  pluralize?: boolean;
  /**
   * Goal type: 'positive' (more is better), 'negative' (less is better), 'neutral' (just tracking)
   * @deprecated Use goalType instead. This is kept for backward compatibility.
   */
  isNegative?: boolean;
  /** Goal type determines how the activity is framed */
  goalType?: GoalType;
  /** UI type for entering values */
  uiType: UIType;
  /** For slider UI: minimum value */
  minValue?: number;
  /** For slider UI: maximum value */
  maxValue?: number;
  /** For slider UI: step increment */
  step?: number;
  /** For buttonGroup UI: the button options (max 3) */
  buttonOptions?: ButtonOption[];
  /** Whether this type has been deleted (entries persist but can't add new) */
  deleted?: boolean;
  /** Display order */
  order: number;
}

export interface ActivityTypeMap {
  [id: string]: ActivityType;
}

/** Maximum number of active (non-deleted) activity types allowed */
export const MAX_ACTIVITY_TYPES = 5;

/** Generate a unique ID for a new activity type */
export function generateActivityTypeId(): string {
  return `type_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/** Create a default activity type with sensible defaults */
export function createDefaultActivityType(
  partial: Partial<ActivityType> = {}
): ActivityType {
  return {
    id: generateActivityTypeId(),
    name: "",
    unit: "times",
    pluralize: true,
    goalType: "neutral",
    uiType: "increment",
    minValue: 0,
    maxValue: 10,
    step: 1,
    buttonOptions: [], // Start empty - user must add at least 2 options
    order: 0,
    ...partial,
  };
}

/** Minimum number of button options required for buttonGroup type */
export const MIN_BUTTON_OPTIONS = 2;

/** Validate button options - requires at least MIN_BUTTON_OPTIONS with non-empty labels */
export function validateButtonOptions(
  options: ButtonOption[] | undefined
): boolean {
  if (!options) return false;
  const validOptions = options.filter((opt) => opt.label.trim().length > 0);
  return validOptions.length >= MIN_BUTTON_OPTIONS;
}

/**
 * Get the effective goal type, handling backward compatibility with isNegative
 */
export function getGoalType(type: ActivityType): GoalType {
  // If goalType is set, use it
  if (type.goalType) {
    return type.goalType;
  }
  // Fall back to isNegative for backward compatibility
  if (type.isNegative === true) {
    return "negative";
  }
  if (type.isNegative === false) {
    return "positive";
  }
  // Default to neutral
  return "neutral";
}

/** Get the label for a button group value */
export function getButtonOptionLabel(
  type: ActivityType,
  value: number
): string | undefined {
  return type.buttonOptions?.find((opt) => opt.value === value)?.label;
}

/** Get active (non-deleted) activity types */
export function getActiveActivityTypes(types: ActivityTypeMap): ActivityType[] {
  return Object.values(types)
    .filter((t) => !t.deleted)
    .sort((a, b) => a.order - b.order);
}

/** Check if we can add more activity types */
export function canAddActivityType(types: ActivityTypeMap): boolean {
  return getActiveActivityTypes(types).length < MAX_ACTIVITY_TYPES;
}

/** Format minutes as hours and minutes gracefully */
function formatMinutesAsTime(minutes: number): string {
  if (minutes === 0) return "0 minutes";

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return mins === 1 ? "1 minute" : `${mins} minutes`;
  }

  if (mins === 0) {
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }

  const hourPart = hours === 1 ? "1 hour" : `${hours} hours`;
  const minPart = mins === 1 ? "1 minute" : `${mins} minutes`;
  return `${hourPart} ${minPart}`;
}

/** Format a value with the activity type's unit */
export function formatValueWithUnit(value: number, type: ActivityType): string {
  // For button groups, show the label instead of value + unit
  if (type.uiType === "buttonGroup") {
    const label = getButtonOptionLabel(type, value);
    if (label) {
      return `${type.name}: ${label}`;
    }
    // Fallback for buttonGroup without matching label
    return `${type.name}: ${value}`;
  }

  // For toggle types, show Name: Yes/No
  if (type.uiType === "toggle") {
    return `${type.name}: ${value === 1 ? "Yes" : "No"}`;
  }

  const { unit, pluralize: shouldPluralize } = type;

  // If no unit, just return the value
  if (!unit) {
    return `${value}`;
  }

  // Special handling for minutes - show as hours and minutes when appropriate
  if (unit === "minute" && value >= 60) {
    return formatMinutesAsTime(value);
  }

  if (shouldPluralize && value !== 1) {
    return `${value} ${plural(unit)}`;
  }

  return `${value} ${unit}`;
}
