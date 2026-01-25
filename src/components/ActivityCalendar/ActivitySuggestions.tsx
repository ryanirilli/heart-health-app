'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExtractedActivities, ExtractedActivity } from '@/lib/hooks/useVoiceNotesQuery';
import { ActivityType } from '@/lib/activityTypes';
import { Check, X, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivitySuggestionsProps {
  extractedActivities: ExtractedActivities;
  existingActivityTypes: { [id: string]: ActivityType };
  onAcceptAll: (acceptedActivities: ExtractedActivity[]) => void;
  onSkipAll: () => void;
}

/**
 * Component to display and manage AI-extracted activity suggestions.
 * Styled to match the app's calm, warm theme.
 */
export function ActivitySuggestions({
  extractedActivities,
  existingActivityTypes,
  onAcceptAll,
  onSkipAll,
}: ActivitySuggestionsProps) {
  // Track which activities are accepted (by index)
  const [acceptedIndices, setAcceptedIndices] = useState<Set<number>>(
    new Set(extractedActivities.activities.map((_, i) => i))
  );

  // Track edited values
  const [editedValues, setEditedValues] = useState<{ [index: number]: number }>({});

  const handleToggleActivity = useCallback((index: number) => {
    setAcceptedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleEditValue = useCallback((index: number, value: number) => {
    setEditedValues((prev) => ({
      ...prev,
      [index]: value,
    }));
  }, []);

  const handleAcceptAll = useCallback(() => {
    const acceptedActivities = extractedActivities.activities
      .filter((_, index) => acceptedIndices.has(index))
      .map((activity) => {
        const actualIndex = extractedActivities.activities.indexOf(activity);
        return {
          ...activity,
          value: editedValues[actualIndex] ?? activity.value,
        };
      });
    onAcceptAll(acceptedActivities);
  }, [extractedActivities.activities, acceptedIndices, editedValues, onAcceptAll]);



  const hasActivities = extractedActivities.activities.length > 0;
  const acceptedCount = acceptedIndices.size;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-ring" />
        <span className="text-sm font-medium text-muted-foreground">
          AI detected {extractedActivities.activities.length} {extractedActivities.activities.length === 1 ? 'activity' : 'activities'}
        </span>
      </div>

      {/* Activities - styled like ActivityViewCard */}
      {hasActivities ? (
        <div className="space-y-2">
          {extractedActivities.activities.map((activity, index) => {
            const isAccepted = acceptedIndices.has(index);
            const isExisting = activity.activityTypeId !== null;

            return (
              <div
                key={index}
                onClick={() => handleToggleActivity(index)}
                className={cn(
                  'rounded-xl p-3.5 transition-all cursor-pointer',
                  isAccepted
                    ? 'bg-muted/50'
                    : 'bg-muted/30 opacity-60'
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Checkbox */}
                  <div
                    className={cn(
                      'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all',
                      isAccepted
                        ? 'bg-primary border-primary'
                        : 'border-border bg-transparent'
                    )}
                  >
                    {isAccepted && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>

                  {/* Activity info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground/90">
                        {isExisting && activity.activityTypeId && existingActivityTypes[activity.activityTypeId] 
                          ? existingActivityTypes[activity.activityTypeId].name 
                          : activity.suggestedName}
                      </span>
                      {!isExisting && (
                        <Badge variant="muted" className="text-xs px-1.5 py-0">
                          <Plus className="h-2.5 w-2.5 mr-0.5" />
                          New
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Value input and confidence */}
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
{(() => {
                    const activityType = isExisting && activity.activityTypeId ? existingActivityTypes[activity.activityTypeId] : null;
                    const currentValue = editedValues[index] ?? activity.value;

                    // Helper to update value
                    const updateValue = (val: number) => handleEditValue(index, val);

                    // Case 1: Button Group (Discrete options)
                    if (activityType?.uiType === 'buttonGroup' && activityType.buttonOptions) {
                      return (
                        <select
                          value={currentValue}
                          onChange={(e) => updateValue(parseInt(e.target.value))}
                          className={cn(
                            'h-7 px-2 text-sm text-center rounded-md transition-colors appearance-none cursor-pointer',
                            'bg-muted border border-border/50',
                            'focus:outline-none focus:ring-1 focus:ring-ring/50'
                          )}
                        >
                          {activityType.buttonOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      );
                    }

                    // Case 2: Toggle (Yes/No)
                    if (activityType?.uiType === 'toggle') {
                      return (
                        <select
                          value={currentValue}
                          onChange={(e) => updateValue(parseInt(e.target.value))}
                          className={cn(
                            'h-7 px-2 text-sm text-center rounded-md transition-colors appearance-none cursor-pointer',
                            'bg-muted border border-border/50',
                            'focus:outline-none focus:ring-1 focus:ring-ring/50'
                          )}
                        >
                          <option value={1}>Yes</option>
                          <option value={0}>No</option>
                        </select>
                      );
                    }

                    // Case 3: Default Number Input (Slider, Fixed, or New/Unknown)
                    return (
                      <input
                        type="number"
                        value={currentValue}
                        onChange={(e) => updateValue(parseFloat(e.target.value))}
                        className={cn(
                          'w-14 px-2 py-1 text-sm text-center rounded-md transition-colors',
                          'bg-muted border border-border/50',
                          'focus:outline-none focus:ring-1 focus:ring-ring/50'
                        )}
                        step={activity.suggestedUiType === 'slider' ? 0.5 : 1}
                      />
                    );
                  })()}
                    <span className="text-xs text-muted-foreground w-10 truncate">
                      {activity.suggestedUnit}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <p className="text-sm">No activities detected in this voice note.</p>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onSkipAll}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
          Skip
        </button>
        
        <div className="flex items-center gap-3">
          {hasActivities && (
            <span className="text-xs text-muted-foreground">
              {acceptedCount}/{extractedActivities.activities.length}
            </span>
          )}
          <Button
            size="pill"
            onClick={handleAcceptAll}
            disabled={acceptedCount === 0}
          >
            <Check className="h-4 w-4 mr-1.5" />
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
