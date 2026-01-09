"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ActivityType,
  ButtonOption,
  MAX_BUTTON_OPTIONS,
  MIN_BUTTON_OPTIONS,
  getGoalType,
  validateButtonOptions,
  generateActivityTypeId,
} from "@/lib/activityTypes";
import { useActivityTypes } from "./ActivityProvider";
import { AddButton } from "./DayView";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  GripVertical,
  X,
  ChevronRight,
  Plus,
  Check,
  ArrowLeft,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Preset activity type definitions
interface PresetActivityType {
  name: string;
  description: string;
  icon: React.ReactNode;
  /** Tailwind classes for icon background and text color */
  colorClasses: { bg: string; text: string };
  getType: (order: number) => Omit<ActivityType, "id"> & { id?: string };
}

const PRESET_ACTIVITY_TYPES: PresetActivityType[] = [
  {
    name: "Mood",
    description: "Track your daily mood",
    colorClasses: { bg: "bg-amber-500/15", text: "text-amber-600" },
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" x2="9.01" y1="9" y2="9" />
        <line x1="15" x2="15.01" y1="9" y2="9" />
      </svg>
    ),
    getType: (order) => ({
      name: "Mood",
      goalType: "neutral",
      uiType: "buttonGroup",
      buttonOptions: [
        { label: "Bad", value: 1 },
        { label: "Neutral", value: 2 },
        { label: "Good", value: 3 },
      ],
      order,
    }),
  },
  {
    name: "Water Intake",
    description: "Track hydration (0-5 liters)",
    colorClasses: { bg: "bg-sky-500/15", text: "text-sky-600" },
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      </svg>
    ),
    getType: (order) => ({
      name: "Water Intake",
      unit: "liter",
      pluralize: true,
      goalType: "positive",
      uiType: "slider",
      minValue: 0,
      maxValue: 5,
      step: 0.5,
      order,
    }),
  },
  {
    name: "Sleep",
    description: "Track sleep duration (0-12 hours)",
    colorClasses: { bg: "bg-indigo-500/15", text: "text-indigo-600" },
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    ),
    getType: (order) => ({
      name: "Sleep",
      unit: "hour",
      pluralize: true,
      goalType: "positive",
      uiType: "slider",
      minValue: 0,
      maxValue: 12,
      step: 0.5,
      order,
    }),
  },
  {
    name: "Energy",
    description: "Track energy level (0-100)",
    colorClasses: { bg: "bg-yellow-500/15", text: "text-yellow-600" },
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    getType: (order) => ({
      name: "Energy",
      unit: "aura",
      pluralize: false,
      goalType: "positive",
      uiType: "slider",
      minValue: 0,
      maxValue: 100,
      step: 5,
      order,
    }),
  },
  {
    name: "Alcoholic Drinks",
    description: "Track alcohol consumption",
    colorClasses: { bg: "bg-rose-500/15", text: "text-rose-600" },
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 22h8" />
        <path d="M12 11v11" />
        <path d="m19 3-7 8-7-8Z" />
      </svg>
    ),
    getType: (order) => ({
      name: "Alcoholic Drinks",
      unit: "drink",
      pluralize: true,
      goalType: "negative",
      uiType: "increment",
      order,
    }),
  },
  {
    name: "Smoking",
    description: "Track cigarettes smoked",
    colorClasses: { bg: "bg-slate-500/15", text: "text-slate-600" },
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 12H2v4h16" />
        <path d="M22 12v4" />
        <path d="M7 12v-2a2 2 0 0 1 2-2h0a2 2 0 0 0 2-2v0a2 2 0 0 1 2-2" />
      </svg>
    ),
    getType: (order) => ({
      name: "Smoking",
      unit: "cigarette",
      pluralize: true,
      goalType: "negative",
      uiType: "increment",
      order,
    }),
  },
  {
    name: "Exercise",
    description: "Track workout duration (0-3 hours)",
    colorClasses: { bg: "bg-emerald-500/15", text: "text-emerald-600" },
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14.4 14.4 9.6 9.6" />
        <path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z" />
        <path d="m21.5 21.5-1.4-1.4" />
        <path d="M3.9 3.9 2.5 2.5" />
        <path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z" />
      </svg>
    ),
    getType: (order) => ({
      name: "Exercise",
      unit: "minute",
      pluralize: true,
      goalType: "positive",
      uiType: "slider",
      minValue: 0,
      maxValue: 180,
      step: 15,
      order,
    }),
  },
];

interface SortableOptionProps {
  id: string;
  option: ButtonOption;
  index: number;
  onLabelChange: (label: string) => void;
  onDelete: () => void;
}

function SortableOption({
  id,
  option,
  index,
  onLabelChange,
  onDelete,
}: SortableOptionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 group",
        isDragging && "opacity-50"
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        type="text"
        value={option.label}
        onChange={(e) => onLabelChange(e.target.value)}
        placeholder={`Option ${index + 1}`}
        className="flex-1 h-8"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onDelete}
        className="text-muted-foreground hover:text-destructive"
        title="Delete option"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface ButtonOptionsEditorProps {
  options: ButtonOption[];
  onChange: (options: ButtonOption[]) => void;
}

function ButtonOptionsEditor({ options, onChange }: ButtonOptionsEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Generate stable IDs for sortable items
  const optionIds = options.map((_, index) => `option-${index}`);

  // Count valid options (non-empty labels)
  const validOptionsCount = options.filter(
    (opt) => opt.label.trim().length > 0
  ).length;
  const needsMoreOptions = validOptionsCount < MIN_BUTTON_OPTIONS;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = optionIds.indexOf(active.id as string);
      const newIndex = optionIds.indexOf(over.id as string);

      const newOptions = arrayMove(options, oldIndex, newIndex);
      // Update values based on new positions
      newOptions.forEach((opt, i) => {
        opt.value = i + 1;
      });
      onChange(newOptions);
    }
  };

  const handleLabelChange = (index: number, label: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], label };
    onChange(newOptions);
  };

  const handleDelete = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    // Update values based on new positions
    newOptions.forEach((opt, i) => {
      opt.value = i + 1;
    });
    onChange(newOptions);
  };

  const handleAdd = () => {
    if (options.length >= MAX_BUTTON_OPTIONS) return;
    onChange([...options, { label: "", value: options.length + 1 }]);
  };

  return (
    <div className="space-y-3">
      {needsMoreOptions && options.length != 0 && (
        <p className="text-xs text-chart-4">
          {validOptionsCount === 0
            ? `Enter labels for at least ${MIN_BUTTON_OPTIONS} options`
            : `Need ${MIN_BUTTON_OPTIONS - validOptionsCount} more option${
                MIN_BUTTON_OPTIONS - validOptionsCount > 1 ? "s" : ""
              } with a label`}
        </p>
      )}
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground text-left py-2">
          Add at least {MIN_BUTTON_OPTIONS} options to choose from
        </p>
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={optionIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {options.map((option, index) => (
                  <SortableOption
                    key={optionIds[index]}
                    id={optionIds[index]}
                    option={option}
                    index={index}
                    onLabelChange={(label) => handleLabelChange(index, label)}
                    onDelete={() => handleDelete(index)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}
      <div className="flex items-center justify-left">
        {options.length < MAX_BUTTON_OPTIONS && (
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={handleAdd}
            className="h-auto p-0 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Option
          </Button>
        )}
      </div>
    </div>
  );
}

interface CustomTypeFormProps {
  canAddType: boolean;
  createDefaultType: (partial?: Partial<ActivityType>) => ActivityType;
  activeTypes: ActivityType[];
  addActivityType: (type: ActivityType) => void;
  onCancel: () => void;
}

function CustomTypeForm({
  canAddType,
  createDefaultType,
  activeTypes,
  addActivityType,
  onCancel,
}: CustomTypeFormProps) {
  const [editingType, setEditingType] = useState<ActivityType>(() =>
    createDefaultType({ order: activeTypes.length })
  );

  const handleSave = async () => {
    if (!editingType || !editingType.name.trim()) return;

    const needsUnit =
      editingType.uiType !== "buttonGroup" && editingType.uiType !== "toggle";
    if (needsUnit && !editingType.unit?.trim()) return;

    if (
      editingType.uiType === "buttonGroup" &&
      !validateButtonOptions(editingType.buttonOptions)
    )
      return;

    try {
      const response = await fetch("/api/activity-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingType),
      });

      if (!response.ok) throw new Error("Failed to save activity type");

      addActivityType(editingType);
      onCancel();
    } catch (error) {
      console.error("Failed to save activity type:", error);
    }
  };

  if (!canAddType) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>Maximum activity types reached.</p>
        <p className="text-sm">Delete one to add more.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      {/* Name */}
      <div className="space-y-2">
        <Label>Name</Label>
        <Input
          type="text"
          value={editingType.name}
          onChange={(e) =>
            setEditingType({ ...editingType, name: e.target.value })
          }
          placeholder="e.g., Alcoholic Drinks, Exercise, Water"
        />
      </div>

      {/* Goal Type */}
      <div className="space-y-2">
        <Label>Goal Type</Label>
        <p className="text-xs text-muted-foreground">
          {getGoalType(editingType) === "positive"
            ? "Higher values are better (e.g., exercise, water intake)"
            : getGoalType(editingType) === "negative"
            ? "Lower values are better (e.g., reducing alcohol, cutting sugar)"
            : "No judgment, just recording (e.g., mood, sleep quality)"}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setEditingType({
                ...editingType,
                goalType: "positive",
                isNegative: undefined,
              })
            }
            className={cn(
              "flex-1 text-xs",
              getGoalType(editingType) === "positive" &&
                "border-chart-2 bg-chart-2/10 text-chart-2 hover:bg-chart-2/20"
            )}
          >
            More is Better
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setEditingType({
                ...editingType,
                goalType: "negative",
                isNegative: undefined,
              })
            }
            className={cn(
              "flex-1 text-xs",
              getGoalType(editingType) === "negative" &&
                "border-chart-1 bg-chart-1/10 text-chart-1 hover:bg-chart-1/20"
            )}
          >
            Less is Better
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setEditingType({
                ...editingType,
                goalType: "neutral",
                isNegative: undefined,
              })
            }
            className={cn(
              "flex-1 text-xs",
              getGoalType(editingType) === "neutral" &&
                "border-chart-3 bg-chart-3/10 text-chart-3 hover:bg-chart-3/20"
            )}
          >
            Just Track
          </Button>
        </div>
      </div>

      {/* Advanced Settings */}
      <Accordion type="single" collapsible>
        <AccordionItem value="advanced">
          <AccordionTrigger>Advanced Settings</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {/* UI Type */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Input Type
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditingType({ ...editingType, uiType: "increment" })
                    }
                    className={cn(
                      "flex-1 text-xs",
                      editingType.uiType === "increment" &&
                        "border-primary bg-primary/10"
                    )}
                  >
                    +/- Buttons
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditingType({ ...editingType, uiType: "slider" })
                    }
                    className={cn(
                      "flex-1 text-xs",
                      editingType.uiType === "slider" &&
                        "border-primary bg-primary/10"
                    )}
                  >
                    Slider
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditingType({ ...editingType, uiType: "buttonGroup" })
                    }
                    className={cn(
                      "flex-1 text-xs",
                      editingType.uiType === "buttonGroup" &&
                        "border-primary bg-primary/10"
                    )}
                  >
                    Options
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditingType({ ...editingType, uiType: "toggle" })
                    }
                    className={cn(
                      "flex-1 text-xs",
                      editingType.uiType === "toggle" &&
                        "border-primary bg-primary/10"
                    )}
                  >
                    Yes/No
                  </Button>
                </div>
              </div>

              {/* Unit (for increment and slider only) */}
              {(editingType.uiType === "increment" ||
                editingType.uiType === "slider") && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Unit</Label>
                  <Input
                    type="text"
                    value={editingType.unit ?? ""}
                    onChange={(e) =>
                      setEditingType({
                        ...editingType,
                        unit: e.target.value,
                        pluralize: true,
                      })
                    }
                    placeholder="e.g., drink, minute, glass"
                    className="h-8"
                  />
                </div>
              )}

              {/* Range values (for slider) */}
              {editingType.uiType === "slider" && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Min</Label>
                    <Input
                      type="number"
                      value={editingType.minValue ?? 0}
                      onChange={(e) =>
                        setEditingType({
                          ...editingType,
                          minValue: Number(e.target.value),
                        })
                      }
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Max</Label>
                    <Input
                      type="number"
                      value={editingType.maxValue ?? 10}
                      onChange={(e) =>
                        setEditingType({
                          ...editingType,
                          maxValue: Number(e.target.value),
                        })
                      }
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Step
                    </Label>
                    <Input
                      type="number"
                      value={editingType.step ?? 1}
                      onChange={(e) =>
                        setEditingType({
                          ...editingType,
                          step: Number(e.target.value),
                        })
                      }
                      className="h-8"
                    />
                  </div>
                </div>
              )}

              {/* Button options (for buttonGroup) */}
              {editingType.uiType === "buttonGroup" && (
                <ButtonOptionsEditor
                  options={editingType.buttonOptions ?? []}
                  onChange={(newOptions) =>
                    setEditingType({
                      ...editingType,
                      buttonOptions: newOptions,
                    })
                  }
                />
              )}

              {/* Toggle type info */}
              {editingType.uiType === "toggle" && (
                <p className="text-xs text-muted-foreground">
                  A simple Yes/No toggle for binary tracking
                </p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <DialogFooter className="flex-row gap-2 pt-4">
        <div className="flex-1" />
        <Button variant="muted" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="pill"
          onClick={handleSave}
          disabled={
            !editingType.name.trim() ||
            (editingType.uiType !== "buttonGroup" &&
              editingType.uiType !== "toggle" &&
              !editingType.unit?.trim()) ||
            (editingType.uiType === "buttonGroup" &&
              !validateButtonOptions(editingType.buttonOptions))
          }
        >
          Save
        </Button>
      </DialogFooter>
    </div>
  );
}

interface ActivityTypeManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If true, opens directly to the "add new" view */
  startInAddMode?: boolean;
}

export function ActivityTypeManager({
  open,
  onOpenChange,
  startInAddMode = false,
}: ActivityTypeManagerProps) {
  const {
    activeTypes,
    canAddType,
    addActivityType,
    updateActivityType,
    deleteActivityType,
    maxTypes,
    createDefaultType,
  } = useActivityTypes();

  const [editingType, setEditingType] = useState<ActivityType | null>(null);
  const [showAddNew, setShowAddNew] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  const [addingPreset, setAddingPreset] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open && !wasOpen) {
      // Dialog just opened
      setShowAddNew(startInAddMode);
      setEditingType(null);
    }
    setWasOpen(open);
  }, [open, startInAddMode, wasOpen]);

  const handleAddNew = () => {
    if (!canAddType) return;
    const newType = createDefaultType({ order: activeTypes.length });
    setEditingType(newType);
    setShowAddNew(false);
  };

  const handleAddPreset = async (preset: PresetActivityType) => {
    if (!canAddType || addingPreset) return;

    setAddingPreset(preset.name);

    const typeData = preset.getType(activeTypes.length);
    const newType: ActivityType = {
      ...typeData,
      id: generateActivityTypeId(),
    };

    try {
      const response = await fetch("/api/activity-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newType),
      });

      if (!response.ok) throw new Error("Failed to save activity type");

      addActivityType(newType);
      // Stay on the presets screen so user can add more
    } catch (error) {
      console.error("Failed to add preset activity type:", error);
    } finally {
      setAddingPreset(null);
    }
  };

  // Check which presets are already added (by name)
  const existingPresetNames = new Set(
    activeTypes.map((t) => t.name.toLowerCase())
  );

  const handleEdit = (type: ActivityType) => {
    setEditingType({ ...type });
  };

  const handleSave = async () => {
    if (!editingType || !editingType.name.trim()) return;

    // Unit is required for increment and slider, but not for buttonGroup or toggle
    const needsUnit =
      editingType.uiType !== "buttonGroup" && editingType.uiType !== "toggle";
    if (needsUnit && !editingType.unit?.trim()) return;

    // Button options validation for buttonGroup
    if (
      editingType.uiType === "buttonGroup" &&
      !validateButtonOptions(editingType.buttonOptions)
    )
      return;

    try {
      const isNew = !activeTypes.find((t) => t.id === editingType.id);

      // Save to API
      const response = await fetch("/api/activity-types", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingType),
      });

      if (!response.ok) throw new Error("Failed to save activity type");

      if (isNew) {
        addActivityType(editingType);
      } else {
        updateActivityType(editingType);
      }

      setEditingType(null);
    } catch (error) {
      console.error("Failed to save activity type:", error);
    }
  };

  const handleDelete = async (typeId: string) => {
    try {
      const response = await fetch(`/api/activity-types?id=${typeId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete activity type");

      deleteActivityType(typeId);
      setEditingType(null);
    } catch (error) {
      console.error("Failed to delete activity type:", error);
    }
  };

  const handleCancel = () => {
    setEditingType(null);
    setShowAddNew(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Activity Types</DialogTitle>
          <DialogDescription>
            Define what you want to track. You can have up to {maxTypes}{" "}
            activity types.
          </DialogDescription>
        </DialogHeader>

        {showAddNew ? (
          // Add new activity type with tabs
          <Tabs defaultValue="presets" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="presets">Presets</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>
            <TabsContent value="presets" className="space-y-3 py-4">
              <p className="text-sm text-muted-foreground">
                Quick-add a common activity type
              </p>
              <div className="space-y-2">
                {PRESET_ACTIVITY_TYPES.map((preset) => {
                  const isAlreadyAdded = existingPresetNames.has(
                    preset.name.toLowerCase()
                  );
                  const isLoading = addingPreset === preset.name;
                  const isDisabled =
                    isAlreadyAdded || !canAddType || !!addingPreset;
                  return (
                    <button
                      key={preset.name}
                      onClick={() => !isDisabled && handleAddPreset(preset)}
                      disabled={isDisabled}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                        isAlreadyAdded
                          ? "bg-muted/30 opacity-50 cursor-not-allowed"
                          : isLoading
                          ? "bg-muted/70 animate-pulse cursor-wait"
                          : isDisabled
                          ? "bg-muted/50 opacity-60 cursor-not-allowed"
                          : "bg-muted/70 hover:bg-muted"
                      )}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center transition-opacity",
                          preset.colorClasses.bg,
                          preset.colorClasses.text,
                          isLoading && "opacity-70"
                        )}
                      >
                        {preset.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={cn(
                            "font-medium text-foreground transition-opacity",
                            isLoading && "opacity-70"
                          )}
                        >
                          {preset.name}
                        </div>
                        <div
                          className={cn(
                            "text-xs text-muted-foreground transition-opacity",
                            isLoading && "opacity-70"
                          )}
                        >
                          {preset.description}
                        </div>
                      </div>
                      {isAlreadyAdded ? (
                        <Check className="h-5 w-5 text-chart-2" />
                      ) : isLoading ? (
                        <svg
                          className="animate-spin h-5 w-5 text-muted-foreground"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      ) : (
                        <Plus className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
              <DialogFooter className="pt-4 sm:justify-start">
                <Button
                  variant="outline"
                  size="pill"
                  onClick={() => setShowAddNew(false)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </DialogFooter>
            </TabsContent>
            <TabsContent value="custom">
              <CustomTypeForm
                canAddType={canAddType}
                createDefaultType={createDefaultType}
                activeTypes={activeTypes}
                addActivityType={addActivityType}
                onCancel={() => setShowAddNew(false)}
              />
            </TabsContent>
          </Tabs>
        ) : editingType ? (
          // Edit form
          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                type="text"
                value={editingType.name}
                onChange={(e) =>
                  setEditingType({ ...editingType, name: e.target.value })
                }
                placeholder="e.g., Alcoholic Drinks, Exercise, Water"
              />
            </div>

            {/* Goal Type */}
            <div className="space-y-2">
              <Label>Goal Type</Label>
              <p className="text-xs text-muted-foreground">
                {getGoalType(editingType) === "positive"
                  ? "Higher values are better (e.g., exercise, water intake)"
                  : getGoalType(editingType) === "negative"
                  ? "Lower values are better (e.g., reducing alcohol, cutting sugar)"
                  : "No judgment, just recording (e.g., mood, sleep quality)"}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditingType({
                      ...editingType,
                      goalType: "positive",
                      isNegative: undefined,
                    })
                  }
                  className={cn(
                    "flex-1 text-xs",
                    getGoalType(editingType) === "positive" &&
                      "border-chart-2 bg-chart-2/10 text-chart-2 hover:bg-chart-2/20"
                  )}
                >
                  More is Better
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditingType({
                      ...editingType,
                      goalType: "negative",
                      isNegative: undefined,
                    })
                  }
                  className={cn(
                    "flex-1 text-xs",
                    getGoalType(editingType) === "negative" &&
                      "border-chart-1 bg-chart-1/10 text-chart-1 hover:bg-chart-1/20"
                  )}
                >
                  Less is Better
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditingType({
                      ...editingType,
                      goalType: "neutral",
                      isNegative: undefined,
                    })
                  }
                  className={cn(
                    "flex-1 text-xs",
                    getGoalType(editingType) === "neutral" &&
                      "border-chart-3 bg-chart-3/10 text-chart-3 hover:bg-chart-3/20"
                  )}
                >
                  Just Track
                </Button>
              </div>
            </div>

            {/* Advanced Settings */}
            <Accordion type="single" collapsible>
              <AccordionItem value="advanced">
                <AccordionTrigger>Advanced Settings</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    {/* UI Type */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Input Type
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setEditingType({
                              ...editingType,
                              uiType: "increment",
                            })
                          }
                          className={cn(
                            "flex-1 text-xs",
                            editingType.uiType === "increment" &&
                              "border-primary bg-primary/10"
                          )}
                        >
                          +/- Buttons
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setEditingType({ ...editingType, uiType: "slider" })
                          }
                          className={cn(
                            "flex-1 text-xs",
                            editingType.uiType === "slider" &&
                              "border-primary bg-primary/10"
                          )}
                        >
                          Slider
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setEditingType({
                              ...editingType,
                              uiType: "buttonGroup",
                            })
                          }
                          className={cn(
                            "flex-1 text-xs",
                            editingType.uiType === "buttonGroup" &&
                              "border-primary bg-primary/10"
                          )}
                        >
                          Options
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setEditingType({
                              ...editingType,
                              uiType: "toggle",
                            })
                          }
                          className={cn(
                            "flex-1 text-xs",
                            editingType.uiType === "toggle" &&
                              "border-primary bg-primary/10"
                          )}
                        >
                          Yes/No
                        </Button>
                      </div>
                    </div>

                    {/* Unit (for increment and slider only, not buttonGroup or toggle) */}
                    {(editingType.uiType === "increment" ||
                      editingType.uiType === "slider") && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Unit
                        </Label>
                        <Input
                          type="text"
                          value={editingType.unit ?? ""}
                          onChange={(e) =>
                            setEditingType({
                              ...editingType,
                              unit: e.target.value,
                              pluralize: true,
                            })
                          }
                          placeholder="e.g., drink, minute, glass"
                          className="h-8"
                        />
                      </div>
                    )}

                    {/* Toggle type info */}
                    {editingType.uiType === "toggle" && (
                      <p className="text-xs text-muted-foreground">
                        A simple Yes/No toggle for binary tracking
                      </p>
                    )}

                    {/* Range values (for slider) */}
                    {editingType.uiType === "slider" && (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Min
                          </Label>
                          <Input
                            type="number"
                            value={editingType.minValue ?? 0}
                            onChange={(e) =>
                              setEditingType({
                                ...editingType,
                                minValue: Number(e.target.value),
                              })
                            }
                            className="h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Max
                          </Label>
                          <Input
                            type="number"
                            value={editingType.maxValue ?? 10}
                            onChange={(e) =>
                              setEditingType({
                                ...editingType,
                                maxValue: Number(e.target.value),
                              })
                            }
                            className="h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Step
                          </Label>
                          <Input
                            type="number"
                            value={editingType.step ?? 1}
                            onChange={(e) =>
                              setEditingType({
                                ...editingType,
                                step: Number(e.target.value),
                              })
                            }
                            className="h-8"
                          />
                        </div>
                      </div>
                    )}

                    {/* Button options (for buttonGroup) */}
                    {editingType.uiType === "buttonGroup" && (
                      <ButtonOptionsEditor
                        options={editingType.buttonOptions ?? []}
                        onChange={(newOptions) =>
                          setEditingType({
                            ...editingType,
                            buttonOptions: newOptions,
                          })
                        }
                      />
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <DialogFooter className="flex-row gap-2 pt-4">
              {activeTypes.find((t) => t.id === editingType.id) && (
                <ConfirmDeleteButton
                  onDelete={() => handleDelete(editingType.id)}
                />
              )}
              <div className="flex-1" />
              <Button variant="muted" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                size="pill"
                onClick={handleSave}
                disabled={
                  !editingType.name.trim() ||
                  (editingType.uiType !== "buttonGroup" &&
                    editingType.uiType !== "toggle" &&
                    !editingType.unit?.trim()) ||
                  (editingType.uiType === "buttonGroup" &&
                    !validateButtonOptions(editingType.buttonOptions))
                }
              >
                Save
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // Type list
          <div className="space-y-3 py-2">
            {activeTypes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No activity types defined yet.</p>
                <p className="text-sm">
                  Add your first activity type to start tracking.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeTypes.map((type) => {
                  const goalType = getGoalType(type);
                  return (
                    <button
                      key={type.id}
                      onClick={() => handleEdit(type)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/70 hover:bg-muted transition-all text-left"
                    >
                      <div
                        className={cn(
                          "w-3 h-3 rounded-full",
                          goalType === "negative"
                            ? "bg-chart-1"
                            : goalType === "positive"
                            ? "bg-chart-2"
                            : "bg-chart-3"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">
                          {type.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {type.uiType !== "buttonGroup" &&
                          type.uiType !== "toggle" &&
                          type.unit
                            ? `${type.unit} · `
                            : ""}
                          {goalType === "negative"
                            ? "Less is better"
                            : goalType === "positive"
                            ? "More is better"
                            : "Just tracking"}{" "}
                          ·{" "}
                          {type.uiType === "slider"
                            ? "Slider"
                            : type.uiType === "buttonGroup"
                            ? "Options"
                            : type.uiType === "toggle"
                            ? "Yes/No"
                            : "+/- buttons"}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            )}
            {canAddType && (
              <AddButton onClick={() => setShowAddNew(true)} className="py-3" />
            )}
            {!canAddType && (
              <p className="text-xs text-left text-muted-foreground">
                Maximum of {maxTypes} activity types reached. Delete one to add
                more.
              </p>
            )}
            <DialogFooter className="pt-4">
              <Button size="pill" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
