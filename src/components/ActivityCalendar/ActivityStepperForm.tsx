'use client';

import { useState, useEffect } from 'react';
import { Check, Plus, Target, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Stepper,
  StepIndicator,
  StepContent,
  StepItem,
  StepNavigation,
  useStepper,
  Step,
} from '@/components/ui/stepper';
import { cn } from '@/lib/utils';
import {
  ActivityType,
  UIType,
  GoalType,
  createDefaultActivityType,
  validateButtonOptions,
  ButtonOption,
  MAX_BUTTON_OPTIONS,
  MIN_BUTTON_OPTIONS,
} from '@/lib/activityTypes';
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
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface ActivityFormData extends ActivityType {}

export interface ActivityStepperFormProps {
  initialData?: Partial<ActivityType>;
  onSave: (activityType: ActivityType) => void;
  onSaveWithGoal: (activityType: ActivityType) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

// Steps for activity creation
const ACTIVITY_STEPS: Step[] = [
  { id: 'basics', title: 'Activity Basics', description: 'Name your activity' },
  { id: 'input-type', title: 'Input Type', description: 'How will you log this?' },
  { id: 'configuration', title: 'Configuration', description: 'Set up the details' },
  { id: 'summary', title: 'Review', description: 'Review and save' },
];

// UI Type options with descriptions
const UI_TYPE_OPTIONS: { type: UIType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    type: 'toggle',
    label: 'Yes/No',
    description: 'Simple binary toggle (e.g., did it or not)',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="6" width="22" height="12" rx="6" />
        <circle cx="17" cy="12" r="4" fill="currentColor" />
      </svg>
    ),
  },
  {
    type: 'fixedValue',
    label: 'Fixed Value',
    description: 'Always logs the same value (e.g., "10 pushups")',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 12h6" />
        <path d="M12 9v6" />
      </svg>
    ),
  },
  {
    type: 'slider',
    label: 'Slider',
    description: 'Drag to set a value in a range (e.g., mood, energy)',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="4" y1="12" x2="20" y2="12" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
      </svg>
    ),
  },
  {
    type: 'buttonGroup',
    label: 'Options',
    description: 'Choose from predefined options (e.g., good/bad/okay)',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    type: 'increment',
    label: '+/- Buttons',
    description: 'Tap to count up or down (e.g., drinks, reps)',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="8" y1="12" x2="16" y2="12" />
        <line x1="12" y1="8" x2="12" y2="16" />
      </svg>
    ),
  },
];

// =============================================================================
// SORTABLE BUTTON OPTION (for buttonGroup configuration)
// =============================================================================

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

// =============================================================================
// BUTTON OPTIONS EDITOR
// =============================================================================

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

  const optionIds = options.map((_, index) => `option-${index}`);
  const validOptionsCount = options.filter((opt) => opt.label.trim().length > 0).length;
  const needsMoreOptions = validOptionsCount < MIN_BUTTON_OPTIONS;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = optionIds.indexOf(active.id as string);
      const newIndex = optionIds.indexOf(over.id as string);
      const newOptions = arrayMove(options, oldIndex, newIndex);
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
    newOptions.forEach((opt, i) => { opt.value = i + 1; });
    onChange(newOptions);
  };

  const handleAdd = () => {
    if (options.length >= MAX_BUTTON_OPTIONS) return;
    onChange([...options, { label: "", value: options.length + 1 }]);
  };

  return (
    <div className="space-y-3">
      {needsMoreOptions && options.length !== 0 && (
        <p className="text-xs text-chart-4">
          {validOptionsCount === 0
            ? `Enter labels for at least ${MIN_BUTTON_OPTIONS} options`
            : `Need ${MIN_BUTTON_OPTIONS - validOptionsCount} more option${MIN_BUTTON_OPTIONS - validOptionsCount > 1 ? "s" : ""} with a label`}
        </p>
      )}
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground text-left py-2">
          Add at least {MIN_BUTTON_OPTIONS} options to choose from
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
      )}
      <div className="flex items-center justify-left">
        {options.length < MAX_BUTTON_OPTIONS && (
          <Button type="button" variant="link" size="sm" onClick={handleAdd} className="h-auto p-0 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Add Option
          </Button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN STEPPER FORM
// =============================================================================

export function ActivityStepperForm({
  initialData,
  onSave,
  onSaveWithGoal,
  onCancel,
  isSubmitting = false,
}: ActivityStepperFormProps) {
  const [formData, setFormData] = useState<ActivityFormData>(() =>
    createDefaultActivityType(initialData)
  );

  return (
    <Stepper steps={ACTIVITY_STEPS} initialStep={0} className="flex-1 min-h-0 flex flex-col">
      <ActivityFormContent
        formData={formData}
        setFormData={setFormData}
        onSave={onSave}
        onSaveWithGoal={onSaveWithGoal}
        onCancel={onCancel}
        isSubmitting={isSubmitting}
      />
    </Stepper>
  );
}

// =============================================================================
// FORM CONTENT (uses stepper context)
// =============================================================================

interface ActivityFormContentProps {
  formData: ActivityFormData;
  setFormData: (data: ActivityFormData) => void;
  onSave: (activityType: ActivityType) => void;
  onSaveWithGoal: (activityType: ActivityType) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function ActivityFormContent({
  formData,
  setFormData,
  onSave,
  onSaveWithGoal,
  onCancel,
  isSubmitting,
}: ActivityFormContentProps) {
  const { currentStep, setCanGoNext, isLastStep, prevStep } = useStepper();

  // Validate current step and update canGoNext
  useEffect(() => {
    let canProceed = true;

    switch (currentStep) {
      case 0: // Basics
        canProceed = formData.name.trim().length > 0;
        break;
      case 1: // Input Type
        canProceed = !!formData.uiType;
        break;
      case 2: // Configuration
        if (formData.uiType === 'buttonGroup') {
          canProceed = validateButtonOptions(formData.buttonOptions);
        } else if (formData.uiType === 'increment' || formData.uiType === 'slider') {
          canProceed = !!formData.unit?.trim();
        } else if (formData.uiType === 'fixedValue') {
          canProceed = (formData.fixedValue ?? 0) > 0;
        }
        break;
      case 3: // Summary
        canProceed = true;
        break;
    }

    setCanGoNext(canProceed);
  }, [currentStep, formData, setCanGoNext]);

  const handleSave = () => {
    onSave(formData);
  };

  const handleSaveWithGoal = () => {
    onSaveWithGoal(formData);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Fixed Header */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0">
        <StepIndicator variant="compact" />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
        <StepContent className="pb-4">
          {/* Step 1: Basics */}
          <StepItem>
            <StepBasics formData={formData} setFormData={setFormData} />
          </StepItem>

          {/* Step 2: Input Type */}
          <StepItem>
            <StepInputType formData={formData} setFormData={setFormData} />
          </StepItem>

          {/* Step 3: Configuration */}
          <StepItem>
            <StepConfiguration formData={formData} setFormData={setFormData} />
          </StepItem>

          {/* Step 4: Summary */}
          <StepItem>
            <StepSummary formData={formData} onSaveWithGoal={handleSaveWithGoal} />
          </StepItem>
        </StepContent>
      </div>

      {/* Fixed Footer with special handling for last step */}
      <div className="px-4 py-3 flex-shrink-0 bg-background">
        {isLastStep ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={prevStep}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors px-3 py-1.5 rounded-full disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="flex-1 min-w-[60px]" />
            <Button size="pill" onClick={handleSave} disabled={isSubmitting}>
              Save
            </Button>
          </div>
        ) : (
          <StepNavigation onCancel={onCancel} isSubmitting={isSubmitting} />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// STEP 1: BASICS
// =============================================================================

interface StepBasicsProps {
  formData: ActivityFormData;
  setFormData: (data: ActivityFormData) => void;
}

function StepBasics({ formData, setFormData }: StepBasicsProps) {
  const goalTypes: { type: GoalType; label: string; description: string; colorClass: string }[] = [
    {
      type: 'positive',
      label: 'More is Better',
      description: 'Higher values are better (e.g., exercise, water)',
      colorClass: 'border-chart-2 bg-chart-2/10 text-chart-2 hover:bg-chart-2/20',
    },
    {
      type: 'negative',
      label: 'Less is Better',
      description: 'Lower values are better (e.g., alcohol, sugar)',
      colorClass: 'border-chart-1 bg-chart-1/10 text-chart-1 hover:bg-chart-1/20',
    },
    {
      type: 'neutral',
      label: 'Just Track',
      description: 'No judgment, just recording (e.g., mood)',
      colorClass: 'border-chart-3 bg-chart-3/10 text-chart-3 hover:bg-chart-3/20',
    },
  ];

  return (
    <div className="space-y-5">


      {/* Activity Name */}
      <div className="space-y-2">
        <Label htmlFor="activity-name">Activity Name</Label>
        <Input
          id="activity-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Pushups, Water Intake, Mood"
          autoFocus
        />
      </div>

      {/* Goal Type */}
      <div className="space-y-2">
        <Label>Goal Type</Label>
        <p className="text-xs text-muted-foreground">
          How should we interpret values for this activity?
        </p>
        <div className="flex flex-wrap gap-2">
          {goalTypes.map(({ type, label, colorClass }) => (
            <Button
              key={type}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFormData({ ...formData, goalType: type })}
              className={cn(
                "flex-1 text-xs",
                formData.goalType === type && colorClass
              )}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// STEP 2: INPUT TYPE
// =============================================================================

interface StepInputTypeProps {
  formData: ActivityFormData;
  setFormData: (data: ActivityFormData) => void;
}

function StepInputType({ formData, setFormData }: StepInputTypeProps) {
  return (
    <div className="space-y-5">


      <div className="space-y-3">
        {UI_TYPE_OPTIONS.map(({ type, label, description, icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => setFormData({ ...formData, uiType: type })}
            className={cn(
              'w-full p-4 rounded-lg border text-left transition-all flex items-start gap-3',
              formData.uiType === type
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
              formData.uiType === type ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{label}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {formData.uiType === type && (
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// STEP 3: CONFIGURATION
// =============================================================================

interface StepConfigurationProps {
  formData: ActivityFormData;
  setFormData: (data: ActivityFormData) => void;
}

function StepConfiguration({ formData, setFormData }: StepConfigurationProps) {
  const renderConfig = () => {
    switch (formData.uiType) {
      case 'increment':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input
                type="text"
                value={formData.unit ?? ''}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value, pluralize: true })}
                placeholder="e.g., drink, minute, step"
              />
            </div>
          </div>
        );

      case 'slider':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input
                type="text"
                value={formData.unit ?? ''}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value, pluralize: true })}
                placeholder="e.g., hour, point, level"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Min</Label>
                <Input
                  type="number"
                  value={formData.minValue ?? 0}
                  onChange={(e) => setFormData({ ...formData, minValue: Number(e.target.value) })}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Max</Label>
                <Input
                  type="number"
                  value={formData.maxValue ?? 10}
                  onChange={(e) => setFormData({ ...formData, maxValue: Number(e.target.value) })}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Step</Label>
                <Input
                  type="number"
                  value={formData.step ?? 1}
                  onChange={(e) => setFormData({ ...formData, step: Number(e.target.value) })}
                  className="h-8"
                />
              </div>
            </div>
          </div>
        );

      case 'buttonGroup':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Options</Label>
              <p className="text-xs text-muted-foreground">
                Define the choices users can select. Drag to reorder.
              </p>
            </div>
            <ButtonOptionsEditor
              options={formData.buttonOptions ?? []}
              onChange={(newOptions) => setFormData({ ...formData, buttonOptions: newOptions })}
            />
          </div>
        );

      case 'toggle':
        return (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm text-center text-muted-foreground">
                A simple Yes/No toggle for binary tracking.
                <br />
                <span className="text-foreground font-medium">No additional configuration needed!</span>
              </p>
            </div>
          </div>
        );

      case 'fixedValue':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fixed Value</Label>
              <p className="text-xs text-muted-foreground">
                This value will be logged each time you mark this activity as complete.
              </p>
              <Input
                type="number"
                value={formData.fixedValue ?? 1}
                onChange={(e) => setFormData({ ...formData, fixedValue: Number(e.target.value) })}
                placeholder="e.g., 10"
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input
                type="text"
                value={formData.unit ?? ''}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value, pluralize: true })}
                placeholder="e.g., pushup, page, rep"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">

      {renderConfig()}
    </div>
  );
}

// =============================================================================
// STEP 4: SUMMARY
// =============================================================================

interface StepSummaryProps {
  formData: ActivityFormData;
  onSaveWithGoal: () => void;
}

function StepSummary({ formData, onSaveWithGoal }: StepSummaryProps) {
  const getInputTypeLabel = () => {
    return UI_TYPE_OPTIONS.find(opt => opt.type === formData.uiType)?.label || formData.uiType;
  };

  const getGoalTypeLabel = () => {
    switch (formData.goalType) {
      case 'positive': return 'More is Better';
      case 'negative': return 'Less is Better';
      case 'neutral': return 'Just Track';
      default: return 'Unknown';
    }
  };

  const getConfigSummary = () => {
    switch (formData.uiType) {
      case 'increment':
        return formData.unit ? `Unit: ${formData.unit}` : 'No unit set';
      case 'slider':
        return `Range: ${formData.minValue ?? 0} - ${formData.maxValue ?? 10}${formData.unit ? ` ${formData.unit}s` : ''}`;
      case 'buttonGroup':
        const options = formData.buttonOptions?.filter(o => o.label.trim()).map(o => o.label) || [];
        return options.length > 0 ? `Options: ${options.join(', ')}` : 'No options set';
      case 'toggle':
        return 'Yes/No toggle';
      case 'fixedValue':
        return `Fixed: ${formData.fixedValue ?? 1}${formData.unit ? ` ${formData.unit}${(formData.fixedValue ?? 1) !== 1 ? 's' : ''}` : ''}`;
      default:
        return '';
    }
  };

  return (
    <div className="space-y-5">


      {/* Activity Preview Card */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            {UI_TYPE_OPTIONS.find(opt => opt.type === formData.uiType)?.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-lg truncate">{formData.name || 'Untitled Activity'}</h4>
            <p className="text-sm text-muted-foreground">{getInputTypeLabel()}</p>
          </div>
        </div>

        <div className="-mx-5 px-5 space-y-2 pt-4 border-t">
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-foreground">Goal Type</span>
            <span className="text-sm font-medium">{getGoalTypeLabel()}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-foreground">Input Type</span>
            <span className="text-sm font-medium">{getInputTypeLabel()}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-foreground">Configuration</span>
            <span className="text-sm font-medium">{getConfigSummary()}</span>
          </div>
        </div>
      </div>

      {/* Hint about adding goal - clickable */}
      <button
        type="button"
        onClick={onSaveWithGoal}
        className="w-full rounded-lg bg-primary/5 border border-primary/20 p-4 hover:bg-primary/10 transition-colors text-left"
      >
        <div className="flex items-start gap-3">
          <Target className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium">Want to set a goal?</p>
            <p className="text-xs text-muted-foreground">
              Tap here to save and set up a goal for this activity.
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}
