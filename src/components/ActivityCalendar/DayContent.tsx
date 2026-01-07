'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ActivityType, ActivityTypeMap } from '@/lib/activityTypes';
import { Activity, ActivityEntry } from '@/lib/activities';
import { GoalMap, getRelevantGoalsForDate } from '@/lib/goals';
import { ActivityViewCard, ActivityTypeCard } from './ActivityFormContent';
import { GoalStatusSection } from './GoalStatusSection';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { Settings } from 'lucide-react';

interface DayContentViewProps {
  dateStr: string;
  activity?: Activity;
  activityTypes: ActivityTypeMap;
  goals: GoalMap;
  onEditClick?: () => void;
  /** Whether to show full-bleed border for goals section */
  fullBleedBorder?: boolean;
}

/**
 * View mode content showing activity summary and goals for a day.
 * Used by both DayView and ActivityEntryDialog.
 */
export function DayContentView({
  dateStr,
  activity,
  activityTypes,
  goals,
  onEditClick,
  fullBleedBorder = false,
}: DayContentViewProps) {
  // Get entries with their types for display
  const entriesWithTypes = useMemo(() => {
    if (!activity?.entries) return [];
    return Object.entries(activity.entries)
      .map(([typeId, entry]) => ({
        type: activityTypes[typeId],
        value: entry.value,
      }))
      .filter((item) => item.type)
      .sort((a, b) => a.type.order - b.type.order);
  }, [activity, activityTypes]);

  // Check for relevant goals on this date
  const relevantGoals = useMemo(
    () => getRelevantGoalsForDate(goals, dateStr),
    [goals, dateStr]
  );
  const hasRelevantGoals = relevantGoals.length > 0;

  return (
    <div className="space-y-4">
      {/* Activities Section */}
      <div className="space-y-3">
        {entriesWithTypes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No activities logged for this day.</p>
            {onEditClick && (
              <Button
                variant="muted"
                size="sm"
                onClick={onEditClick}
                className="mt-4"
              >
                Add activities
              </Button>
            )}
          </div>
        ) : (
          entriesWithTypes.map(({ type, value }) => (
            <ActivityViewCard key={type.id} type={type} value={value} />
          ))
        )}
      </div>

      {/* Goals Section */}
      {hasRelevantGoals && (
        <div className={cn(
          'pt-4 border-t',
          fullBleedBorder && '-mx-4 px-4'
        )}>
          <GoalStatusSection
            dateStr={dateStr}
            goals={goals}
            activityTypes={activityTypes}
            activity={activity}
          />
        </div>
      )}
    </div>
  );
}

interface DayContentEditProps {
  dateStr: string;
  activity?: Activity;
  activeTypes: ActivityType[];
  activityTypes: ActivityTypeMap;
  entries: { [typeId: string]: number | undefined };
  trackedTypes: Set<string>;
  onEntryChange: (typeId: string, value: number | undefined) => void;
  onToggleTracked: (typeId: string, tracked: boolean) => void;
  onOpenSettings?: () => void;
}

/**
 * Edit mode content for logging activities.
 * Used by both DayView and ActivityEntryDialog.
 */
export function DayContentEdit({
  activity,
  activeTypes,
  activityTypes,
  entries,
  trackedTypes,
  onEntryChange,
  onToggleTracked,
  onOpenSettings,
}: DayContentEditProps) {
  // Get all types that have entries (including deleted types for viewing)
  const typesWithExistingEntries = useMemo(() => {
    if (!activity?.entries) return [];
    return Object.keys(activity.entries)
      .map((typeId) => activityTypes[typeId])
      .filter(Boolean);
  }, [activity, activityTypes]);

  // Combine active types with any deleted types that have existing entries
  const allRelevantTypes = useMemo(
    () => [
      ...activeTypes,
      ...typesWithExistingEntries.filter(
        (t) => t.deleted && !activeTypes.find((at) => at.id === t.id)
      ),
    ],
    [activeTypes, typesWithExistingEntries]
  );

  const isNewEntry = !activity;

  // For existing entries, separate tracked and untracked types
  const trackedTypesList = allRelevantTypes.filter((type) =>
    trackedTypes.has(type.id)
  );
  const untrackedTypesList = allRelevantTypes.filter(
    (type) => !trackedTypes.has(type.id)
  );

  // Empty state when no activity types defined
  if (activeTypes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No activity types defined yet.</p>
        <p className="text-sm text-muted-foreground mb-4">
          Add activity types to start tracking.
        </p>
        {onOpenSettings && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSettings}
            className="gap-2 rounded-full"
          >
            <Settings className="h-4 w-4" />
            Add Activity Type
          </Button>
        )}
      </div>
    );
  }

  // For new entries, show all activity types directly (no accordion)
  if (isNewEntry) {
    return (
      <div className="space-y-3">
        {allRelevantTypes.map((type) => (
          <ActivityTypeCard
            key={type.id}
            type={type}
            value={entries[type.id]}
            isTracked={trackedTypes.has(type.id)}
            onChange={(value) => onEntryChange(type.id, value)}
            onToggleTracked={(tracked) => onToggleTracked(type.id, tracked)}
            isNewEntry={true}
          />
        ))}
      </div>
    );
  }

  // For existing entries in edit mode, show tracked first, then accordion for untracked
  return (
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
              onChange={(value) => onEntryChange(type.id, value)}
              onToggleTracked={(tracked) => onToggleTracked(type.id, tracked)}
              isNewEntry={false}
            />
          ))}
        </div>
      )}

      {/* Accordion for untracked types */}
      {untrackedTypesList.length > 0 && (
        <Accordion
          type="single"
          collapsible
          className={cn(trackedTypesList.length > 0 && 'pt-2')}
        >
          <AccordionItem value="untracked">
            <AccordionTrigger>
              {untrackedTypesList.length} untracked{' '}
              {untrackedTypesList.length === 1 ? 'activity' : 'activities'}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                {untrackedTypesList.map((type) => (
                  <ActivityTypeCard
                    key={type.id}
                    type={type}
                    value={entries[type.id]}
                    isTracked={false}
                    onChange={(value) => onEntryChange(type.id, value)}
                    onToggleTracked={(tracked) =>
                      onToggleTracked(type.id, tracked)
                    }
                    isNewEntry={false}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Show message if no tracked types yet */}
      {trackedTypesList.length === 0 && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          No activities logged yet. Expand above to add.
        </div>
      )}
    </>
  );
}

