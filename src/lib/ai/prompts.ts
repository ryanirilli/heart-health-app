import { ActivityType } from '@/lib/activityTypes';

/**
 * Generate comprehensive synonyms and related phrases for an activity type.
 * This helps the AI recognize the many ways users might refer to an activity.
 */
function generateActivitySynonyms(type: ActivityType): string[] {
  const name = type.name.toLowerCase();
  const unit = (type.unit || '').toLowerCase();
  const synonyms: string[] = [];
  
  // Common health/wellness activity mappings
  const synonymMap: Record<string, string[]> = {
    // Water/Hydration
    'water': ['water', 'hydration', 'hydrated', 'drank', 'drinking', 'glasses', 'cups', 'bottles', 'h2o', 'fluids', 'liquid', 'thirsty'],
    'hydration': ['water', 'hydration', 'hydrated', 'drank', 'drinking', 'glasses', 'cups', 'bottles', 'h2o', 'fluids'],
    
    // Sleep
    'sleep': ['sleep', 'slept', 'sleeping', 'rest', 'rested', 'nap', 'napped', 'bed', 'tired', 'exhausted', 'insomnia', 'hours of sleep'],
    
    // Exercise & Movement
    'exercise': ['exercise', 'exercised', 'workout', 'worked out', 'gym', 'training', 'trained', 'physical activity', 'active', 'fitness', 'cardio', 'weights', 'run', 'running', 'ran', 'walk', 'walking', 'walked', 'hike', 'hiking', 'hiked', 'swim', 'swimming', 'swam', 'bike', 'biking', 'cycling', 'cycled', 'sports', 'played'],
    'workout': ['exercise', 'exercised', 'workout', 'worked out', 'gym', 'training', 'trained', 'fitness', 'lifting', 'lifted'],
    'steps': ['steps', 'walked', 'walking', 'walk', 'pedometer', 'movement', 'moving', 'moved'],
    'running': ['run', 'running', 'ran', 'jog', 'jogging', 'jogged', 'marathon', 'sprint', 'sprinted'],
    'walking': ['walk', 'walking', 'walked', 'stroll', 'strolled', 'hike', 'hiked', 'hiking'],
    
    // Nutrition & Diet
    'calories': ['calories', 'calorie', 'cal', 'kcal', 'food', 'ate', 'eating', 'eaten', 'diet', 'nutrition'],
    'meals': ['meal', 'meals', 'ate', 'eating', 'eaten', 'breakfast', 'lunch', 'dinner', 'food', 'snack'],
    'sugar': ['sugar', 'sweet', 'sweets', 'candy', 'dessert', 'cake', 'cookies', 'ice cream', 'chocolate', 'sugary'],
    'alcohol': ['alcohol', 'drink', 'drinks', 'drank', 'drinking', 'beer', 'wine', 'cocktail', 'whiskey', 'vodka', 'bourbon', 'liquor', 'booze', 'drunk', 'sober', 'tipsy'],
    'caffeine': ['caffeine', 'coffee', 'tea', 'espresso', 'latte', 'cappuccino', 'caffeinated', 'decaf'],
    'coffee': ['coffee', 'caffeine', 'espresso', 'latte', 'cappuccino', 'brew', 'java', 'cups of coffee'],
    'vegetables': ['vegetables', 'veggies', 'salad', 'greens', 'leafy', 'broccoli', 'spinach', 'kale', 'carrots'],
    'fruits': ['fruit', 'fruits', 'apple', 'banana', 'orange', 'berries', 'berry'],
    'protein': ['protein', 'meat', 'chicken', 'beef', 'fish', 'eggs', 'tofu', 'beans'],
    'fast food': ['fast food', 'junk food', 'mcdonalds', 'burger', 'fries', 'takeout', 'take-out', 'delivery'],
    
    // Mental Health & Mood
    'mood': ['mood', 'feeling', 'felt', 'feel', 'emotions', 'emotional', 'happy', 'sad', 'anxious', 'stressed', 'good day', 'bad day', 'great day', 'terrible day', 'okay', 'fine', 'doing well', 'doing good', 'doing bad', 'in a good mood', 'in a bad mood'],
    'stress': ['stress', 'stressed', 'stressful', 'anxiety', 'anxious', 'worried', 'worry', 'tense', 'tension', 'overwhelmed', 'calm', 'relaxed', 'peaceful'],
    'anxiety': ['anxiety', 'anxious', 'nervous', 'worried', 'worry', 'panic', 'panicked', 'stress', 'stressed'],
    'energy': ['energy', 'energetic', 'tired', 'exhausted', 'fatigue', 'fatigued', 'lethargic', 'sluggish', 'peppy', 'vibrant', 'alive', 'drained', 'burnt out'],
    'happiness': ['happy', 'happiness', 'joy', 'joyful', 'content', 'satisfied', 'pleased', 'cheerful', 'delighted', 'good mood'],
    
    // Mindfulness & Wellness
    'meditation': ['meditation', 'meditated', 'meditate', 'mindfulness', 'mindful', 'breathwork', 'breathing', 'zen', 'calm', 'centered', 'present'],
    'journaling': ['journal', 'journaled', 'journaling', 'wrote', 'writing', 'diary', 'reflection', 'reflected'],
    'gratitude': ['gratitude', 'grateful', 'thankful', 'appreciation', 'appreciated', 'blessed'],
    'reading': ['read', 'reading', 'book', 'books', 'pages'],
    
    // Health Metrics
    'weight': ['weight', 'weighed', 'weighing', 'pounds', 'lbs', 'kilos', 'kg', 'scale'],
    'blood pressure': ['blood pressure', 'bp', 'systolic', 'diastolic', 'hypertension'],
    'heart rate': ['heart rate', 'pulse', 'bpm', 'heartbeat', 'resting heart rate'],
    
    // Medications & Supplements
    'medication': ['medication', 'medicine', 'meds', 'pills', 'took', 'prescription', 'drug'],
    'supplements': ['supplement', 'supplements', 'vitamins', 'vitamin', 'multivitamin', 'fish oil', 'omega', 'magnesium', 'took'],
    'vitamins': ['vitamin', 'vitamins', 'multivitamin', 'supplements', 'took vitamins'],
    
    // Social & Relationships
    'social': ['social', 'socializing', 'socialized', 'friends', 'family', 'hangout', 'hung out', 'people', 'conversation', 'talked'],
    'connection': ['connection', 'connected', 'friends', 'family', 'loved ones', 'partner', 'spouse'],
    
    // Bad Habits
    'smoking': ['smoke', 'smoking', 'smoked', 'cigarette', 'cigarettes', 'nicotine', 'vape', 'vaping', 'vaped'],
    'screen time': ['screen time', 'phone', 'scrolling', 'scrolled', 'social media', 'tv', 'television', 'netflix', 'youtube', 'instagram', 'tiktok', 'twitter', 'x'],
    
    // Pain & Symptoms
    'pain': ['pain', 'painful', 'hurt', 'hurting', 'ache', 'aching', 'sore', 'soreness', 'discomfort'],
    'headache': ['headache', 'migraine', 'head pain', 'head hurts', 'head ache'],
  };
  
  // Check each key for matches with the activity name
  for (const [key, syns] of Object.entries(synonymMap)) {
    if (name.includes(key) || key.includes(name)) {
      synonyms.push(...syns);
    }
  }
  
  // Add the unit as a potential matching term
  if (unit) {
    synonyms.push(unit);
  }
  
  // Add the activity name itself and variations
  synonyms.push(name);
  synonyms.push(name.replace(/\s+/g, '')); // without spaces
  synonyms.push(name.replace(/[-_]/g, ' ')); // with spaces instead of dashes
  
  // Deduplicate
  return [...new Set(synonyms)];
}

/**
 * Format activity type with rich context for the AI
 */
function formatActivityTypeForPrompt(type: ActivityType): string {
  const synonyms = generateActivitySynonyms(type);
  
  let uiTypeDescription = '';
  if (type.uiType === 'slider') {
    uiTypeDescription = `range: ${type.minValue}-${type.maxValue}`;
  } else if (type.uiType === 'buttonGroup' && type.buttonOptions) {
    uiTypeDescription = `options: ${type.buttonOptions.map(o => `"${o.label}"=${o.value}`).join(', ')}`;
  } else if (type.uiType === 'toggle') {
    uiTypeDescription = 'yes=1, no=0';
  } else if (type.uiType === 'fixedValue') {
    uiTypeDescription = `fixed value: ${type.fixedValue}`;
  } else {
    uiTypeDescription = 'counter/increment';
  }
  
  // Build example phrases that should match this activity
  const examplePhrases = generateExamplePhrases(type);
  
  return `
### "${type.name}"
- **ID**: ${type.id}
- **Unit**: ${type.unit || 'none'}
- **Type**: ${type.uiType} (${uiTypeDescription})
- **Keywords/Synonyms**: ${synonyms.slice(0, 15).join(', ')}
- **Example phrases that SHOULD match this activity**: ${examplePhrases.join('; ')}`;
}

/**
 * Generate example phrases that should match an activity
 */
function generateExamplePhrases(type: ActivityType): string[] {
  const name = type.name.toLowerCase();
  const phrases: string[] = [];
  
  // Generic phrases based on UI type
  if (type.uiType === 'toggle') {
    phrases.push(`"I ${name.replace(' ', 'ed ')}"`, `"Did my ${name}"`, `"Took my ${name}"`);
  } else if (type.uiType === 'buttonGroup' && type.buttonOptions) {
    // For button groups, show how sentiments map
    const options = type.buttonOptions;
    if (options.length >= 2) {
      const lowOption = options[0];
      const highOption = options[options.length - 1];
      
      if (name.includes('mood') || name.includes('feeling')) {
        phrases.push(`"Great day" → ${highOption.label}`, `"Terrible day" → ${lowOption.label}`, `"Feeling good/bad/okay"`);
      } else if (name.includes('energy')) {
        phrases.push(`"Exhausted" → ${lowOption.label}`, `"Full of energy" → ${highOption.label}`, `"Tired/energetic"`);
      } else if (name.includes('stress')) {
        phrases.push(`"Very stressed" → high`, `"Calm and relaxed" → low`);
      } else {
        phrases.push(`"${lowOption.label}" or "${highOption.label}"`);
      }
    }
  } else if (type.uiType === 'increment' || type.uiType === 'slider') {
    const unit = type.unit || 'times';
    phrases.push(`"${5} ${unit} of ${name}"`, `"did ${name}"`, `"had some ${name}"`);
  }
  
  // Specific activity examples
  if (name.includes('water') || name.includes('hydration')) {
    phrases.push('"drank 8 glasses"', '"staying hydrated"', '"had water"');
  } else if (name.includes('sleep')) {
    phrases.push('"slept 7 hours"', '"got good sleep"', '"terrible sleep"');
  } else if (name.includes('exercise') || name.includes('workout')) {
    phrases.push('"worked out"', '"went to the gym"', '"did cardio"', '"went for a run"');
  } else if (name.includes('mood')) {
    phrases.push('"good day"', '"feeling happy"', '"rough day"', '"stressed out"');
  } else if (name.includes('alcohol')) {
    phrases.push('"had a beer"', '"wine with dinner"', '"no drinking"', '"stayed sober"');
  } else if (name.includes('meditation') || name.includes('mindful')) {
    phrases.push('"meditated"', '"did some breathing"', '"practiced mindfulness"');
  }
  
  return phrases.slice(0, 5);
}

export function buildExtractionPrompt(
  transcription: string,
  userActivityTypes: ActivityType[]
): string {
  // Build rich activity type descriptions
  const activityTypesList = userActivityTypes.length > 0
    ? userActivityTypes.map(formatActivityTypeForPrompt).join('\n')
    : '(No existing activity types - all extracted activities will be new)';

  return `You are an expert activity extraction assistant for a health tracking app. Your PRIMARY job is to match user statements to their EXISTING activity types. You are extremely good at understanding context, synonyms, and implied meanings.

# CRITICAL: PRIORITIZE MATCHING EXISTING ACTIVITIES

Your #1 priority is to recognize when the user is talking about an activity they already track. Users rarely say the exact activity name - they use natural language. You must understand the INTENT behind their words.

## User's Existing Activity Types

The user tracks these activities. Study them carefully - these are what you should be matching to:
${activityTypesList}

## MATCHING RULES (IN ORDER OF PRIORITY)

### Rule 1: AGGRESSIVE Existing Activity Matching
- **ALWAYS try to match to existing activities first**
- Use fuzzy matching, synonyms, and semantic understanding  
- Match based on meaning, not just keywords
- If the user mentions ANYTHING related to an existing activity, match it

### Rule 2: Semantic Understanding for Categorical Activities
For buttonGroup/categorical activities (like Mood, Energy, Stress):
- Map subjective statements to the appropriate option
- "Great day", "feeling good", "things went well" → positive option
- "Terrible day", "rough day", "struggling" → negative option
- "Okay", "fine", "nothing special" → neutral/middle option
- **The value must be the NUMERIC value of the matched option**

### Rule 3: State-of-Being Inference
When users describe HOW they feel, match to state-tracking activities:
- "I'm exhausted" → Energy (low value)
- "Feeling anxious" → Stress or Anxiety (high value)  
- "In a great mood" → Mood (positive value)
- "Slept terribly" → Sleep Quality (low value)

### Rule 4: Action-Based Matching
Match actions to activities:
- "went for a run" → Exercise/Running/Steps
- "had a beer" → Alcohol
- "drank a lot of water" → Water/Hydration
- "took my vitamins" → Vitamins/Supplements/Medication

### Rule 5: Negative Assertions (Value = 0)
When users say they DIDN'T do something:
- "Didn't drink any alcohol" → Alcohol with value 0
- "No caffeine today" → Coffee/Caffeine with value 0
- "Skipped the gym" → Exercise with value 0

### Rule 6: Value Mapping for Categorical Types
- For 'buttonGroup': Output the NUMERIC value of the matching option
  - Example: options are ["Bad"=0, "Neutral"=1, "Good"=2], user says "great day" → output value 2
- For 'toggle': Output 1 for yes/happened, 0 for no/didn't happen
- For 'increment'/'slider': Extract the numeric value mentioned, or use 1 if just acknowledging the activity

### Rule 7: Don't Guess Values
- If the user mentions an activity without a specific value (e.g., "I exercised" not "I exercised for 30 minutes"):
  - Still capture the activity
  - Use value 1 (acknowledging it happened)
  - Don't invent durations or amounts

### Rule 8: New Activities (ONLY as last resort)
Only create NEW activities if:
- The activity is clearly trackable
- It genuinely doesn't match ANY existing activity
- The user explicitly mentions wanting to track something new
- For new activities, suggest: UI type, unit, and goal type (positive/negative/neutral)

### Rule 9: Note Extraction
- Any contextual information that doesn't fit into activities
- Don't duplicate what's already captured in activities
- Preserve the user's voice and important details

## Examples

Example 1 - Matching Existing:
Transcription: "I drank 8 glasses of water today and did 30 minutes of yoga"
User has: [Water Intake (id: abc, unit: glasses), Exercise (id: def, unit: minutes)]
Output:
- Water Intake: value=8, activityTypeId=abc
- Exercise: value=30, activityTypeId=def
- Note: ""

Example 2 - Categorical Matching:
Transcription: "Today was a really good day. I didn't drink any alcohol."
User has: [Mood (id: mmm, options: Bad=0, Neutral=1, Good=2), Alcohol (id: aaa)]
Output:
- Mood: value=2, activityTypeId=mmm (mapped "good day" to "Good" option)
- Alcohol: value=0, activityTypeId=aaa (negative assertion)
- Note: ""

Example 3 - State Inference:
Transcription: "Feeling exhausted today, but managed to meditate for 10 minutes"
User has: [Energy (id: eee, options: Low=0, Medium=1, High=2), Meditation (id: med, unit: minutes)]
Output:
- Energy: value=0, activityTypeId=eee (exhausted → Low)
- Meditation: value=10, activityTypeId=med
- Note: ""

## Transcription to Analyze
${transcription}

Extract structured activity data from this transcription. Remember: PRIORITIZE MATCHING EXISTING ACTIVITIES.`;
}
