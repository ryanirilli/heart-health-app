'use client';

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

/**
 * Parse a date string (YYYY-MM-DD) to a Date object in local timezone.
 * Using parseISO avoids timezone issues that occur with new Date('YYYY-MM-DD').
 */
function parseDateString(dateStr: string): Date {
  return parseISO(dateStr);
}
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { cn } from '@/lib/utils';
import {
  Goal,
  GoalIcon,
  GoalDateType,
  GOAL_DATE_TYPES,
  GOAL_DATE_TYPE_LABELS,
  GOAL_DATE_TYPE_DESCRIPTIONS,
  createDefaultGoal,
  validateGoal,
} from '@/lib/goals';
import { ActivityType, ActivityTypeMap, formatValueWithUnit } from '@/lib/activityTypes';
import { GoalIconPicker } from './GoalIconPicker';
import { useGoals } from './GoalsProvider';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';

interface GoalFormDialogProps {
  activityTypes: ActivityTypeMap;
}

export function GoalFormDialog({ activityTypes }: GoalFormDialogProps) {
  const {
    dialogOpen,
    setDialogOpen,
    editingGoal,
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

  // Get active (non-deleted) activity types
  const activeTypes = Object.values(activityTypes).filter(t => !t.deleted);

  // Reset form when dialog opens/closes or editing goal changes
  useEffect(() => {
    if (dialogOpen) {
      if (editingGoal) {
        setFormData(editingGoal);
      } else {
        setFormData(createDefaultGoal({
          activityTypeId: activeTypes[0]?.id || '',
        }));
      }
      setErrors([]);
    }
  }, [dialogOpen, editingGoal, activeTypes]);

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

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Goal' : 'Create Goal'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                {activeTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Value */}
          <div className="space-y-2">
            <Label htmlFor="target-value">
              Target Value
              {selectedActivityType && (
                <span className="text-muted-foreground ml-1">
                  ({selectedActivityType.unit || 'units'})
                </span>
              )}
            </Label>
            <Input
              id="target-value"
              type="number"
              min={selectedActivityType?.minValue ?? 0}
              max={selectedActivityType?.maxValue ?? undefined}
              step={selectedActivityType?.step ?? 1}
              value={formData.targetValue}
              onChange={(e) => setFormData({ ...formData, targetValue: parseInt(e.target.value) || 0 })}
            />
            {selectedActivityType && formData.targetValue >= 0 && (
              <p className="text-sm text-muted-foreground">
                Goal: {formatValueWithUnit(formData.targetValue, selectedActivityType)}
              </p>
            )}
          </div>

          {/* Icon Picker */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <GoalIconPicker
              value={formData.icon}
              onChange={(icon) => setFormData({ ...formData, icon })}
            />
          </div>

          {/* Date Type */}
          <div className="space-y-2">
            <Label htmlFor="date-type">Schedule</Label>
            <Select
              value={formData.dateType}
              onValueChange={(value: GoalDateType) => setFormData({ 
                ...formData, 
                dateType: value,
                // Clear date fields when changing type
                targetDate: undefined,
                startDate: undefined,
                endDate: undefined,
              })}
            >
              <SelectTrigger id="date-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOAL_DATE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex flex-col">
                      <span>{GOAL_DATE_TYPE_LABELS[type]}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {GOAL_DATE_TYPE_DESCRIPTIONS[formData.dateType]}
            </p>
          </div>

          {/* Target Date (for by_date type) */}
          {formData.dateType === 'by_date' && (
            <div className="space-y-2">
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
            <div className="grid grid-cols-2 gap-4">
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

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            {isEditing && (
              <ConfirmDeleteButton
                onDelete={handleDelete}
                disabled={isDeleting}
                isDeleting={isDeleting}
                className="sm:mr-auto"
              />
            )}
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Goal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Simple date picker component
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

