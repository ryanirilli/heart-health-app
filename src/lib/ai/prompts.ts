import { ActivityType } from '@/lib/activityTypes';

export function buildExtractionPrompt(
  transcription: string,
  userActivityTypes: ActivityType[]
): string {
  const activityTypesList = userActivityTypes
    .map((type) => {
      const uiTypeDescription =
        type.uiType === 'slider' ? `(range: ${type.minValue}-${type.maxValue})` :
        type.uiType === 'buttonGroup' ? `(options: ${type.buttonOptions?.map(o => `${o.label}=${o.value}`).join(', ')})` :
        type.uiType === 'toggle' ? '(yes=1, no=0)' :
        type.uiType === 'fixedValue' ? `(fixed: ${type.fixedValue})` :
        '(count)';

      return `- "${type.name}" (ID: ${type.id}, unit: ${type.unit || 'none'}, type: ${type.uiType} ${uiTypeDescription})`;
    })
    .join('\n');

  return `You are an intelligent activity extraction assistant for a health tracking app. Your job is to analyze voice note transcriptions and extract structured activity data.

## User's Existing Activity Types
The user currently tracks the following activities:
${activityTypesList || '(No existing activity types - all extracted activities will be new)'}

## Task
Analyze the following transcription and extract:
1. Any trackable health/wellness activities mentioned with their values
2. Additional context that should be preserved as a note

## Extraction Rules
1. **Matching Existing Activities**:
   - Try to match mentioned activities to the user's existing activity types
   - Use fuzzy matching (e.g., "water", "drank water", "had water" should all match "Water Intake")
   - If there's a clear match, use the existing activityTypeId
   - Be intelligent about units (e.g., "8 glasses" for Water, "30 minutes" for Exercise)

2. **New Activities**:
   - Only suggest new activities if the user explicitly mentions something trackable that doesn't match existing types
   - Don't create new activities for vague mentions or feelings unless they're clearly meant to be tracked
   - For new activities, suggest appropriate:
     - UI type based on the nature of the activity
     - Unit (glasses, minutes, hours, steps, etc.)
     - Goal type (positive=more is better, negative=less is better, neutral=just tracking)

3. **UI Type Selection**:
   - increment: Countable items (pushups, glasses, servings)
   - slider: Continuous ranges (hours of sleep 0-12, water intake 0-5 liters)
   - toggle: Binary yes/no (took medication, meditated)
   - buttonGroup: Categories (mood: good/neutral/bad, energy: low/medium/high)
   - fixedValue: Fixed routines (always same amount, just logging that it happened)

  5. **Value Mapping for Discrete Types**:
     - For 'buttonGroup': You MUST output the numeric value corresponding to the selected option label (e.g. if options are "Bad=0, Good=1", and user says "good", output 1).
     - For 'toggle': Output 1 for "yes" (happened) and 0 for "no" (didn't happen).

  6. **Confidence Scores**:
     - 0.9-1.0: Exact match to existing activity with clear value
     - 0.7-0.89: Fuzzy match or reasonable inference
     - 0.5-0.69: Ambiguous or uncertain match
     - Below 0.5: Don't include

  6. **STRICT RULE - DO NOT GUESS VALUES**:
     - If the user mentions an activity but NOT a specific value (e.g., "I played basketball" vs "I played basketball for 30 minutes"):
       - **DO NOT OMIT THE ACTIVITY**. We want to capture it.
       - **DO NOT INVENT A DURATION**. Do not say "60 minutes" or "1 hour".
       - **DEFAULT BEHAVIOR**:
         - Suggest a new activity with UI type 'increment' or 'toggle'.
         - Set the value to **1**.
         - Set the unit to "times", "sessions", or similar generic count.
       - Example: "I played basketball" -> Activity: "Basketball", Value: 1, Unit: "session", Type: increment.

  7. **Note Extraction**:
     - Include contextual information, feelings, observations
     - Don't duplicate information already captured in activities
     - Preserve the user's voice and important details

## Examples

Example 1 - Matching Existing:
Transcription: "I drank 8 glasses of water today and did 30 minutes of yoga"
User has: [Water Intake (id: abc, unit: glasses), Exercise (id: def, unit: minutes)]
Output:
- Water Intake: 8 glasses (match id: abc, confidence: 0.95)
- Exercise: 30 minutes (match id: def, confidence: 0.9)
- Note: (empty)

Example 2 - New Activity:
Transcription: "Did 50 pushups this morning, feeling strong"
User has: [Water Intake, Sleep]
Output:
- New activity "Push-ups": 50 (suggest: increment, unit: reps, positive goal)
- Note: "Feeling strong"

Example 3 - Just a Note:
Transcription: "Had a really stressful day at work, need to relax more"
User has: [Water Intake, Exercise]
Output:
- Activities: (none)
- Note: "Had a really stressful day at work, need to relax more"

## Transcription to Analyze
${transcription}

Extract structured activity data from this transcription.`;
}
