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
import { useActivityTypes, useActivities } from "./ActivityProvider";
import { useGoals } from "@/components/Goals";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";
import { formatDialogDate } from "./ActivityFormContent";
import { DayContentView, DayContentEdit } from "./DayContent";
import { Button } from "@/components/ui/button";
import { Pencil, Loader2 } from "lucide-react";

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
  const { activeTypes, activityTypes, openSettingsToAdd } = useActivityTypes();
  const { activities } = useActivities();
  const { goals } = useGoals();
  const [entries, setEntries] = useState<{
    [typeId: string]: number | undefined;
  }>({});
  const [trackedTypes, setTrackedTypes] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<DialogMode>("view");
  const isMobile = useIsMobile();

  const dateStr = formatDate(date);

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
    } else {
      onOpenChange(false);
    }
  };

  const formattedDate = formatDialogDate(date);
  const isPending = isSaving || isDeleting;
  const title = mode === "view" ? "Activity Summary" : "Log Activity";

  // View mode content using shared component
  const viewContent = (
    <div className="py-4">
      <DayContentView
        dateStr={dateStr}
        activity={existingActivity}
        activityTypes={activityTypes}
        goals={goals}
        onEditClick={() => setMode("edit")}
        fullBleedBorder={true}
        allActivities={activities}
      />
    </div>
  );

  // Edit mode content using shared component
  const editContent = (
    <div className="space-y-4 py-4">
      <DayContentEdit
        dateStr={dateStr}
        activity={existingActivity}
        activeTypes={activeTypes}
        activityTypes={activityTypes}
        entries={entries}
        trackedTypes={trackedTypes}
        onEntryChange={handleEntryChange}
        onToggleTracked={handleToggleTracked}
        onOpenSettings={() => {
          onOpenChange(false);
          openSettingsToAdd();
        }}
      />
    </div>
  );

  // Edit button icon for view mode header
  const editIconButton =
    mode === "view" && existingActivity ? (
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => setMode("edit")}
        className="absolute right-4 top-4"
        aria-label="Edit activity"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
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
      <Button
        variant="muted"
        size="sm"
        onClick={handleCancel}
        disabled={isPending}
      >
        Cancel
      </Button>
      <Button
        size="pill"
        onClick={handleSave}
        disabled={activeTypes.length === 0 || isPending}
      >
        {isSaving ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </span>
        ) : (
          "Save"
        )}
      </Button>
    </div>
  );

  const content = mode === "view" ? viewContent : editContent;
  // Hide footer when there are no activity types (show CTA instead) or in view mode
  const footer = mode === "view" ? null : activeTypes.length === 0 ? null : editFooter;

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
