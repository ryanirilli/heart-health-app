'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { ActivityType, UIType, ButtonOption, MAX_BUTTON_OPTIONS, MIN_BUTTON_OPTIONS, GoalType, getGoalType, validateButtonOptions, generateActivityTypeId } from '@/lib/activityTypes';
import { useActivityTypes } from './ActivityProvider';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import { cn } from '@/lib/utils';

// Preset activity type definitions
interface PresetActivityType {
  name: string;
  description: string;
  icon: React.ReactNode;
  /** Tailwind classes for icon background and text color */
  colorClasses: { bg: string; text: string };
  getType: (order: number) => Omit<ActivityType, 'id'> & { id?: string };
}

const PRESET_ACTIVITY_TYPES: PresetActivityType[] = [
  {
    name: 'Mood',
    description: 'Track your daily mood',
    colorClasses: { bg: 'bg-amber-500/15', text: 'text-amber-600' },
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
        <line x1="9" x2="9.01" y1="9" y2="9"/>
        <line x1="15" x2="15.01" y1="9" y2="9"/>
      </svg>
    ),
    getType: (order) => ({
      name: 'Mood',
      goalType: 'neutral',
      uiType: 'buttonGroup',
      buttonOptions: [
        { label: 'Bad', value: 1 },
        { label: 'Neutral', value: 2 },
        { label: 'Good', value: 3 },
      ],
      order,
    }),
  },
  {
    name: 'Water Intake',
    description: 'Track hydration (0-5 liters)',
    colorClasses: { bg: 'bg-sky-500/15', text: 'text-sky-600' },
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
      </svg>
    ),
    getType: (order) => ({
      name: 'Water Intake',
      unit: 'liter',
      pluralize: true,
      goalType: 'positive',
      uiType: 'slider',
      minValue: 0,
      maxValue: 5,
      step: 0.5,
      order,
    }),
  },
  {
    name: 'Sleep',
    description: 'Track sleep duration (0-12 hours)',
    colorClasses: { bg: 'bg-indigo-500/15', text: 'text-indigo-600' },
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
      </svg>
    ),
    getType: (order) => ({
      name: 'Sleep',
      unit: 'hour',
      pluralize: true,
      goalType: 'positive',
      uiType: 'slider',
      minValue: 0,
      maxValue: 12,
      step: 0.5,
      order,
    }),
  },
  {
    name: 'Energy',
    description: 'Track energy level (0-100)',
    colorClasses: { bg: 'bg-yellow-500/15', text: 'text-yellow-600' },
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
    getType: (order) => ({
      name: 'Energy',
      unit: 'aura',
      pluralize: false,
      goalType: 'positive',
      uiType: 'slider',
      minValue: 0,
      maxValue: 100,
      step: 5,
      order,
    }),
  },
  {
    name: 'Alcoholic Drinks',
    description: 'Track alcohol consumption',
    colorClasses: { bg: 'bg-rose-500/15', text: 'text-rose-600' },
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 22h8"/>
        <path d="M12 11v11"/>
        <path d="m19 3-7 8-7-8Z"/>
      </svg>
    ),
    getType: (order) => ({
      name: 'Alcoholic Drinks',
      unit: 'drink',
      pluralize: true,
      goalType: 'negative',
      uiType: 'increment',
      order,
    }),
  },
  {
    name: 'Smoking',
    description: 'Track cigarettes smoked',
    colorClasses: { bg: 'bg-slate-500/15', text: 'text-slate-600' },
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 12H2v4h16"/>
        <path d="M22 12v4"/>
        <path d="M7 12v-2a2 2 0 0 1 2-2h0a2 2 0 0 0 2-2v0a2 2 0 0 1 2-2"/>
      </svg>
    ),
    getType: (order) => ({
      name: 'Smoking',
      unit: 'cigarette',
      pluralize: true,
      goalType: 'negative',
      uiType: 'increment',
      order,
    }),
  },
  {
    name: 'Exercise',
    description: 'Track workout duration',
    colorClasses: { bg: 'bg-emerald-500/15', text: 'text-emerald-600' },
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.4 14.4 9.6 9.6"/>
        <path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"/>
        <path d="m21.5 21.5-1.4-1.4"/>
        <path d="M3.9 3.9 2.5 2.5"/>
        <path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z"/>
      </svg>
    ),
    getType: (order) => ({
      name: 'Exercise',
      unit: 'minute',
      pluralize: true,
      goalType: 'positive',
      uiType: 'increment',
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

function SortableOption({ id, option, index, onLabelChange, onDelete }: SortableOptionProps) {
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
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
          <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
        </svg>
      </button>
      <input
        type="text"
        value={option.label}
        onChange={(e) => onLabelChange(e.target.value)}
        placeholder={`Option ${index + 1}`}
        className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        type="button"
        onClick={onDelete}
        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
        title="Delete option"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
      </button>
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
  const validOptionsCount = options.filter(opt => opt.label.trim().length > 0).length;
  const needsMoreOptions = validOptionsCount < MIN_BUTTON_OPTIONS;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = optionIds.indexOf(active.id as string);
      const newIndex = optionIds.indexOf(over.id as string);

      const newOptions = arrayMove(options, oldIndex, newIndex);
      // Update values based on new positions
      newOptions.forEach((opt, i) => { opt.value = i + 1; });
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
    newOptions.forEach((opt, i) => { opt.value = i + 1; });
    onChange(newOptions);
  };

  const handleAdd = () => {
    if (options.length >= MAX_BUTTON_OPTIONS) return;
    onChange([...options, { label: '', value: options.length + 1 }]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">
          Options ({MIN_BUTTON_OPTIONS}-{MAX_BUTTON_OPTIONS} required)
        </label>
        {options.length < MAX_BUTTON_OPTIONS && (
          <button
            type="button"
            onClick={handleAdd}
            className="text-xs text-primary hover:text-primary/80 font-medium"
          >
            + Add Option
          </button>
        )}
      </div>
      
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          Add at least {MIN_BUTTON_OPTIONS} options for users to choose from
        </p>
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={optionIds} strategy={verticalListSortingStrategy}>
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
          {needsMoreOptions && (
            <p className="text-xs text-chart-4">
              {validOptionsCount === 0 
                ? `Enter labels for at least ${MIN_BUTTON_OPTIONS} options`
                : `Need ${MIN_BUTTON_OPTIONS - validOptionsCount} more option${MIN_BUTTON_OPTIONS - validOptionsCount > 1 ? 's' : ''} with a label`}
            </p>
          )}
        </>
      )}
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
  onCancel 
}: CustomTypeFormProps) {
  const [editingType, setEditingType] = useState<ActivityType>(() => 
    createDefaultType({ order: activeTypes.length })
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSave = async () => {
    if (!editingType || !editingType.name.trim()) return;
    
    const needsUnit = editingType.uiType !== 'buttonGroup';
    if (needsUnit && !editingType.unit?.trim()) return;
    
    if (editingType.uiType === 'buttonGroup' && !validateButtonOptions(editingType.buttonOptions)) return;

    try {
      const response = await fetch('/api/activity-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingType),
      });

      if (!response.ok) throw new Error('Failed to save activity type');

      addActivityType(editingType);
      onCancel();
    } catch (error) {
      console.error('Failed to save activity type:', error);
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
        <label className="text-sm font-medium text-foreground">
          Name
        </label>
        <input
          type="text"
          value={editingType.name}
          onChange={(e) => setEditingType({ ...editingType, name: e.target.value })}
          placeholder="e.g., Alcoholic Drinks, Exercise, Water"
          className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Goal Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Goal Type
        </label>
        <p className="text-xs text-muted-foreground">
          {getGoalType(editingType) === 'positive' 
            ? "Higher values are better (e.g., exercise, water intake)"
            : getGoalType(editingType) === 'negative'
              ? "Lower values are better (e.g., reducing alcohol, cutting sugar)"
              : "No judgment, just recording (e.g., mood, sleep quality)"}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditingType({ ...editingType, goalType: 'positive', isNegative: undefined })}
            className={cn(
              "flex-1 py-2 px-2 rounded-lg border-2 text-xs font-medium transition-all",
              getGoalType(editingType) === 'positive'
                ? "border-chart-2 bg-chart-2/10 text-chart-2"
                : "border-border hover:border-muted-foreground/50 text-muted-foreground"
            )}
          >
            More is Better
          </button>
          <button
            type="button"
            onClick={() => setEditingType({ ...editingType, goalType: 'negative', isNegative: undefined })}
            className={cn(
              "flex-1 py-2 px-2 rounded-lg border-2 text-xs font-medium transition-all",
              getGoalType(editingType) === 'negative'
                ? "border-chart-1 bg-chart-1/10 text-chart-1"
                : "border-border hover:border-muted-foreground/50 text-muted-foreground"
            )}
          >
            Less is Better
          </button>
          <button
            type="button"
            onClick={() => setEditingType({ ...editingType, goalType: 'neutral', isNegative: undefined })}
            className={cn(
              "flex-1 py-2 px-2 rounded-lg border-2 text-xs font-medium transition-all",
              getGoalType(editingType) === 'neutral'
                ? "border-chart-3 bg-chart-3/10 text-chart-3"
                : "border-border hover:border-muted-foreground/50 text-muted-foreground"
            )}
          >
            Just Track
          </button>
        </div>
      </div>

      {/* Advanced Settings Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
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
          className={cn("transition-transform", showAdvanced && "rotate-90")}
        >
          <path d="m9 18 6-6-6-6"/>
        </svg>
        Advanced Settings
      </button>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="space-y-4 pl-4 border-l-2 border-border animate-in fade-in slide-in-from-top-2 duration-200">
          {/* UI Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Input Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingType({ ...editingType, uiType: 'increment' })}
                className={cn(
                  "flex-1 py-2 px-2 rounded-lg border-2 text-xs font-medium transition-all",
                  editingType.uiType === 'increment'
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border hover:border-muted-foreground/50 text-muted-foreground"
                )}
              >
                +/- Buttons
              </button>
              <button
                type="button"
                onClick={() => setEditingType({ ...editingType, uiType: 'slider' })}
                className={cn(
                  "flex-1 py-2 px-2 rounded-lg border-2 text-xs font-medium transition-all",
                  editingType.uiType === 'slider'
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border hover:border-muted-foreground/50 text-muted-foreground"
                )}
              >
                Slider
              </button>
              <button
                type="button"
                onClick={() => setEditingType({ ...editingType, uiType: 'buttonGroup' })}
                className={cn(
                  "flex-1 py-2 px-2 rounded-lg border-2 text-xs font-medium transition-all",
                  editingType.uiType === 'buttonGroup'
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border hover:border-muted-foreground/50 text-muted-foreground"
                )}
              >
                Options
              </button>
            </div>
          </div>

          {/* Unit (for increment and slider only) */}
          {(editingType.uiType === 'increment' || editingType.uiType === 'slider') && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Unit
              </label>
              <input
                type="text"
                value={editingType.unit ?? ''}
                onChange={(e) => setEditingType({ ...editingType, unit: e.target.value, pluralize: true })}
                placeholder="e.g., drink, minute, glass"
                className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {/* Range values (for slider) */}
          {editingType.uiType === 'slider' && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Min</label>
                <input
                  type="number"
                  value={editingType.minValue ?? 0}
                  onChange={(e) => setEditingType({ ...editingType, minValue: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Max</label>
                <input
                  type="number"
                  value={editingType.maxValue ?? 10}
                  onChange={(e) => setEditingType({ ...editingType, maxValue: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Step</label>
                <input
                  type="number"
                  value={editingType.step ?? 1}
                  onChange={(e) => setEditingType({ ...editingType, step: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          )}

          {/* Button options (for buttonGroup) */}
          {editingType.uiType === 'buttonGroup' && (
            <ButtonOptionsEditor
              options={editingType.buttonOptions ?? []}
              onChange={(newOptions) => setEditingType({ ...editingType, buttonOptions: newOptions })}
            />
          )}
        </div>
      )}

      <DialogFooter className="flex-row gap-2 pt-4">
        <div className="flex-1" />
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={
            !editingType.name.trim() || 
            (editingType.uiType !== 'buttonGroup' && !editingType.unit?.trim()) ||
            (editingType.uiType === 'buttonGroup' && !validateButtonOptions(editingType.buttonOptions))
          }
          className={cn(
            "px-6 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed",
            "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          Save
        </button>
      </DialogFooter>
    </div>
  );
}

interface ActivityTypeManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivityTypeManager({ open, onOpenChange }: ActivityTypeManagerProps) {
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAddNew, setShowAddNew] = useState(false);

  const handleAddNew = () => {
    if (!canAddType) return;
    const newType = createDefaultType({ order: activeTypes.length });
    setEditingType(newType);
    setShowAdvanced(false);
    setShowAddNew(false);
  };

  const handleAddPreset = async (preset: PresetActivityType) => {
    if (!canAddType) return;
    
    const typeData = preset.getType(activeTypes.length);
    const newType: ActivityType = {
      ...typeData,
      id: generateActivityTypeId(),
    };

    try {
      const response = await fetch('/api/activity-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newType),
      });

      if (!response.ok) throw new Error('Failed to save activity type');

      addActivityType(newType);
      setShowAddNew(false);
    } catch (error) {
      console.error('Failed to add preset activity type:', error);
    }
  };

  // Check which presets are already added (by name)
  const existingPresetNames = new Set(activeTypes.map(t => t.name.toLowerCase()));

  const handleEdit = (type: ActivityType) => {
    setEditingType({ ...type });
    setShowAdvanced(type.uiType === 'slider' || type.uiType === 'buttonGroup');
  };

  const handleSave = async () => {
    if (!editingType || !editingType.name.trim()) return;
    
    // Unit is required for increment and slider, but not for buttonGroup
    const needsUnit = editingType.uiType !== 'buttonGroup';
    if (needsUnit && !editingType.unit?.trim()) return;
    
    // Button options validation for buttonGroup
    if (editingType.uiType === 'buttonGroup' && !validateButtonOptions(editingType.buttonOptions)) return;

    try {
      const isNew = !activeTypes.find(t => t.id === editingType.id);
      
      // Save to API
      const response = await fetch('/api/activity-types', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingType),
      });

      if (!response.ok) throw new Error('Failed to save activity type');

      if (isNew) {
        addActivityType(editingType);
      } else {
        updateActivityType(editingType);
      }
      
      setEditingType(null);
    } catch (error) {
      console.error('Failed to save activity type:', error);
    }
  };

  const handleDelete = async (typeId: string) => {
    try {
      const response = await fetch(`/api/activity-types?id=${typeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete activity type');

      deleteActivityType(typeId);
      setEditingType(null);
    } catch (error) {
      console.error('Failed to delete activity type:', error);
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
            Define what you want to track. You can have up to {maxTypes} activity types.
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
                  const isAlreadyAdded = existingPresetNames.has(preset.name.toLowerCase());
                  return (
                    <button
                      key={preset.name}
                      onClick={() => !isAlreadyAdded && handleAddPreset(preset)}
                      disabled={isAlreadyAdded || !canAddType}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                        isAlreadyAdded
                          ? "border-border/50 bg-muted/30 opacity-50 cursor-not-allowed"
                          : "border-border hover:border-muted-foreground/50 hover:bg-muted/50"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        preset.colorClasses.bg,
                        preset.colorClasses.text
                      )}>
                        {preset.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground">
                          {preset.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {preset.description}
                        </div>
                      </div>
                      {isAlreadyAdded ? (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                          Added
                        </span>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                          <path d="M12 5v14"/>
                          <path d="M5 12h14"/>
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
              <DialogFooter className="pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddNew(false)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back
                </button>
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
              <label className="text-sm font-medium text-foreground">
                Name
              </label>
              <input
                type="text"
                value={editingType.name}
                onChange={(e) => setEditingType({ ...editingType, name: e.target.value })}
                placeholder="e.g., Alcoholic Drinks, Exercise, Water"
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Goal Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Goal Type
              </label>
              <p className="text-xs text-muted-foreground">
                {getGoalType(editingType) === 'positive' 
                  ? "Higher values are better (e.g., exercise, water intake)"
                  : getGoalType(editingType) === 'negative'
                    ? "Lower values are better (e.g., reducing alcohol, cutting sugar)"
                    : "No judgment, just recording (e.g., mood, sleep quality)"}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingType({ ...editingType, goalType: 'positive', isNegative: undefined })}
                  className={cn(
                    "flex-1 py-2 px-2 rounded-lg border-2 text-xs font-medium transition-all",
                    getGoalType(editingType) === 'positive'
                      ? "border-chart-2 bg-chart-2/10 text-chart-2"
                      : "border-border hover:border-muted-foreground/50 text-muted-foreground"
                  )}
                >
                  More is Better
                </button>
                <button
                  type="button"
                  onClick={() => setEditingType({ ...editingType, goalType: 'negative', isNegative: undefined })}
                  className={cn(
                    "flex-1 py-2 px-2 rounded-lg border-2 text-xs font-medium transition-all",
                    getGoalType(editingType) === 'negative'
                      ? "border-chart-1 bg-chart-1/10 text-chart-1"
                      : "border-border hover:border-muted-foreground/50 text-muted-foreground"
                  )}
                >
                  Less is Better
                </button>
                <button
                  type="button"
                  onClick={() => setEditingType({ ...editingType, goalType: 'neutral', isNegative: undefined })}
                  className={cn(
                    "flex-1 py-2 px-2 rounded-lg border-2 text-xs font-medium transition-all",
                    getGoalType(editingType) === 'neutral'
                      ? "border-chart-3 bg-chart-3/10 text-chart-3"
                      : "border-border hover:border-muted-foreground/50 text-muted-foreground"
                  )}
                >
                  Just Track
                </button>
              </div>
            </div>

            {/* Advanced Settings Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
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
                className={cn("transition-transform", showAdvanced && "rotate-90")}
              >
                <path d="m9 18 6-6-6-6"/>
              </svg>
              Advanced Settings
            </button>

            {/* Advanced Settings */}
            {showAdvanced && (
              <div className="space-y-4 pl-4 border-l-2 border-border animate-in fade-in slide-in-from-top-2 duration-200">
                {/* UI Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Input Type
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingType({ ...editingType, uiType: 'increment' })}
                      className={cn(
                        "flex-1 py-2 px-2 rounded-lg border-2 text-xs font-medium transition-all",
                        editingType.uiType === 'increment'
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border hover:border-muted-foreground/50 text-muted-foreground"
                      )}
                    >
                      +/- Buttons
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingType({ ...editingType, uiType: 'slider' })}
                      className={cn(
                        "flex-1 py-2 px-2 rounded-lg border-2 text-xs font-medium transition-all",
                        editingType.uiType === 'slider'
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border hover:border-muted-foreground/50 text-muted-foreground"
                      )}
                    >
                      Slider
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingType({ ...editingType, uiType: 'buttonGroup' })}
                      className={cn(
                        "flex-1 py-2 px-2 rounded-lg border-2 text-xs font-medium transition-all",
                        editingType.uiType === 'buttonGroup'
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border hover:border-muted-foreground/50 text-muted-foreground"
                      )}
                    >
                      Options
                    </button>
                  </div>
                </div>

                {/* Unit (for increment and slider only) */}
                {(editingType.uiType === 'increment' || editingType.uiType === 'slider') && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={editingType.unit ?? ''}
                      onChange={(e) => setEditingType({ ...editingType, unit: e.target.value, pluralize: true })}
                      placeholder="e.g., drink, minute, glass"
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                )}

                {/* Range values (for slider) */}
                {editingType.uiType === 'slider' && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Min</label>
                      <input
                        type="number"
                        value={editingType.minValue ?? 0}
                        onChange={(e) => setEditingType({ ...editingType, minValue: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Max</label>
                      <input
                        type="number"
                        value={editingType.maxValue ?? 10}
                        onChange={(e) => setEditingType({ ...editingType, maxValue: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Step</label>
                      <input
                        type="number"
                        value={editingType.step ?? 1}
                        onChange={(e) => setEditingType({ ...editingType, step: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                )}

                {/* Button options (for buttonGroup) */}
                {editingType.uiType === 'buttonGroup' && (
                  <ButtonOptionsEditor
                    options={editingType.buttonOptions ?? []}
                    onChange={(newOptions) => setEditingType({ ...editingType, buttonOptions: newOptions })}
                  />
                )}
              </div>
            )}

            <DialogFooter className="flex-row gap-2 pt-4">
              {activeTypes.find(t => t.id === editingType.id) && (
                <ConfirmDeleteButton
                  onDelete={() => handleDelete(editingType.id)}
                />
              )}
              <div className="flex-1" />
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={
                  !editingType.name.trim() || 
                  (editingType.uiType !== 'buttonGroup' && !editingType.unit?.trim()) ||
                  (editingType.uiType === 'buttonGroup' && !validateButtonOptions(editingType.buttonOptions))
                }
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                  "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                Save
              </button>
            </DialogFooter>
          </div>
        ) : (
          // Type list
          <div className="space-y-3 py-2">
            {activeTypes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No activity types defined yet.</p>
                <p className="text-sm">Add your first activity type to start tracking.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeTypes.map((type) => {
                  const goalType = getGoalType(type);
                  return (
                    <button
                      key={type.id}
                      onClick={() => handleEdit(type)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-muted-foreground/50 hover:bg-muted/50 transition-all text-left"
                    >
                      <div className={cn(
                        "w-3 h-3 rounded-full",
                        goalType === 'negative' ? "bg-chart-1" : 
                        goalType === 'positive' ? "bg-chart-2" : 
                        "bg-chart-3"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">
                          {type.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {type.uiType !== 'buttonGroup' && type.unit ? `${type.unit} · ` : ''}
                          {goalType === 'negative' ? 'Less is better' : 
                           goalType === 'positive' ? 'More is better' : 
                           'Just tracking'} · {
                            type.uiType === 'slider' ? 'Slider' : 
                            type.uiType === 'buttonGroup' ? 'Options' : 
                            '+/- buttons'
                          }
                        </div>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                        <path d="m9 18 6-6-6-6"/>
                      </svg>
                    </button>
                  );
                })}
              </div>
            )}

            <DialogFooter className="pt-4">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setShowAddNew(true)}
                disabled={!canAddType}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                  "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                Add Activity Type
              </button>
            </DialogFooter>
            
            {!canAddType && (
              <p className="text-xs text-center text-muted-foreground">
                Maximum of {maxTypes} activity types reached. Delete one to add more.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

