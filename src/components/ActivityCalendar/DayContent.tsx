'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ActivityType, ActivityTypeMap } from '@/lib/activityTypes';
import { Activity, ActivityEntry, ActivityMap } from '@/lib/activities';
import { GoalMap, getRelevantGoalsForDate } from '@/lib/goals';
import { ActivityViewCard, ActivityTypeCard } from './ActivityFormContent';
import { GoalStatusSection } from './GoalStatusSection';
import { useGoals } from '@/components/Goals';
import { cn } from '@/lib/utils';
import { Settings, Target, MessageSquareMore, Mic } from 'lucide-react';
import { VoiceNoteInlinePlayer } from './VoiceNoteInlinePlayer';

interface DayContentViewProps {
  dateStr: string;
  activity?: Activity;
  activityTypes: ActivityTypeMap;
  goals: GoalMap;
  onEditClick?: () => void;
  onNoteClick?: () => void;
  /** Whether to show full-bleed border for goals section */
  fullBleedBorder?: boolean;
  /** Padding class to use for full-bleed border (default: 4 for px-4 containers) */
  containerPadding?: 4 | 6;
  /** All activities - needed for cumulative goal calculations */
  allActivities?: ActivityMap;
  /** Voice note URL for inline player */
  voiceNoteUrl?: string;
  /** Duration of existing voice note in seconds */
  voiceNoteDuration?: number;
  /** Handler for voice note click */
  onVoiceNoteClick?: () => void;
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
  onNoteClick,
  fullBleedBorder = false,
  containerPadding = 4,
  allActivities,
  voiceNoteUrl,
  voiceNoteDuration,
  onVoiceNoteClick,
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
    <>
      {/* Activities Section */}
      <div className="space-y-3">
        {entriesWithTypes.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
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

      {/* Note Section - in view mode, only show if note exists */}
      {activity?.note && (
        <div
          className="mt-4 w-full p-3 rounded-lg bg-muted/50 border border-border/50 text-left flex items-start gap-3"
        >
          <MessageSquareMore className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <p className="text-sm text-foreground whitespace-pre-wrap flex-1">{activity.note}</p>
        </div>
      )}

      {/* Voice Note Section - View Mode */}
      {voiceNoteUrl && (
        <div 
          onClick={onVoiceNoteClick}
          className={cn(
            "mt-3 w-full p-3 rounded-lg bg-muted/50 border border-border/50 transition-colors",
            onVoiceNoteClick && "hover:bg-muted/70 cursor-pointer"
          )}
        >
          <VoiceNoteInlinePlayer
            audioUrl={voiceNoteUrl}
            duration={voiceNoteDuration || 0}
          />
        </div>
      )}

      {/* Goals Section - full bleed with subtle background */}
      {hasRelevantGoals && (
        <div className={cn(
          'mt-4 pt-4 pb-4 bg-contrast',
          fullBleedBorder && containerPadding === 4 && '-mx-4 px-4 -mb-4',
          fullBleedBorder && containerPadding === 6 && '-mx-6 px-6 -mb-6'
        )}>
          <GoalStatusSection
            dateStr={dateStr}
            goals={goals}
            activityTypes={activityTypes}
            activity={activity}
            allActivities={allActivities}
          />
        </div>
      )}

      {/* Goal CTA - show when activities exist but no goals have been created */}
      {entriesWithTypes.length > 0 && !hasRelevantGoals && <CreateGoalCTA />}
    </>
  );
}

/**
 * Minimal CTA to encourage users to create their first goal
 * Only shown when they have activities but no goals
 */
function CreateGoalCTA() {
  const { goalsList, openCreateDialog } = useGoals();

  // Only show if user has no goals at all
  if (goalsList.length > 0) return null;

  return (
    <button
      onClick={openCreateDialog}
      className="mt-4 w-full flex items-center justify-center gap-1.5 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
    >
      <Target className="h-3.5 w-3.5" />
      <span className="text-sm">Set a goal</span>
    </button>
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
  onNoteClick?: () => void;
  /** Handler for voice note click - only shown when feature flag enabled */
  onVoiceNoteClick?: () => void;
  /** Voice note URL for inline player */
  voiceNoteUrl?: string;
  /** Duration of existing voice note in seconds */
  voiceNoteDuration?: number;
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
  onNoteClick,
  onVoiceNoteClick,
  voiceNoteUrl,
  voiceNoteDuration,
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

  // Check if a specific activity type has an existing saved entry
  // (used to determine if delete should require confirmation)
  const hasExistingEntry = (typeId: string) => !!activity?.entries?.[typeId];

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

  // Show all activity types directly with tap to log
  return (
    <>
      <div className="space-y-3">
        {allRelevantTypes.map((type) => (
          <ActivityTypeCard
            key={type.id}
            type={type}
            value={entries[type.id]}
            isTracked={trackedTypes.has(type.id)}
            onChange={(value) => onEntryChange(type.id, value)}
            onToggleTracked={(tracked) => onToggleTracked(type.id, tracked)}
            isNewEntry={!hasExistingEntry(type.id)}
          />
        ))}
      </div>

      {/* Note Section - clickable row */}
      {onNoteClick && (
        <button
          onClick={onNoteClick}
          className="mt-4 w-full p-3 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted/70 transition-colors text-left flex items-start gap-3"
        >
          <MessageSquareMore className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          {activity?.note ? (
            <p className="text-sm text-foreground whitespace-pre-wrap flex-1">{activity.note}</p>
          ) : (
            <span className="text-sm text-muted-foreground">Add note</span>
          )}
        </button>
      )}

      {/* Voice Note Section - inline player when exists, clickable button when not */}
      {onVoiceNoteClick && (
        voiceNoteUrl ? (
          <div
            onClick={onVoiceNoteClick}
            className="mt-3 w-full p-3 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted/70 transition-colors cursor-pointer"
          >
            <VoiceNoteInlinePlayer
              audioUrl={voiceNoteUrl}
              duration={voiceNoteDuration || 0}
            />
          </div>
        ) : (
          <button
            onClick={onVoiceNoteClick}
            className="mt-3 w-full p-3 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted/70 transition-colors text-left flex items-center gap-3"
          >
            <Mic className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground">Add voice note</span>
          </button>
        )
      )}
    </>
  );
}

