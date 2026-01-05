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
import { ActivityType, UIType, ButtonOption, MAX_BUTTON_OPTIONS, MIN_BUTTON_OPTIONS, GoalType, getGoalType, validateButtonOptions } from '@/lib/activityTypes';
import { useActivityTypes } from './ActivityProvider';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import { cn } from '@/lib/utils';

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

  const handleAddNew = () => {
    if (!canAddType) return;
    const newType = createDefaultType({ order: activeTypes.length });
    setEditingType(newType);
    setShowAdvanced(false);
  };

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

        {editingType ? (
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
                onClick={handleAddNew}
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

