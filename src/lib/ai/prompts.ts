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
   - **Subjective Statements**: actively look for subjective statements that match categorical activities.  (e.g., "I feel great" -> matches "Mood", "Energy", or other state-tracking activities).
   - If there's a clear match, use the existing activityTypeId
   - Be intelligent about units (e.g., "8 glasses" for Water, "30 minutes" for Exercise)

2. **Inference & Implicit Activities** (CRITICAL):
   - Users often imply activities without naming them directly.
   - **State of Being**: If the user describes a state (e.g., "I'm tired", "Great day", "Feeling stressed"), look for an Activity Type that tracks that state (e.g., "Energy", "Mood", "Stress Level").
   - **Action Inference**: If the user matches the *action* of an activity (e.g. "went for a run" -> "Exercise"), match it.
   - **Generic Rule**: ask yourself "Does this statement answer the question posed by one of the Activity Types?" (e.g. Statement: "Good day" answers Activity: "Mood?").

3. **New Activities**:
   - Only suggest new activities if the user explicitly mentions something trackable that doesn't match existing types
   - Don't create new activities for vague mentions or feelings unless they're clearly meant to be tracked
   - For new activities, suggest appropriate:
     - UI type based on the nature of the activity
     - Unit (glasses, minutes, hours, steps, etc.)
     - Goal type (positive=more is better, negative=less is better, neutral=just tracking)

4. **UI Type Selection**:
   - increment: Countable items (pushups, glasses, servings)
   - slider: Continuous ranges (hours of sleep 0-12, water intake 0-5 liters)
   - toggle: Binary yes/no (took medication, meditated)
   - buttonGroup: Categories (mood: good/neutral/bad, energy: low/medium/high)
   - fixedValue: Fixed routines (always same amount, just logging that it happened)

  5. **Value Mapping for Discrete Types**:
     - For 'buttonGroup': You MUST output the numeric value corresponding to the selected option label.
     - **Semantic Option Matching**: Compare the *meaning* and *sentiment* of the user's statement to the available option labels.
       - If the user says something that isn't an exact match, choose the option that best represents their intent.
       - *Example*: User says "I'm exhausted" and options are [Low, Medium, High] for Energy -> Select "Low".
       - *Example*: User says "Great day" and options are [Bad, Neutral, Good] for Mood -> Select "Good".
     - For 'toggle': Output 1 for "yes" (happened) and 0 for "no" (didn't happen).

  6. **Confidence Scores**:
     - 0.9-1.0: Exact match to existing activity with clear value
     - 0.7-0.89: Fuzzy match or reasonable inference
     - 0.5-0.69: Ambiguous or uncertain match
     - Below 0.5: Don't include

  7. **STRICT RULE - DO NOT GUESS VALUES**:
     - If the user mentions an activity but NOT a specific value (e.g., "I played basketball" vs "I played basketball for 30 minutes"):
       - **DO NOT OMIT THE ACTIVITY**. We want to capture it.
       - **DO NOT INVENT A DURATION**. Do not say "60 minutes" or "1 hour".
       - **DEFAULT BEHAVIOR**:
         - Suggest a new activity with UI type 'increment' or 'toggle'.
         - Set the value to **1**.
         - Set the unit to "times", "sessions", or similar generic count.
       - Example: "I played basketball" -> Activity: "Basketball", Value: 1, Unit: "session", Type: increment.

   8. **Negative Assertions (Zero Values)**:
      - If the user explicitly states they did **NOT** do an activity (e.g., "didn't drink alcohol", "had no sugar", "skipped dessert"):
        - **CAPTURE THIS ACTIVITY**.
        - **Value Assignment Rules**:
          - **toggle/yes_no**: Set value to **0** (representing "No" or "Did not occur").
          - **increment/slider/count**: Set value to **0**.
          - **fixedValue**: Set value to **0** (explicitly recording it didn't happen).
          - **buttonGroup**: Check if there's an option for "None", "Zero", "Bad", or "Low" that corresponds to value 0. If yes, use it. If not, use **0**.
        - This is vital for tracking negative goals (things to avoid) or simply logging non-occurrence.
        - If matching an existing activity, use its unit.

   9. **Note Extraction**:
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

Example 2 - Discrete Option & Negative Assertion:
Transcription: "Today was a really good day. I didn't drink any alcohol."
User has: [Mood (id: mmm, options: Bad=0, Neutral=1, Good=2), Alcohol (id: aaa)]
Output:
- Mood: 2 (mapped "good day" to option "Good")
- Alcohol: 0 (negative assertion)
- Note: (empty)

Example 3 - New Activity:
Transcription: "Did 50 pushups this morning, feeling strong"
User has: [Water Intake, Sleep]
Output:
- New activity "Push-ups": 50 (suggest: increment, unit: reps, positive goal)
- Note: "Feeling strong"

Example 4 - Just a Note:
Transcription: "Had a really stressful day at work, need to relax more"
User has: [Water Intake, Exercise] (No mood/stress tracking configured)
Output:
- Activities: (none)
- Note: "Had a really stressful day at work, need to relax more"

## Transcription to Analyze
${transcription}

Extract structured activity data from this transcription.`;
}
