"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Activity, ActivityEntry, formatDate } from "@/lib/activities";
import { useActivityTypes } from "./ActivityProvider";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";
import {
  EntryInput,
  ActivityTypeCard,
  ActivityViewCard,
  formatDialogDate,
} from "./ActivityFormContent";

type DialogMode = "view" | "edit";

interface ActivityEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  existingActivity?: Activity;
  onSave: (date: string, entries: { [typeId: string]: ActivityEntry }) => void;
  onDelete?: () => void;
  isSaving?: boolean;
  isDeleting?: boolean;
}

export function ActivityEntryDialog({
  open,
  onOpenChange,
  date,
  existingActivity,
  onSave,
  onDelete,
  isSaving = false,
  isDeleting = false,
}: ActivityEntryDialogProps) {
  const { activeTypes, activityTypes } = useActivityTypes();
  const [entries, setEntries] = useState<{
    [typeId: string]: number | undefined;
  }>({});
  const [trackedTypes, setTrackedTypes] = useState<Set<string>>(new Set());
  const [showUnsetTypes, setShowUnsetTypes] = useState(false);
  const [mode, setMode] = useState<DialogMode>("view");
  const isMobile = useIsMobile();

  // Reset state when dialog opens with new data
  useEffect(() => {
    if (open) {
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
      setShowUnsetTypes(false);
      // Start in view mode if there's existing data, otherwise edit mode for new entries
      setMode(existingActivity ? "view" : "edit");
    }
  }, [open, existingActivity]);

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

    // The onSave callback now handles the mutation via React Query
    onSave(dateStr, activityEntries);
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!onDelete) return;
    onDelete();
    onOpenChange(false);
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

  // For existing entries, separate tracked and untracked types
  const trackedTypesList = allRelevantTypes.filter((type) =>
    trackedTypes.has(type.id)
  );
  const untrackedTypesList = allRelevantTypes.filter(
    (type) => !trackedTypes.has(type.id)
  );

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

  // View mode content
  const viewContent = (
    <>
      <div className="space-y-3 py-4">
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
    </>
  );

  // View mode footer - empty, users can tap overlay/drag to close
  const viewFooter = null;

  // Edit button icon for view mode header
  const editIconButton =
    mode === "view" && existingActivity ? (
      <button
        type="button"
        onClick={() => setMode("edit")}
        className="absolute right-4 top-4 w-8 h-8 rounded-full border-2 border-border hover:border-foreground flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
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

  // Edit mode content
  const editContent = (
    <div className="space-y-4 py-4">
      {activeTypes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No activity types defined yet.</p>
          <p className="text-sm">
            Add activity types in settings to start tracking.
          </p>
        </div>
      ) : isNewEntry ? (
        // For new entries, show all activity types directly (no accordion)
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
            />
          ))}
        </div>
      ) : (
        // For existing entries in edit mode, show tracked first, then accordion for untracked
        <>
          {/* Tracked types */}
          {trackedTypesList.length > 0 && (
            <div className="space-y-3">
              {trackedTypesList.map((type) => (
                <ActivityTypeCard
                  key={type.id}
                  type={type}
                  value={entries[type.id]}
                  isTracked={true}
                  onChange={(value) => handleEntryChange(type.id, value)}
                  onToggleTracked={(tracked) =>
                    handleToggleTracked(type.id, tracked)
                  }
                />
              ))}
            </div>
          )}

          {/* Accordion for untracked types */}
          {untrackedTypesList.length > 0 && (
            <div className={cn(trackedTypesList.length > 0 && "pt-2")}>
              <button
                type="button"
                onClick={() => setShowUnsetTypes(!showUnsetTypes)}
                className="w-full flex items-center justify-between py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>
                  {untrackedTypesList.length} untracked{" "}
                  {untrackedTypesList.length === 1 ? "activity" : "activities"}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn(
                    "transition-transform duration-200",
                    showUnsetTypes && "rotate-180"
                  )}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {showUnsetTypes && (
                <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  {untrackedTypesList.map((type) => (
                    <ActivityTypeCard
                      key={type.id}
                      type={type}
                      value={entries[type.id]}
                      isTracked={false}
                      onChange={(value) => handleEntryChange(type.id, value)}
                      onToggleTracked={(tracked) =>
                        handleToggleTracked(type.id, tracked)
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Show message if no tracked types yet */}
          {trackedTypesList.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No activities logged yet. Expand above to add.
            </div>
          )}
        </>
      )}
    </div>
  );

  const isPending = isSaving || isDeleting;

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
        onClick={() => {
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
          } else {
            onOpenChange(false);
          }
        }}
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
  const footer = mode === "view" ? viewFooter : editFooter;

  // Use Drawer on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <div className="relative">
            <DrawerHeader className="text-left">
              <DrawerTitle>{title}</DrawerTitle>
              <DrawerDescription>{formattedDate}</DrawerDescription>
            </DrawerHeader>
            {editIconButton}
          </div>
          <div className="px-4 overflow-y-auto flex-1">{content}</div>
          {footer && <DrawerFooter className="flex-row">{footer}</DrawerFooter>}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md max-h-[85vh] overflow-y-auto"
        hideCloseButton
      >
        {editIconButton}
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{formattedDate}</DialogDescription>
        </DialogHeader>
        {content}
        {footer && <DialogFooter className="flex-row">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
