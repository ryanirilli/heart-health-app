'use client';

import React, { useState, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
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
  GOAL_DATE_TYPES,
  GOAL_DATE_TYPE_LABELS,
  GOAL_DATE_TYPE_DESCRIPTIONS,
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
import { useIsMobile } from '@/lib/hooks/useMediaQuery';

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
    goalsList,
    createGoal,
    updateGoal,
    deleteGoal,
    isCreating,
    isUpdating,
    isDeleting,
    closeDialog,
  } = useGoals();
  const isMobile = useIsMobile();

  const [formData, setFormData] = useState<Goal>(createDefaultGoal());
  const [errors, setErrors] = useState<string[]>([]);

  // Get active (non-deleted) activity types
  const activeTypes = Object.values(activityTypes).filter(t => !t.deleted);

  // Get activity type IDs that already have goals (excluding the one being edited)
  const usedActivityTypeIds = new Set(
    goalsList
      .filter(g => !editingGoal || g.id !== editingGoal.id)
      .map(g => g.activityTypeId)
  );

  // Reset form when dialog opens/closes or editing goal changes
  useEffect(() => {
    if (dialogOpen) {
      if (editingGoal) {
        setFormData(editingGoal);
      } else {
        // Find the first activity type that doesn't already have a goal
        const availableType = activeTypes.find(t => !usedActivityTypeIds.has(t.id));
        setFormData(createDefaultGoal({
          activityTypeId: availableType?.id || '',
        }));
      }
      setErrors([]);
    }
  }, [dialogOpen, editingGoal, activeTypes, usedActivityTypeIds]);

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

  const formContent = (
    <Stepper steps={STEPS} initialStep={0}>
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
  );

  // Use Drawer on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <Drawer open={dialogOpen} onOpenChange={setDialogOpen}>
        <DrawerContent className="h-[85vh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>
              {isEditing ? 'Edit Goal' : 'Create Goal'}
            </DrawerTitle>
          </DrawerHeader>
          <MobileDrawerContent>
            {formContent}
          </MobileDrawerContent>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {formContent}
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// MOBILE DRAWER CONTENT (wrapper that provides scroll ref to form content)
// =============================================================================

function MobileDrawerContent({ 
  children
}: { 
  children: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <MobileScrollContext.Provider value={scrollRef}>
      <div ref={scrollRef} className="px-4 pb-8 overflow-y-auto">
        {children}
      </div>
    </MobileScrollContext.Provider>
  );
}

// Context to pass scroll ref from drawer to form content (which is inside Stepper)
const MobileScrollContext = React.createContext<React.RefObject<HTMLDivElement | null> | null>(null);

// Component that registers scroll container with stepper (must be inside Stepper)
function MobileScrollRegistrar() {
  const scrollRef = React.useContext(MobileScrollContext);
  const { registerScrollContainer } = useStepper();
  
  useEffect(() => {
    if (scrollRef?.current) {
      registerScrollContainer(scrollRef.current);
    }
    return () => registerScrollContainer(null);
  }, [registerScrollContainer, scrollRef]);

  return null;
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
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Register scroll container for mobile drawer */}
      <MobileScrollRegistrar />
      
      <DialogHeader className="pb-0">
        <DialogTitle className="sr-only">
          {isEditing ? 'Edit Goal' : 'Create Goal'}
        </DialogTitle>
        <StepIndicator variant="compact" className="pt-2" />
      </DialogHeader>

      <StepContent className="min-h-[280px]">
        {/* Step 1: Basics */}
        <StepItem>
          <StepBasics
            formData={formData}
            setFormData={setFormData}
            activeTypes={activeTypes}
            usedActivityTypeIds={usedActivityTypeIds}
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
        <StepItem>
          <StepValue
            formData={formData}
            setFormData={setFormData}
            selectedActivityType={selectedActivityType}
          />
        </StepItem>

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
  usedActivityTypeIds: Set<string>;
}

function StepBasics({ formData, setFormData, activeTypes, usedActivityTypeIds }: StepBasicsProps) {
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

      {/* Activity Type */}
      <div className="space-y-2">
        <Label htmlFor="activity-type">Activity Type</Label>
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

  const handleChange = (value: number) => {
    setFormData({ ...formData, targetValue: value });
  };

  // Get schedule description for slider average note
  const getScheduleLabel = () => {
    switch (formData.dateType) {
      case 'daily':
        return 'day';
      case 'weekly':
        return 'week';
      case 'monthly':
        return 'month';
      case 'by_date':
        return 'period';
      case 'date_range':
        return 'period';
      default:
        return 'period';
    }
  };

  const renderInput = () => {
    // For slider UI type - show a slider
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
            Average value per {getScheduleLabel()} to meet goal
          </p>
        </div>
      );
    }

    // For buttonGroup UI type - show button options
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
            Average value per {getScheduleLabel()} to meet goal
          </p>
        </div>
      );
    }

    // For toggle UI type - show Yes/No buttons
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

    // For increment UI type - show a number input
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
        {selectedActivityType && (
          <p className="text-sm text-muted-foreground text-center">
            Goal: {formatValueOnly(currentValue, selectedActivityType)}
          </p>
        )}
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
                : selectedActivityType
                ? formatValueOnly(formData.targetValue, selectedActivityType)
                : formData.targetValue}
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-foreground">Schedule</span>
            <Badge variant="secondary">{getScheduleText()}</Badge>
          </div>
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
          {date ? format(date, 'PPP') : 'Pick a date'}
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
