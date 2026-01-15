'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Check, Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  Goal,
  GoalDateType,
  GoalTrackingType,
  GOAL_DATE_TYPES,
  GOAL_DATE_TYPE_LABELS,
  GOAL_DATE_TYPE_DESCRIPTIONS,
  GOAL_TRACKING_TYPES,
  GOAL_TRACKING_TYPE_LABELS,
  GOAL_TRACKING_TYPE_DESCRIPTIONS,
  createDefaultGoal,
  validateGoal,
  getGoalIconComponent,
  GOAL_ICON_LABELS,
} from '@/lib/goals';
import { ActivityType, ActivityTypeMap, formatValueOnly } from '@/lib/activityTypes';
import pluralizeLib from 'pluralize-esm';
const { plural } = pluralizeLib;
import { GoalIconPicker } from './GoalIconPicker';
import { useGoals } from './GoalsProvider';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import { Badge } from '@/components/ui/badge';
import { useActivityTypes } from '@/components/ActivityCalendar/ActivityProvider';

/**
 * Parse a date string (YYYY-MM-DD) to a Date object in local timezone.
 */
function parseDateString(dateStr: string): Date {
  return parseISO(dateStr);
}

const STEPS: Step[] = [
  { id: 'basics', title: 'Goal Basics', description: 'Name your goal and choose an activity' },
  { id: 'schedule', title: 'Schedule', description: 'Set when this goal should be tracked' },
  { id: 'value', title: 'Target Value', description: 'Set your target threshold' },
  { id: 'icon', title: 'Choose Icon', description: 'Pick an icon to represent your goal' },
  { id: 'summary', title: 'Review', description: 'Review and save your goal' },
];

export function GoalFormDialog() {
  const { activityTypes } = useActivityTypes();
  const {
    dialogOpen,
    setDialogOpen,
    editingGoal,
    preFilledGoal,
    goalsList,
    createGoal,
    updateGoal,
    deleteGoal,
    isCreating,
    isUpdating,
    isDeleting,
    closeDialog,
  } = useGoals();

  const [formData, setFormData] = useState<Goal>(createDefaultGoal());
  const [errors, setErrors] = useState<string[]>([]);
  // Dialog mode: 'view' shows summary (for existing goals), 'edit' shows stepper form
  const [dialogMode, setDialogMode] = useState<'view' | 'edit'>('edit');

  // Get active (non-deleted) activity types - memoized to prevent excessive re-renders
  const activeTypes = useMemo(
    () => Object.values(activityTypes).filter(t => !t.deleted),
    [activityTypes]
  );

  // Get activity type IDs that already have goals (excluding the one being edited) - memoized
  const usedActivityTypeIds = useMemo(
    () => new Set(
      goalsList
        .filter(g => !editingGoal || g.id !== editingGoal.id)
        .map(g => g.activityTypeId)
    ),
    [goalsList, editingGoal]
  );

  // Reset form when dialog opens/closes or editing goal changes
  useEffect(() => {
    if (dialogOpen) {
      if (editingGoal) {
        // Ensure trackingType has a valid value (for goals created before this field existed)
        setFormData({
          ...editingGoal,
          trackingType: editingGoal.trackingType || 'average',
        });
        // Start in view mode for existing goals
        setDialogMode('view');
      } else {
        // Check if we have pre-filled data from activity creation flow
        if (preFilledGoal?.activityTypeId) {
          setFormData(createDefaultGoal({
            activityTypeId: preFilledGoal.activityTypeId,
            name: preFilledGoal.name || '',
          }));
        } else {
          // Find the first activity type that doesn't already have a goal
          const availableType = activeTypes.find(t => !usedActivityTypeIds.has(t.id));
          setFormData(createDefaultGoal({
            activityTypeId: availableType?.id || '',
          }));
        }
        // Start in edit mode for new goals
        setDialogMode('edit');
      }
      setErrors([]);
    }
  }, [dialogOpen, editingGoal, preFilledGoal, activeTypes, usedActivityTypeIds]);

  const selectedActivityType = activityTypes[formData.activityTypeId];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateGoal(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    if (editingGoal) {
      updateGoal(formData);
    } else {
      createGoal(formData);
    }
  };

  const handleDelete = () => {
    if (editingGoal) {
      deleteGoal(editingGoal.id);
    }
  };

  const isSubmitting = isCreating || isUpdating;
  const isEditing = !!editingGoal;

  // Filter steps based on activity type
  const steps = useMemo(() => {
    if (selectedActivityType?.uiType === 'fixedValue') {
      return STEPS.filter(step => step.id !== 'value');
    }
    return STEPS;
  }, [selectedActivityType?.uiType]);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-md h-[85vh] flex flex-col p-0 gap-0 overflow-hidden" hideCloseButton>
        {dialogOpen && dialogMode === 'view' && editingGoal ? (
          // View mode: Show goal summary with edit icon
          <GoalSummaryView
            goal={formData}
            activityTypes={activityTypes}
            onEdit={() => setDialogMode('edit')}
            onDelete={handleDelete}
            onClose={closeDialog}
            isDeleting={isDeleting}
          />
        ) : dialogOpen ? (
          // Edit mode: Show stepper form
          <Stepper steps={steps} initialStep={0} className="flex-1 min-h-0 flex flex-col">
            <GoalFormContent
              formData={formData}
              setFormData={setFormData}
              errors={errors}
              activeTypes={activeTypes}
              selectedActivityType={selectedActivityType}
              activityTypes={activityTypes}
              usedActivityTypeIds={usedActivityTypeIds}
              isEditing={isEditing}
              isSubmitting={isSubmitting}
              isDeleting={isDeleting}
              onSubmit={handleSubmit}
              onDelete={handleDelete}
              onCancel={closeDialog}
            />
          </Stepper>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// GOAL SUMMARY VIEW (view mode for existing goals)
// =============================================================================

interface GoalSummaryViewProps {
  goal: Goal;
  activityTypes: ActivityTypeMap;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  isDeleting: boolean;
}

function GoalSummaryView({
  goal,
  activityTypes,
  onEdit,
  onDelete,
  onClose,
  isDeleting,
}: GoalSummaryViewProps) {
  const selectedActivityType = activityTypes[goal.activityTypeId];
  const IconComponent = getGoalIconComponent(goal.icon);

  const getScheduleText = () => {
    switch (goal.dateType) {
      case 'daily':
        return 'Every day';
      case 'weekly':
        return 'Every week';
      case 'monthly':
        return 'Every month';
      case 'by_date':
        return goal.targetDate
          ? `By ${format(parseDateString(goal.targetDate), 'MMMM d, yyyy')}`
          : 'By date (not set)';
      case 'date_range':
        if (goal.startDate && goal.endDate) {
          return `${format(parseDateString(goal.startDate), 'MMM d')} - ${format(parseDateString(goal.endDate), 'MMM d, yyyy')}`;
        }
        return 'Date range (not set)';
      default:
        return '';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with edit button */}
      <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 relative">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={onEdit}
          className="absolute right-4 top-4"
          aria-label="Edit goal"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <DialogTitle>Goal Summary</DialogTitle>
      </DialogHeader>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6">
        {/* Goal Preview Card */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          {/* Icon and Name */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <IconComponent className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-lg truncate">{goal.name || 'Untitled Goal'}</h4>
              <p className="text-sm text-muted-foreground">{GOAL_ICON_LABELS[goal.icon]}</p>
            </div>
          </div>

          {/* Details - full bleed border */}
          <div className="-mx-5 px-5 space-y-2 pt-4 border-t">
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-foreground">Activity</span>
              <span className="text-sm font-medium">
                {selectedActivityType?.name || 'Not selected'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-foreground">Target</span>
              <span className="text-sm font-medium">
                {selectedActivityType?.uiType === 'toggle'
                  ? (goal.targetValue === 1 ? 'Yes' : 'No')
                  : selectedActivityType?.uiType === 'buttonGroup'
                  ? (selectedActivityType.buttonOptions?.find(o => o.value === goal.targetValue)?.label || goal.targetValue)
                  : selectedActivityType
                  ? formatValueOnly(goal.targetValue, selectedActivityType)
                  : goal.targetValue}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-foreground">Schedule</span>
              <Badge variant="secondary">{getScheduleText()}</Badge>
            </div>
            {/* Show tracking type for buttonGroup and toggle with non-daily goals */}
            {(selectedActivityType?.uiType === 'buttonGroup' || selectedActivityType?.uiType === 'toggle') && goal.dateType !== 'daily' && (
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">Tracking</span>
                <Badge variant="secondary">{GOAL_TRACKING_TYPE_LABELS[goal.trackingType]}</Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 flex-shrink-0 bg-background">
        <div className="flex items-center justify-between gap-2">
          <ConfirmDeleteButton
            onDelete={onDelete}
            disabled={isDeleting}
            isDeleting={isDeleting}
          />
          <div className="flex-1" />
          <Button size="pill" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// FORM CONTENT (uses stepper context)
// =============================================================================

interface GoalFormContentProps {
  formData: Goal;
  setFormData: (data: Goal) => void;
  errors: string[];
  activeTypes: ActivityType[];
  selectedActivityType: ActivityType | undefined;
  activityTypes: ActivityTypeMap;
  usedActivityTypeIds: Set<string>;
  isEditing: boolean;
  isSubmitting: boolean;
  isDeleting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onDelete: () => void;
  onCancel: () => void;
}

function GoalFormContent({
  formData,
  setFormData,
  errors,
  activeTypes,
  selectedActivityType,
  activityTypes,
  usedActivityTypeIds,
  isEditing,
  isSubmitting,
  isDeleting,
  onSubmit,
  onDelete,
  onCancel,
}: GoalFormContentProps) {
  const { currentStep, setCanGoNext } = useStepper();

  // Auto-set targetValue for fixedValue activity types
  // Since we skip the value step, we must ensure it's set correctly here
  useEffect(() => {
    if (selectedActivityType?.uiType === 'fixedValue' && selectedActivityType.fixedValue) {
      if (formData.targetValue !== selectedActivityType.fixedValue) {
        setFormData({ ...formData, targetValue: selectedActivityType.fixedValue! });
      }
    }
  }, [selectedActivityType?.uiType, selectedActivityType?.fixedValue, formData.targetValue]);

  // Validate current step and update canGoNext
  useEffect(() => {
    let canProceed = true;

    switch (currentStep) {
      case 0: // Basics
        canProceed = formData.name.trim().length > 0 && !!formData.activityTypeId;
        break;
      case 1: // Schedule
        if (formData.dateType === 'by_date') {
          canProceed = !!formData.targetDate;
        } else if (formData.dateType === 'date_range') {
          canProceed = !!formData.startDate && !!formData.endDate;
        }
        break;
      case 2: // Value
        canProceed = formData.targetValue >= 0;
        break;
      case 3: // Icon
        canProceed = true; // Icon always has a default
        break;
      case 4: // Summary
        canProceed = true;
        break;
    }

    setCanGoNext(canProceed);
  }, [currentStep, formData, setCanGoNext]);

  return (
    <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
      {/* Fixed Header */}
      <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
        <DialogTitle className="sr-only">
          {isEditing ? 'Edit Goal' : 'Create Goal'}
        </DialogTitle>
        <StepIndicator variant="compact" />
      </DialogHeader>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 min-h-0 overscroll-contain">
        <StepContent className="pb-4">
          {/* Step 1: Basics */}
          <StepItem>
            <StepBasics
              formData={formData}
              setFormData={setFormData}
              activeTypes={activeTypes}
              activityTypes={activityTypes}
              usedActivityTypeIds={usedActivityTypeIds}
              isLockedActivity={!!formData.activityTypeId && !isEditing}
            />
          </StepItem>

          {/* Step 2: Schedule */}
          <StepItem>
            <StepSchedule
              formData={formData}
              setFormData={setFormData}
            />
          </StepItem>

          {/* Step 3: Value */}
          {selectedActivityType?.uiType !== 'fixedValue' && (
            <StepItem>
              <StepValue
                formData={formData}
                setFormData={setFormData}
                selectedActivityType={selectedActivityType}
              />
            </StepItem>
          )}

          {/* Step 4: Icon */}
          <StepItem>
            <StepIcon
              formData={formData}
              setFormData={setFormData}
            />
          </StepItem>

          {/* Step 5: Summary */}
          <StepItem>
            <StepSummary
              formData={formData}
              activityTypes={activityTypes}
              errors={errors}
            />
          </StepItem>
        </StepContent>
      </div>

      {/* Fixed Footer */}
      <div className="px-6 py-4 flex-shrink-0 bg-background">
        <StepNavigation
          onCancel={onCancel}
          completeLabel={isEditing ? 'Save Changes' : 'Create Goal'}
          isSubmitting={isSubmitting}
          leftContent={
            isEditing ? (
              <ConfirmDeleteButton
                onDelete={onDelete}
                disabled={isDeleting}
                isDeleting={isDeleting}
              />
            ) : undefined
          }
        />
      </div>
    </form>
  );
}

// =============================================================================
// STEP 1: BASICS (Name, Activity Type)
// =============================================================================

interface StepBasicsProps {
  formData: Goal;
  setFormData: (data: Goal) => void;
  activeTypes: ActivityType[];
  activityTypes: ActivityTypeMap;
  usedActivityTypeIds: Set<string>;
  /** When true, shows activity type as a locked label instead of dropdown */
  isLockedActivity?: boolean;
}

function StepBasics({ formData, setFormData, activeTypes, activityTypes, usedActivityTypeIds, isLockedActivity }: StepBasicsProps) {
  // Get the activity type name for locked display
  const lockedActivityType = isLockedActivity && formData.activityTypeId 
    ? activityTypes[formData.activityTypeId] 
    : null;

  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">Goal Basics</h3>
        <p className="text-sm text-muted-foreground">Name your goal and choose an activity</p>
      </div>

      {/* Goal Name */}
      <div className="space-y-2">
        <Label htmlFor="goal-name">Goal Name</Label>
        <Input
          id="goal-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Run 5 miles daily"
          autoFocus
        />
      </div>

      {/* Activity Type - show as locked label or dropdown */}
      <div className="space-y-2">
        <Label htmlFor="activity-type">Activity Type</Label>
        {isLockedActivity && lockedActivityType ? (
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <span className="text-sm font-medium">{lockedActivityType.name}</span>
          </div>
        ) : (
          <Select
            value={formData.activityTypeId}
            onValueChange={(value) => setFormData({ ...formData, activityTypeId: value })}
          >
            <SelectTrigger id="activity-type">
              <SelectValue placeholder="Select activity type" />
            </SelectTrigger>
            <SelectContent>
              {activeTypes.map((type) => {
                const hasGoal = usedActivityTypeIds.has(type.id);
                return (
                  <SelectItem 
                    key={type.id} 
                    value={type.id}
                    disabled={hasGoal}
                    className={hasGoal ? 'opacity-50' : ''}
                  >
                    <span className="flex items-center gap-2">
                      {type.name}
                      {hasGoal && <Check className="h-3.5 w-3.5 text-muted-foreground" />}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// STEP 2: SCHEDULE
// =============================================================================

interface StepScheduleProps {
  formData: Goal;
  setFormData: (data: Goal) => void;
}

function StepSchedule({ formData, setFormData }: StepScheduleProps) {
  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">Schedule</h3>
        <p className="text-sm text-muted-foreground">When should this goal be tracked?</p>
      </div>

      {/* Date Type Selection */}
      <div className="space-y-3">
        {GOAL_DATE_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setFormData({
              ...formData,
              dateType: type,
              targetDate: undefined,
              startDate: undefined,
              endDate: undefined,
            })}
            className={cn(
              'w-full p-3 rounded-lg border text-left transition-all',
              formData.dateType === type
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{GOAL_DATE_TYPE_LABELS[type]}</p>
                <p className="text-sm text-muted-foreground">
                  {GOAL_DATE_TYPE_DESCRIPTIONS[type]}
                </p>
              </div>
              {formData.dateType === type && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Target Date (for by_date type) */}
      {formData.dateType === 'by_date' && (
        <div className="space-y-2 pt-2">
          <Label>Target Date</Label>
          <DatePicker
            date={formData.targetDate ? parseDateString(formData.targetDate) : undefined}
            onSelect={(date) => setFormData({
              ...formData,
              targetDate: date ? format(date, 'yyyy-MM-dd') : undefined
            })}
          />
        </div>
      )}

      {/* Date Range (for date_range type) */}
      {formData.dateType === 'date_range' && (
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <DatePicker
              date={formData.startDate ? parseDateString(formData.startDate) : undefined}
              onSelect={(date) => setFormData({
                ...formData,
                startDate: date ? format(date, 'yyyy-MM-dd') : undefined
              })}
            />
          </div>
          <div className="space-y-2">
            <Label>End Date</Label>
            <DatePicker
              date={formData.endDate ? parseDateString(formData.endDate) : undefined}
              onSelect={(date) => setFormData({
                ...formData,
                endDate: date ? format(date, 'yyyy-MM-dd') : undefined
              })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// STEP 3: VALUE (Target threshold with UI matching activity type)
// =============================================================================

// =============================================================================
// STEP 3: VALUE (Target threshold with UI matching activity type)
// =============================================================================

const TIME_UNITS = [
  { label: 'Minutes', value: 'minutes', multiplier: 1 },
  { label: 'Hours', value: 'hours', multiplier: 60 },
  { label: 'Days', value: 'days', multiplier: 1440 },
];

interface StepValueProps {
  formData: Goal;
  setFormData: (data: Goal) => void;
  selectedActivityType: ActivityType | undefined;
}

function StepValue({ formData, setFormData, selectedActivityType }: StepValueProps) {
  const currentValue = formData.targetValue;
  const minValue = selectedActivityType?.minValue ?? 0;
  const maxValue = selectedActivityType?.maxValue ?? 100;
  const step = selectedActivityType?.step ?? 1;
  const uiType = selectedActivityType?.uiType ?? 'increment';
  
  const [timeUnit, setTimeUnit] = useState('minutes');

  // Initialize time unit based on value magnitude if it looks like a clean conversion
  useEffect(() => {
    if (selectedActivityType?.unit === 'minute' && currentValue > 0) {
      if (currentValue % 1440 === 0) setTimeUnit('days');
      else if (currentValue % 60 === 0) setTimeUnit('hours');
    }
  }, []); // Only run once on mount

  // Auto-set targetValue for fixedValue activity types
  useEffect(() => {
    if (selectedActivityType?.uiType === 'fixedValue' && selectedActivityType.fixedValue) {
      // Only set if different to avoid infinite loops
      if (formData.targetValue !== selectedActivityType.fixedValue) {
        setFormData({ ...formData, targetValue: selectedActivityType.fixedValue });
      }
    }
  }, [selectedActivityType?.uiType, selectedActivityType?.fixedValue]);

  const handleChange = (value: number) => {
    setFormData({ ...formData, targetValue: value });
  };

  const handleTimeValueChange = (val: number) => {
    const multiplier = TIME_UNITS.find(u => u.value === timeUnit)?.multiplier || 1;
    handleChange(val * multiplier);
  };

  const handleTimeUnitChange = (newUnit: string) => {
    setTimeUnit(newUnit);
    // Be helpful: when switching units, try to keep the *duration* constant?
    // Current behavior: The input value stays the same, so the total target changes. 
    // E.g. 5 minutes -> switch to hours -> 5 hours. This is usually what users expect when changing units before typing.
    // BUT if they already typed "120" (minutes) and switch to "Hours", they might expect "2" (hours).
    
    // Let's implement the "keep duration constant" logic if possible, but it might be confusing if it results in decimals.
    // User request: "If it's time based unit it should allow you to choose minutes, hours, or days."
    // Let's stick to the simpler UX: Changing unit simply changes the multiplier for future edits, AND we re-calculate the display value.
  };

  const showTrackingType = formData.dateType !== 'daily';

  // Get schedule description for labels
  const getScheduleLabel = () => {
    switch (formData.dateType) {
      case 'daily': return 'day';
      case 'weekly': return 'week';
      case 'monthly': return 'month';
      case 'by_date': return 'period';
      case 'date_range': return 'period';
      default: return 'period';
    }
  };

  const renderTrackingTypeSelector = () => {
    if (!showTrackingType) return null;
    
    return (
      <div className="space-y-3 mb-6 pb-6 border-b">
        <Label className="text-sm font-medium">How should progress be measured?</Label>
        <div className="grid gap-2">
          {GOAL_TRACKING_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFormData({ ...formData, trackingType: type })}
              className={cn(
                'w-full p-3 rounded-lg border text-left transition-all',
                formData.trackingType === type
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{GOAL_TRACKING_TYPE_LABELS[type]}</p>
                  <p className="text-sm text-muted-foreground">
                    {GOAL_TRACKING_TYPE_DESCRIPTIONS[type]}
                  </p>
                </div>
                {formData.trackingType === type && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderSumInput = () => {
    const isTimeBased = selectedActivityType?.unit === 'minute';
    
    if (isTimeBased) {
      const multiplier = TIME_UNITS.find(u => u.value === timeUnit)?.multiplier || 1;
      const displayValue = currentValue / multiplier;

      return (
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label>Target Value</Label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={displayValue}
                onChange={(e) => handleTimeValueChange(parseFloat(e.target.value) || 0)}
                className="text-lg"
              />
            </div>
            <div className="w-32 space-y-2">
              <Label>Unit</Label>
              <Select value={timeUnit} onValueChange={handleTimeUnitChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_UNITS.map(unit => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center">
             Total: {formatValueOnly(currentValue, selectedActivityType!)} per {getScheduleLabel()}
          </p>
        </div>
      );
    }

    // Generic sum input for non-time activities
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-center block">Total Target Value</Label>
          <div className="flex items-center justify-center gap-4">
            <Input
              type="number"
              min={0}
              value={currentValue}
              onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
              className="w-32 text-center text-lg font-medium"
            />
            {selectedActivityType?.unit && (
               <span className="text-sm text-muted-foreground">
                {selectedActivityType.pluralize && currentValue !== 1
                  ? plural(selectedActivityType.unit)
                  : selectedActivityType.unit}
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground text-center">
           Total value per {getScheduleLabel()}
        </p>
      </div>
    );
  };

  const renderInput = () => {
    // If 'sum' is selected, show the custom sum input regardless of UI type
    // (unless it's daily, which doesn't support sum tracking type anyway)
    if (formData.trackingType === 'sum' && showTrackingType) {
      return (
        <div className="space-y-6">
          {renderSumInput()}
        </div>
      );
    }

    // For slider UI type
    if (uiType === 'slider') {
      const progress = ((currentValue - minValue) / (maxValue - minValue)) * 100;

      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-medium">
              {selectedActivityType
                ? formatValueOnly(currentValue, selectedActivityType)
                : currentValue}
            </span>
          </div>
          <input
            type="range"
            min={minValue}
            max={maxValue}
            step={step}
            value={currentValue}
            onChange={(e) => handleChange(Number(e.target.value))}
            className="activity-slider w-full"
            style={{ '--slider-progress': `${progress}%` } as React.CSSProperties}
          />
          
          <p className="text-xs text-muted-foreground text-center">
            Target value per {getScheduleLabel()}
          </p>
        </div>
      );
    }

    // For buttonGroup UI type
    if (uiType === 'buttonGroup') {
      const options = selectedActivityType?.buttonOptions ?? [];
      return (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleChange(option.value)}
                className={cn(
                  'flex-1 min-w-[80px] py-2.5 px-3 rounded-full border-2 text-sm font-medium transition-all',
                  currentValue === option.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:border-muted-foreground/50 text-muted-foreground hover:text-foreground'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Target value per {getScheduleLabel()}
          </p>
        </div>
      );
    }

    // For toggle UI type
    if (uiType === 'toggle') {
      return (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleChange(1)}
              className={cn(
                'flex-1 py-2.5 px-4 rounded-full border-2 text-sm font-medium transition-all',
                currentValue === 1
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:border-muted-foreground/50 text-muted-foreground hover:text-foreground'
              )}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => handleChange(0)}
              className={cn(
                'flex-1 py-2.5 px-4 rounded-full border-2 text-sm font-medium transition-all',
                currentValue === 0
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:border-muted-foreground/50 text-muted-foreground hover:text-foreground'
              )}
            >
              No
            </button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Target: {currentValue === 1 ? 'Yes' : 'No'} per {getScheduleLabel()}
          </p>
        </div>
      );
    }

    // For fixedValue UI type - show the fixed value and auto-set
    if (uiType === 'fixedValue') {
      const fixedVal = selectedActivityType?.fixedValue ?? 1;
      return (
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 border border-border p-4 text-center">
            <p className="text-2xl font-bold text-foreground mb-1">
              {selectedActivityType
                ? formatValueOnly(fixedVal, selectedActivityType)
                : fixedVal}
            </p>
            <p className="text-sm text-muted-foreground">
              This activity always logs a fixed value
            </p>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Target: {fixedVal} per {getScheduleLabel()}
          </p>
        </div>
      );
    }

    // Default increment/input
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-4">
          <Input
            type="number"
            min={minValue}
            max={maxValue}
            step={step}
            value={currentValue}
            onChange={(e) => handleChange(parseInt(e.target.value) || 0)}
            className="w-32 text-center text-lg font-medium"
          />
          {selectedActivityType?.unit && (
            <span className="text-sm text-muted-foreground">
              {selectedActivityType.pluralize && currentValue !== 1
                ? plural(selectedActivityType.unit)
                : selectedActivityType.unit}
            </span>
          )}
        </div>
        
        <p className="text-sm text-muted-foreground text-center">
          Goal: {formatValueOnly(currentValue, selectedActivityType!)}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">Target Value</h3>
        <p className="text-sm text-muted-foreground">
          Set the threshold for {selectedActivityType?.name || 'this activity'}
        </p>
      </div>

      {renderTrackingTypeSelector()}
      {renderInput()}
    </div>
  );
}

// =============================================================================
// STEP 4: ICON
// =============================================================================

interface StepIconProps {
  formData: Goal;
  setFormData: (data: Goal) => void;
}

function StepIcon({ formData, setFormData }: StepIconProps) {
  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">Choose Icon</h3>
        <p className="text-sm text-muted-foreground">Pick an icon to represent your goal</p>
      </div>

      <GoalIconPicker
        value={formData.icon}
        onChange={(icon) => setFormData({ ...formData, icon })}
        size="lg"
      />
    </div>
  );
}

// =============================================================================
// STEP 5: SUMMARY
// =============================================================================

interface StepSummaryProps {
  formData: Goal;
  activityTypes: ActivityTypeMap;
  errors: string[];
}

function StepSummary({ formData, activityTypes, errors }: StepSummaryProps) {
  const selectedActivityType = activityTypes[formData.activityTypeId];
  const IconComponent = getGoalIconComponent(formData.icon);

  const getScheduleText = () => {
    switch (formData.dateType) {
      case 'daily':
        return 'Every day';
      case 'weekly':
        return 'Every week';
      case 'monthly':
        return 'Every month';
      case 'by_date':
        return formData.targetDate
          ? `By ${format(parseDateString(formData.targetDate), 'MMMM d, yyyy')}`
          : 'By date (not set)';
      case 'date_range':
        if (formData.startDate && formData.endDate) {
          return `${format(parseDateString(formData.startDate), 'MMM d')} - ${format(parseDateString(formData.endDate), 'MMM d, yyyy')}`;
        }
        return 'Date range (not set)';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">Review Your Goal</h3>
        <p className="text-sm text-muted-foreground">Make sure everything looks right</p>
      </div>

      {/* Goal Preview Card */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        {/* Icon and Name */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <IconComponent className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-lg truncate">{formData.name || 'Untitled Goal'}</h4>
            <p className="text-sm text-muted-foreground">{GOAL_ICON_LABELS[formData.icon]}</p>
          </div>
        </div>

        {/* Details - full bleed border */}
        <div className="-mx-5 px-5 space-y-2 pt-4 border-t">
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-foreground">Activity</span>
            <span className="text-sm font-medium">
              {selectedActivityType?.name || 'Not selected'}
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-foreground">Target</span>
            <span className="text-sm font-medium">
              {selectedActivityType?.uiType === 'toggle'
                ? (formData.targetValue === 1 ? 'Yes' : 'No')
                : selectedActivityType?.uiType === 'buttonGroup'
                ? (selectedActivityType.buttonOptions?.find(o => o.value === formData.targetValue)?.label || formData.targetValue)
                : selectedActivityType
                ? formatValueOnly(formData.targetValue, selectedActivityType)
                : formData.targetValue}
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-foreground">Schedule</span>
            <Badge variant="secondary">{getScheduleText()}</Badge>
          </div>
          {/* Show tracking type for non-daily goals */}
          {formData.dateType !== 'daily' && (
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-foreground">Tracking</span>
              <Badge variant="secondary">{GOAL_TRACKING_TYPE_LABELS[formData.trackingType]}</Badge>
            </div>
          )}
        </div>
      </div>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <ul className="list-disc list-inside space-y-1">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// DATE PICKER
// =============================================================================

interface DatePickerProps {
  date?: Date;
  onSelect: (date: Date | undefined) => void;
}

function DatePicker({ date, onSelect }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'MM/dd/yyyy') : 'Pick a date'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
