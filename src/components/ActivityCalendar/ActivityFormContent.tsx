"use client";

import { useState, useEffect, useMemo } from "react";
import { Activity, ActivityEntry, formatDate } from "@/lib/activities";
import {
  ActivityType,
  formatValueOnly,
  getGoalType,
  getButtonOptionLabel,
} from "@/lib/activityTypes";
import pluralizeLib from "pluralize-esm";
const { plural } = pluralizeLib;
import { useActivityTypes } from "./ActivityProvider";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PillToggle } from "@/components/ui/pill-toggle";
import { Settings } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type FormMode = "view" | "edit";

interface EntryInputProps {
  type: ActivityType;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
}

function EntryInput({ type, value, onChange, disabled }: EntryInputProps) {
  const currentValue = value ?? 0;
  const minValue = type.minValue ?? 0;
  const maxValue = type.maxValue ?? 100;
  const step = type.step ?? 1;

  if (type.uiType === "slider") {
    const progress = ((currentValue - minValue) / (maxValue - minValue)) * 100;

    // Stop pointer events from bubbling to prevent triggering swipe gestures
    const stopPropagation = (e: React.PointerEvent | React.TouchEvent) => {
      e.stopPropagation();
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {formatValueOnly(currentValue, type)}
          </span>
        </div>
        <input
          type="range"
          min={minValue}
          max={maxValue}
          step={step}
          value={currentValue}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="activity-slider touch-none"
          style={{ "--slider-progress": `${progress}%` } as React.CSSProperties}
          onPointerDown={stopPropagation}
          onPointerMove={stopPropagation}
          onTouchStart={stopPropagation}
          onTouchMove={stopPropagation}
        />
      </div>
    );
  }

  if (type.uiType === "buttonGroup") {
    const options = type.buttonOptions ?? [];

    return (
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              // Toggle: if already selected, deselect (set to 0)
              if (currentValue === option.value) {
                onChange(0);
              } else {
                onChange(option.value);
              }
            }}
            disabled={disabled}
            className={cn(
              "flex-1 min-w-[80px] py-2.5 px-3 rounded-full border-2 text-sm font-medium transition-all",
              currentValue === option.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:border-muted-foreground/50 text-muted-foreground hover:text-foreground",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  // Toggle (Yes/No) UI with animated pill toggle
  if (type.uiType === "toggle") {
    const toggleValue = currentValue === 1 ? "yes" : "no";

    return (
      <div className={cn(disabled && "opacity-50 pointer-events-none")}>
        <PillToggle
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]}
          value={toggleValue}
          onValueChange={(val) => onChange(val === "yes" ? 1 : 0)}
          layoutId={`toggle-${type.id}`}
          size="md"
          fullWidth
        />
      </div>
    );
  }

  // Increment/decrement UI
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, currentValue - step))}
        disabled={disabled || currentValue <= 0}
        className={cn(
          "w-10 h-10 rounded-full border-2 bg-transparent text-lg font-bold transition-all flex items-center justify-center",
          disabled || currentValue <= 0
            ? "border-muted text-muted-foreground cursor-not-allowed"
            : "border-border hover:border-foreground text-foreground hover:bg-muted"
        )}
      >
        −
      </button>
      <div className="flex-1 text-center">
        <span className="text-2xl font-bold text-foreground">
          {currentValue}
        </span>
        {type.unit && (
          <span className="ml-2 text-sm text-muted-foreground">
            {type.pluralize && currentValue !== 1
              ? plural(type.unit)
              : type.unit}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(currentValue + step)}
        disabled={disabled}
        className="w-10 h-10 rounded-full border-2 bg-transparent border-border hover:border-foreground text-lg font-bold text-foreground hover:bg-muted transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        +
      </button>
    </div>
  );
}

function ActivityTypeCard({
  type,
  value,
  isTracked,
  onChange,
  onToggleTracked,
  disabled,
  isNewEntry,
}: {
  type: ActivityType;
  value: number | undefined;
  isTracked: boolean;
  onChange: (value: number | undefined) => void;
  onToggleTracked: (tracked: boolean) => void;
  disabled?: boolean;
  /** If true, bypass delete confirmation (for unsaved entries) */
  isNewEntry?: boolean;
}) {
  const goalType = getGoalType(type);
  const isDisabled = disabled || type.deleted;

  // For existing entries that are tracked, disable accordion behavior (always open)
  // Only allow closing via the delete button
  const isLockedOpen = !isNewEntry && isTracked;

  // Control accordion state based on isTracked
  const accordionValue = isTracked ? type.id : "";

  const handleAccordionChange = (value: string) => {
    if (isDisabled) return;
    // If locked open, don't allow accordion to close
    if (isLockedOpen && value === "") return;
    // Opening accordion (value matches type.id) = tracking
    // Closing accordion (value is empty) = untracking
    onToggleTracked(value === type.id);
  };

  return (
    <Accordion
      type="single"
      collapsible={!isLockedOpen}
      value={accordionValue}
      onValueChange={handleAccordionChange}
      className={cn(
        "rounded-lg overflow-hidden",
        type.deleted
          ? "bg-muted/50"
          : isTracked
          ? "bg-muted"
          : "bg-muted/70 hover:bg-muted"
      )}
    >
      <AccordionItem value={type.id} className="border-0 bg-transparent !px-0">
        <AccordionTrigger
          className={cn(
            "w-full flex items-center gap-2 pl-4 pr-2 py-3 text-left transition-colors hover:no-underline [&>svg]:hidden",
            isDisabled && "opacity-50 pointer-events-none",
            isLockedOpen && "cursor-default"
          )}
        >
          <div
            className={cn(
              "w-2 h-2 rounded-full shrink-0",
              goalType === "negative"
                ? "bg-chart-1"
                : goalType === "positive"
                ? "bg-chart-2"
                : "bg-chart-3"
            )}
          />
          <span className="text-sm font-medium text-foreground flex-1">
            {type.name}
          </span>
          {type.deleted && <Badge variant="muted">Archived</Badge>}
          {/* Right side actions - use relative positioning to prevent layout shift */}
          <div className="relative flex items-center justify-end h-8 shrink-0">
            {/* "Tap to log" text - fades out when tracked */}
            <span
              className={cn(
                "text-xs text-muted-foreground whitespace-nowrap pr-2 transition-opacity duration-200",
                isTracked || isDisabled ? "opacity-0" : "opacity-100"
              )}
            >
              Tap to log
            </span>
            {/* Delete button - overlays and fades in when tracked */}
            <div
              className={cn(
                "absolute right-0 transition-opacity duration-200",
                isTracked ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            >
              <ConfirmDeleteButton
                onDelete={(e) => {
                  e?.stopPropagation();
                  onToggleTracked(false);
                }}
                disabled={isDisabled}
                confirmLabel="Remove?"
                bypassConfirm={isNewEntry}
                asDiv
              />
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 pt-0">
          <EntryInput
            type={type}
            value={value}
            onChange={onChange}
            disabled={isDisabled}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

/** View-only card for displaying activity entries */
function ActivityViewCard({
  type,
  value,
}: {
  type: ActivityType;
  value: number;
}) {
  const goalType = getGoalType(type);

  // Format the display value
  const displayValue = () => {
    if (type.uiType === "buttonGroup") {
      const label = getButtonOptionLabel(type, value);
      return label || `${value}`;
    }
    if (type.uiType === "toggle") {
      // Just show Yes/No without the name since name is shown separately
      return value === 1 ? "Yes" : "No";
    }
    return formatValueOnly(value, type);
  };

  return (
    <div
      className={cn(
        "rounded-lg p-3 transition-all",
        type.deleted ? "bg-muted/50" : "bg-muted/70"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              goalType === "negative"
                ? "bg-chart-1"
                : goalType === "positive"
                ? "bg-chart-2"
                : "bg-chart-3"
            )}
          />
          <span className="text-sm font-medium text-foreground">
            {type.name}
          </span>
          {type.deleted && <Badge variant="muted">Archived</Badge>}
        </div>
        <span className="text-lg font-semibold text-foreground">
          {displayValue()}
        </span>
      </div>
    </div>
  );
}

export function formatDialogDate(date: Date): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  const dayNum = date.getDate();
  const year = date.getFullYear();

  return `${dayName}, ${monthName} ${dayNum}, ${year}`;
}

interface ActivityFormContentProps {
  date: Date;
  existingActivity?: Activity;
  onSave: (date: string, entries: { [typeId: string]: ActivityEntry }) => void;
  onDelete?: () => void;
  onClose?: () => void;
  isSaving?: boolean;
  isDeleting?: boolean;
  /** If true, renders inline without dialog/drawer wrapper */
  inline?: boolean;
  /** External mode control - if provided, component becomes controlled */
  mode?: FormMode;
  /** Callback when mode changes */
  onModeChange?: (mode: FormMode) => void;
}

export function ActivityFormContent({
  date,
  existingActivity,
  onSave,
  onDelete,
  onClose,
  isSaving = false,
  isDeleting = false,
  inline = false,
  mode: controlledMode,
  onModeChange,
}: ActivityFormContentProps) {
  const { activeTypes, activityTypes, openSettingsToAdd } = useActivityTypes();
  const [entries, setEntries] = useState<{
    [typeId: string]: number | undefined;
  }>({});
  const [trackedTypes, setTrackedTypes] = useState<Set<string>>(new Set());
  const [internalMode, setInternalMode] = useState<FormMode>("view");

  // Use controlled mode if provided, otherwise use internal state
  const mode = controlledMode ?? internalMode;
  const setMode = (newMode: FormMode) => {
    if (onModeChange) {
      onModeChange(newMode);
    } else {
      setInternalMode(newMode);
    }
  };

  // Reset state when date or existingActivity changes
  useEffect(() => {
    const initialEntries: { [typeId: string]: number | undefined } = {};
    const initialTracked = new Set<string>();

    // Initialize with existing values
    if (existingActivity?.entries) {
      for (const typeId in existingActivity.entries) {
        initialEntries[typeId] = existingActivity.entries[typeId].value;
        initialTracked.add(typeId);
      }
    }

    setEntries(initialEntries);
    setTrackedTypes(initialTracked);
    // Start in view mode if there's existing data, otherwise edit mode for new entries
    if (!controlledMode) {
      setInternalMode(existingActivity ? "view" : "edit");
    }
  }, [date, existingActivity, controlledMode]);

  const handleEntryChange = (typeId: string, value: number | undefined) => {
    setEntries((prev) => ({
      ...prev,
      [typeId]: value,
    }));
  };

  const handleToggleTracked = (typeId: string, tracked: boolean) => {
    setTrackedTypes((prev) => {
      const next = new Set(prev);
      if (tracked) {
        next.add(typeId);
        // Initialize value to 0 when tracking starts
        if (entries[typeId] === undefined) {
          setEntries((prev) => ({ ...prev, [typeId]: 0 }));
        }
      } else {
        next.delete(typeId);
      }
      return next;
    });
  };

  const handleSave = () => {
    const dateStr = formatDate(date);

    // Build entries object - only include types that are explicitly tracked
    const activityEntries: { [typeId: string]: ActivityEntry } = {};
    for (const typeId of trackedTypes) {
      const value = entries[typeId] ?? 0;
      activityEntries[typeId] = { typeId, value };
    }

    onSave(dateStr, activityEntries);
    if (onClose) {
      onClose();
    } else {
      // For inline mode, switch to view mode after save
      setMode("view");
    }
  };

  const handleDelete = () => {
    if (!onDelete) return;
    onDelete();
    if (onClose) {
      onClose();
    }
  };

  const handleCancel = () => {
    if (existingActivity) {
      // Reset to original values and go back to view mode
      const initialEntries: { [typeId: string]: number | undefined } = {};
      const initialTracked = new Set<string>();
      for (const typeId in existingActivity.entries) {
        initialEntries[typeId] = existingActivity.entries[typeId].value;
        initialTracked.add(typeId);
      }
      setEntries(initialEntries);
      setTrackedTypes(initialTracked);
      setMode("view");
    } else if (onClose) {
      onClose();
    }
  };

  const formattedDate = formatDialogDate(date);

  // Get all types that have entries (including deleted types for viewing)
  const typesWithExistingEntries = existingActivity?.entries
    ? Object.keys(existingActivity.entries)
        .map((typeId) => activityTypes[typeId])
        .filter(Boolean)
    : [];

  // Combine active types with any deleted types that have existing entries
  const allRelevantTypes = [
    ...activeTypes,
    ...typesWithExistingEntries.filter(
      (t) => t.deleted && !activeTypes.find((at) => at.id === t.id)
    ),
  ];

  // Check if this is a new entry (no existing activity)
  const isNewEntry = !existingActivity;

  // Get entries with their types for view mode
  const entriesWithTypes = existingActivity?.entries
    ? Object.entries(existingActivity.entries)
        .map(([typeId, entry]) => ({
          type: activityTypes[typeId],
          value: entry.value,
        }))
        .filter((item) => item.type)
        .sort((a, b) => a.type.order - b.type.order)
    : [];

  const isPending = isSaving || isDeleting;

  // View mode content
  const viewContent = (
    <div className="space-y-3">
      {entriesWithTypes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No activities logged for this day.</p>
          <button
            type="button"
            onClick={() => setMode("edit")}
            className="mt-4 px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Add activities
          </button>
        </div>
      ) : (
        entriesWithTypes.map(({ type, value }) => (
          <ActivityViewCard key={type.id} type={type} value={value} />
        ))
      )}
    </div>
  );

  // Empty state component
  const emptyState = (
    <div className="text-center py-8">
      <p className="text-muted-foreground">No activity types defined yet.</p>
      <p className="text-sm text-muted-foreground mb-4">
        Add activity types to start tracking.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          onClose?.();
          openSettingsToAdd();
        }}
        className="gap-2"
      >
        <Settings className="h-4 w-4" />
        Add Activity Type
      </Button>
    </div>
  );

  // Edit mode content
  const editContent = (
    <div className="space-y-4">
      {activeTypes.length === 0 ? (
        emptyState
      ) : (
        // Show all activity types directly with tap to log
        <div className="space-y-3">
          {allRelevantTypes.map((type) => (
            <ActivityTypeCard
              key={type.id}
              type={type}
              value={entries[type.id]}
              isTracked={trackedTypes.has(type.id)}
              onChange={(value) => handleEntryChange(type.id, value)}
              onToggleTracked={(tracked) =>
                handleToggleTracked(type.id, tracked)
              }
              isNewEntry={isNewEntry}
            />
          ))}
        </div>
      )}
    </div>
  );

  // Edit button for view mode header
  const editButton =
    mode === "view" && existingActivity ? (
      <button
        type="button"
        onClick={() => setMode("edit")}
        className={cn(
          "w-8 h-8 rounded-full border-2 bg-transparent border-border hover:border-foreground flex items-center justify-center text-muted-foreground hover:text-foreground transition-all",
          inline && "absolute right-1 top-1"
        )}
        aria-label="Edit activity"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
      </button>
    ) : null;

  // Edit mode footer
  const editFooter = (
    <div className="flex items-center justify-between gap-2 w-full">
      {existingActivity && onDelete && (
        <ConfirmDeleteButton
          onDelete={handleDelete}
          disabled={isSaving}
          isDeleting={isDeleting}
        />
      )}
      <div className="flex-1" />
      <button
        type="button"
        onClick={handleCancel}
        disabled={isPending}
        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSave}
        disabled={activeTypes.length === 0 || isPending}
        className={cn(
          "px-6 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed",
          "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        {isSaving ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Saving...
          </span>
        ) : (
          "Save"
        )}
      </button>
    </div>
  );

  const title = mode === "view" ? "Activity Summary" : "Log Activity";
  const content = mode === "view" ? viewContent : editContent;
  // Hide footer when there are no activity types (show CTA instead)
  const footer =
    mode === "view" || activeTypes.length === 0 ? null : editFooter;

  // Return the content parts for use in dialog/drawer or inline
  return {
    title,
    formattedDate,
    content,
    footer,
    editButton,
    mode,
    setMode,
  };
}

// Re-export the individual components for use in the dialog
export { EntryInput, ActivityTypeCard, ActivityViewCard };
