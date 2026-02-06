/**
 * Pre-defined check-in templates for demo accounts
 * Uses real resource URLs for authenticity
 */

import type { CheckInAnalysis, CheckInDataSummary } from '../../../src/lib/checkIns';

export interface CheckInTemplate {
  periodOffset: number; // Days ago for period_end
  periodLength: number; // Length of period in days (usually 7)
  analysis: CheckInAnalysis;
  dataSummary: CheckInDataSummary;
}

// ============================================================================
// ONE MONTH CHECK-INS (2 check-ins)
// ============================================================================

export const ONE_MONTH_CHECKINS: CheckInTemplate[] = [
  {
    periodOffset: 21, // 3 weeks ago
    periodLength: 7,
    analysis: {
      title: 'Your First Week: Building the Foundation',
      overallSummary:
        "Congratulations on completing your first full week of tracking! Starting a new health journey takes courage, and you've already shown commitment by logging your activities consistently. These early days are about building awareness - noticing patterns in how you feel and what affects your energy. You're laying the groundwork for lasting change.",
      celebrations: [
        'Logged activities on 5 out of 7 days - great consistency!',
        'Averaged 6 glasses of water daily',
        'Tracked your mood every day this week',
      ],
      insights: [
        'Your mood tends to be higher on days you drink more water',
        'Sleep quality varies throughout the week - weekends show improvement',
        'You\'re most consistent with tracking in the mornings',
      ],
      recommendations: [
        'Try setting a reminder to log activities at the same time each day',
        'Consider adding one more activity type to track next week',
        'Keep a water bottle visible as a hydration reminder',
      ],
      resources: [
        {
          title: 'How to Build Habits That Actually Stick',
          url: 'https://jamesclear.com/habit-guide',
          description: 'James Clear\'s comprehensive guide to habit formation',
          type: 'article',
        },
        {
          title: 'r/GetDisciplined',
          url: 'https://reddit.com/r/getdisciplined',
          description: 'Community focused on building discipline and habits',
          type: 'subreddit',
        },
      ],
      weeklyFocus: 'Focus on maintaining your tracking streak - consistency beats perfection',
      motivation: 'Every expert was once a beginner. You\'re exactly where you need to be.',
    },
    dataSummary: {
      totalActivitiesLogged: 15,
      uniqueActivityTypes: 3,
      mostTrackedActivity: 'Water Intake',
      activityStreak: 3,
      voiceNotesCount: 0,
      transcriptionHighlights: [],
      goalsProgress: [
        {
          goalId: 'demo_goal_hydration',
          goalName: 'Daily Hydration',
          targetValue: 8,
          achievedValue: 6,
          percentComplete: 75,
        },
      ],
      achievementsEarned: 2,
      achievementNames: ['First Log', 'Hydration Hero'],
    },
  },
  {
    periodOffset: 7, // Last week
    periodLength: 7,
    analysis: {
      title: 'Week 3: Momentum Is Building',
      overallSummary:
        "Three weeks in and you're finding your rhythm! The initial excitement of starting something new often fades, but you've pushed through that phase. Your consistency is improving, and the data shows real progress. This is where habits start to feel less like work and more like routine.",
      celebrations: [
        'Hit your daily water goal 4 times this week!',
        'Started tracking exercise - already averaging 20 minutes daily',
        'Your average mood score improved from last week',
      ],
      insights: [
        'Exercise days correlate with better mood scores the following day',
        'You drink more water on days you exercise',
        'Medication adherence is strong - 6 out of 7 days',
      ],
      recommendations: [
        'Your exercise routine is working well - consider adding variety',
        'Try tracking how you feel after meals to spot patterns',
        'Celebrate small wins to maintain motivation',
      ],
      resources: [
        {
          title: 'The Power of Tiny Gains',
          url: 'https://jamesclear.com/continuous-improvement',
          description: 'How small improvements compound over time',
          type: 'article',
        },
        {
          title: 'r/Fitness',
          url: 'https://reddit.com/r/fitness',
          description: 'Supportive community for all fitness levels',
          type: 'subreddit',
        },
      ],
      weeklyFocus: 'This week, try to hit your water goal every single day',
      motivation: 'Progress, not perfection. Every step forward counts.',
    },
    dataSummary: {
      totalActivitiesLogged: 28,
      uniqueActivityTypes: 5,
      mostTrackedActivity: 'Water Intake',
      activityStreak: 5,
      voiceNotesCount: 0,
      transcriptionHighlights: [],
      goalsProgress: [
        {
          goalId: 'demo_goal_hydration',
          goalName: 'Daily Hydration',
          targetValue: 8,
          achievedValue: 7,
          percentComplete: 87,
        },
        {
          goalId: 'demo_goal_exercise',
          goalName: 'Weekly Exercise',
          targetValue: 150,
          achievedValue: 140,
          percentComplete: 93,
        },
      ],
      achievementsEarned: 4,
      achievementNames: ['Week Warrior', 'Exercise Starter', 'Mood Tracker', 'Consistency King'],
    },
  },
];

// ============================================================================
// SIX MONTH CHECK-INS (5 check-ins)
// ============================================================================

export const SIX_MONTH_CHECKINS: CheckInTemplate[] = [
  {
    periodOffset: 168, // ~24 weeks ago (early in journey)
    periodLength: 7,
    analysis: {
      title: 'Month 1: The Journey Begins',
      overallSummary:
        "Your first month has been about discovery. You've learned what activities matter to you, experimented with different tracking approaches, and started to see patterns emerge. This foundation will serve you well as you continue.",
      celebrations: [
        'Completed your first full month of tracking!',
        'Established a morning tracking routine',
        'Hit your water goal 20 times this month',
      ],
      insights: [
        'Weekday mornings are your most productive tracking time',
        'Your mood and sleep quality are closely linked',
        'Exercise frequency has steadily increased',
      ],
      recommendations: [
        'Consider setting a monthly goal for next month',
        'Your morning routine is solid - protect that time',
        'Try adding notes on particularly good or challenging days',
      ],
      resources: [
        {
          title: 'Why We Sleep - Sleep Foundation',
          url: 'https://www.sleepfoundation.org/how-sleep-works',
          description: 'Understanding the science of sleep',
          type: 'article',
        },
      ],
      weeklyFocus: 'Keep building on your morning routine consistency',
      motivation: 'One month down. You\'re just getting started.',
    },
    dataSummary: {
      totalActivitiesLogged: 85,
      uniqueActivityTypes: 4,
      mostTrackedActivity: 'Water Intake',
      activityStreak: 7,
      voiceNotesCount: 0,
      transcriptionHighlights: [],
      goalsProgress: [],
      achievementsEarned: 8,
      achievementNames: ['Month Milestone', 'Hydration Champion'],
    },
  },
  {
    periodOffset: 126, // ~18 weeks ago (month 2-3)
    periodLength: 7,
    analysis: {
      title: 'Building Momentum: Habits Taking Hold',
      overallSummary:
        "You're past the hardest part. Research shows it takes about 66 days on average to form a habit, and you're right in that window. The activities that once required effort are becoming automatic. Keep going.",
      celebrations: [
        'Maintained an 80% tracking consistency rate',
        'Your average mood score has improved by 15%',
        'Completed your first weekly exercise goal!',
      ],
      insights: [
        'Your sleep quality peaks mid-week, suggesting weekend routines could improve',
        'Days with morning walks show higher overall mood scores',
        'Hydration directly impacts your afternoon energy levels',
      ],
      recommendations: [
        'Your morning walks are working well - try making them a daily habit',
        'Consider a consistent weekend sleep schedule',
        'Track any new activities that interest you',
      ],
      resources: [
        {
          title: 'The Science of Habit Formation',
          url: 'https://www.healthline.com/health/how-long-does-it-take-to-form-a-habit',
          description: 'Understanding how habits develop in the brain',
          type: 'article',
        },
        {
          title: 'r/DecidingToBeBetter',
          url: 'https://reddit.com/r/DecidingToBeBetter',
          description: 'Community for self-improvement journeys',
          type: 'subreddit',
        },
      ],
      weeklyFocus: 'Add one morning walk to your weekend routine',
      motivation: 'Habits are the compound interest of self-improvement.',
    },
    dataSummary: {
      totalActivitiesLogged: 42,
      uniqueActivityTypes: 5,
      mostTrackedActivity: 'Water Intake',
      activityStreak: 12,
      voiceNotesCount: 1,
      transcriptionHighlights: ['Feeling more energetic lately'],
      goalsProgress: [
        {
          goalId: 'demo_goal_exercise',
          goalName: 'Weekly Exercise',
          targetValue: 150,
          achievedValue: 175,
          percentComplete: 100,
        },
      ],
      achievementsEarned: 12,
      achievementNames: ['Exercise Champion', '10-Day Streak'],
    },
  },
  {
    periodOffset: 84, // ~12 weeks ago (month 4)
    periodLength: 7,
    analysis: {
      title: 'Month 4: Finding Your Groove',
      overallSummary:
        "Four months of consistent effort, and the results speak for themselves. Your tracking has become intuitive, your patterns are clear, and you're making data-informed decisions about your health. This is what sustainable change looks like.",
      celebrations: [
        'Achieved a 14-day tracking streak!',
        'Your monthly mood average is the highest yet',
        'Reduced alcohol intake by 30% compared to month 1',
      ],
      insights: [
        'Your best days follow a morning walk + good hydration pattern',
        'Alcohol-free days show 20% better sleep quality',
        'Weekend routines have significantly improved',
      ],
      recommendations: [
        'Consider setting a longer-term goal based on your progress',
        'Your alcohol reduction is working - stay the course',
        'Share your success with someone who might benefit',
      ],
      resources: [
        {
          title: 'Benefits of Reducing Alcohol',
          url: 'https://www.nhs.uk/live-well/alcohol-advice/the-risks-of-drinking-too-much/',
          description: 'NHS guide on alcohol and health',
          type: 'article',
        },
      ],
      weeklyFocus: 'Maintain your alcohol reduction while keeping other habits strong',
      motivation: 'You are proof that change is possible.',
    },
    dataSummary: {
      totalActivitiesLogged: 48,
      uniqueActivityTypes: 6,
      mostTrackedActivity: 'Mood',
      activityStreak: 14,
      voiceNotesCount: 2,
      transcriptionHighlights: ['Sleeping better than ever', 'Morning routine is automatic now'],
      goalsProgress: [
        {
          goalId: 'demo_goal_alcohol',
          goalName: 'Limit Alcohol',
          targetValue: 8,
          achievedValue: 5,
          percentComplete: 100,
        },
      ],
      achievementsEarned: 18,
      achievementNames: ['Alcohol Reduction Champion', '2-Week Streak'],
    },
  },
  {
    periodOffset: 42, // ~6 weeks ago (month 5)
    periodLength: 7,
    analysis: {
      title: 'Month 5: Consistency Champion',
      overallSummary:
        "Five months of dedication, and you've transformed tracking from a task into a lifestyle. The data tells a story of steady improvement, resilience through setbacks, and growing self-awareness. You're not just tracking health - you're mastering it.",
      celebrations: [
        'Completed your 30-day sleep challenge!',
        '90% medication adherence this month',
        'Your morning walk habit is now fully established',
      ],
      insights: [
        'Your sleep challenge success correlates with improved mood stability',
        'Morning walks are now your most consistent activity',
        'Hydration remains steady even on challenging days',
      ],
      recommendations: [
        'Consider setting a new challenge to maintain momentum',
        'Your routines are solid - focus on quality over quantity',
        'Reflect on how far you\'ve come since day one',
      ],
      resources: [
        {
          title: 'The Importance of Sleep Consistency',
          url: 'https://www.sleepfoundation.org/sleep-hygiene/sleep-satisfaction-and-sleep-duration',
          description: 'How consistent sleep improves health',
          type: 'article',
        },
        {
          title: 'r/sleep',
          url: 'https://reddit.com/r/sleep',
          description: 'Community discussing sleep optimization',
          type: 'subreddit',
        },
      ],
      weeklyFocus: 'Celebrate your sleep challenge success and set a new goal',
      motivation: 'Five months ago, this version of you was just a dream.',
    },
    dataSummary: {
      totalActivitiesLogged: 52,
      uniqueActivityTypes: 6,
      mostTrackedActivity: 'Morning Walk',
      activityStreak: 21,
      voiceNotesCount: 3,
      transcriptionHighlights: ['Completed my sleep challenge!', 'Feeling stronger every day'],
      goalsProgress: [
        {
          goalId: 'demo_goal_sleep',
          goalName: '30-Day Sleep Challenge',
          targetValue: 7,
          achievedValue: 7.2,
          percentComplete: 100,
        },
      ],
      achievementsEarned: 25,
      achievementNames: ['Sleep Challenge Complete', '3-Week Streak', 'Morning Walk Master'],
    },
  },
  {
    periodOffset: 7, // Last week (current state at 6 months)
    periodLength: 7,
    analysis: {
      title: '6 Months: A Remarkable Transformation',
      overallSummary:
        "Six months ago, you took the first step on this journey. Today, you're living proof of what consistent, mindful effort can achieve. Your data tells a story of transformation - not just in numbers, but in habits, mindset, and self-understanding. This isn't the end; it's a new beginning.",
      celebrations: [
        'Achieved a 28-day tracking streak - your longest yet!',
        'All major health metrics improved from baseline',
        'Successfully integrated 6 activities into daily life',
      ],
      insights: [
        'Your holistic approach (sleep + exercise + hydration) creates compound benefits',
        'Mood stability has improved 40% since month one',
        'Weekend habits now match weekday consistency',
      ],
      recommendations: [
        'Set a 1-year vision goal to guide the next 6 months',
        'Consider mentoring someone starting their journey',
        'Document your transformation story - it might inspire others',
      ],
      resources: [
        {
          title: 'The Benefits of Long-term Habit Tracking',
          url: 'https://www.health.harvard.edu/blog/why-keep-a-food-diary-2019021115855',
          description: 'Harvard Health on the power of self-monitoring',
          type: 'article',
        },
        {
          title: 'r/selfimprovement',
          url: 'https://reddit.com/r/selfimprovement',
          description: 'Community celebrating personal growth journeys',
          type: 'subreddit',
        },
      ],
      weeklyFocus: 'Reflect on your journey and set intentions for the next 6 months',
      motivation: 'Six months of small steps led to this moment. Imagine where you\'ll be in another six.',
    },
    dataSummary: {
      totalActivitiesLogged: 54,
      uniqueActivityTypes: 6,
      mostTrackedActivity: 'Water Intake',
      activityStreak: 28,
      voiceNotesCount: 5,
      transcriptionHighlights: ['Six months - can\'t believe how far I\'ve come', 'This is just who I am now'],
      goalsProgress: [
        {
          goalId: 'demo_goal_hydration',
          goalName: 'Daily Hydration',
          targetValue: 8,
          achievedValue: 8.5,
          percentComplete: 100,
        },
        {
          goalId: 'demo_goal_exercise',
          goalName: 'Weekly Exercise',
          targetValue: 150,
          achievedValue: 180,
          percentComplete: 100,
        },
      ],
      achievementsEarned: 32,
      achievementNames: ['6 Month Milestone', 'Month Streak', 'All Goals Met'],
    },
  },
];

// ============================================================================
// ONE YEAR CHECK-INS (10 check-ins)
// ============================================================================

export const ONE_YEAR_CHECKINS: CheckInTemplate[] = [
  ...SIX_MONTH_CHECKINS.map((checkIn) => ({
    ...checkIn,
    periodOffset: checkIn.periodOffset + 182, // Shift by ~6 months
  })),
  // Add 5 more check-ins for the second half of the year
  {
    periodOffset: 140, // ~20 weeks ago
    periodLength: 7,
    analysis: {
      title: 'Month 7: Sustaining Excellence',
      overallSummary:
        "Past the 6-month mark, you've entered maintenance mode - and that's not a downgrade, it's an upgrade. Maintaining good habits is a skill unto itself. You're no longer building; you're sustaining and refining.",
      celebrations: [
        'Maintained all 7 activity types consistently',
        'Your 30-day streak is now routine',
        'Added alcoholic drinks tracking and immediately improved',
      ],
      insights: [
        'Adding a new metric (alcohol) hasn\'t disrupted existing habits',
        'Your body now expects the morning walk - missing it feels wrong',
        'Social events are no longer threats to your routine',
      ],
      recommendations: [
        'Consider sharing your approach with others',
        'Document what works so you can return to it if needed',
        'Experiment with optimizing existing habits rather than adding new ones',
      ],
      resources: [
        {
          title: 'Maintaining Healthy Habits Long-term',
          url: 'https://www.mayoclinic.org/healthy-lifestyle/adult-health/in-depth/healthy-habits/art-20048164',
          description: 'Mayo Clinic guide to sustainable health habits',
          type: 'article',
        },
      ],
      weeklyFocus: 'Focus on quality of habits rather than quantity',
      motivation: 'Maintenance is mastery in disguise.',
    },
    dataSummary: {
      totalActivitiesLogged: 56,
      uniqueActivityTypes: 7,
      mostTrackedActivity: 'Water Intake',
      activityStreak: 30,
      voiceNotesCount: 4,
      transcriptionHighlights: ['This is just part of my day now'],
      goalsProgress: [],
      achievementsEarned: 38,
      achievementNames: ['30-Day Streak', 'Full Tracker'],
    },
  },
  {
    periodOffset: 98, // ~14 weeks ago
    periodLength: 7,
    analysis: {
      title: 'Month 9: Through the Plateau',
      overallSummary:
        "Nine months in, you might feel like progress has slowed. That's normal - and it's actually a sign of success. You've reached a new normal. The metrics that once needed effort now reflect your default state. Growth at this stage is subtle but profound.",
      celebrations: [
        'Survived a busy month without breaking habits',
        'Your baseline mood is now what used to be a good day',
        'Recovery from missed days is now automatic',
      ],
      insights: [
        'Stress affects your sleep first - an early warning system',
        'Your minimum days are better than your maximum days used to be',
        'Habit stacking (walk + podcast) increases consistency',
      ],
      recommendations: [
        'Trust your systems even when motivation is low',
        'Use stress as information, not an excuse',
        'Consider a mini-challenge to reignite engagement',
      ],
      resources: [
        {
          title: 'Breaking Through Plateaus',
          url: 'https://www.healthline.com/nutrition/weight-loss-plateau',
          description: 'Understanding and overcoming plateaus',
          type: 'article',
        },
        {
          title: 'r/theXeffect',
          url: 'https://reddit.com/r/theXeffect',
          description: 'Community using card-based habit tracking',
          type: 'subreddit',
        },
      ],
      weeklyFocus: 'Notice and appreciate how far your baseline has moved',
      motivation: 'The plateau is where champions are built.',
    },
    dataSummary: {
      totalActivitiesLogged: 52,
      uniqueActivityTypes: 7,
      mostTrackedActivity: 'Mood',
      activityStreak: 25,
      voiceNotesCount: 6,
      transcriptionHighlights: ['Busy week but kept going', 'This is who I am now'],
      goalsProgress: [],
      achievementsEarned: 42,
      achievementNames: ['Plateau Breaker', 'Stress Resilient'],
    },
  },
  {
    periodOffset: 56, // ~8 weeks ago
    periodLength: 7,
    analysis: {
      title: 'Month 11: The Home Stretch',
      overallSummary:
        "Eleven months. You're approaching a full year of consistent health tracking and improvement. This is rare. Most people who start don't make it this far. You're not most people. The finish line is in sight, but more importantly, you've proven you don't need a finish line.",
      celebrations: [
        'Approaching one year with all major habits intact',
        'Your data now spans all seasons - true pattern recognition',
        'Successfully navigated holidays without derailing',
      ],
      insights: [
        'Seasonal patterns are clear: winter requires more intentional movement',
        'Your system is resilient to travel and schedule disruptions',
        'Morning routines are now non-negotiable identity markers',
      ],
      recommendations: [
        'Start planning your 1-year reflection',
        'Consider what new goals might serve you in year two',
        'Document lessons learned for your future self',
      ],
      resources: [
        {
          title: 'The Identity-Based Approach to Habits',
          url: 'https://jamesclear.com/identity-based-habits',
          description: 'How habits become part of who you are',
          type: 'article',
        },
      ],
      weeklyFocus: 'Prepare for your 1-year milestone with intention',
      motivation: 'You\'re not just tracking habits. You\'ve become someone who has them.',
    },
    dataSummary: {
      totalActivitiesLogged: 55,
      uniqueActivityTypes: 7,
      mostTrackedActivity: 'Water Intake',
      activityStreak: 35,
      voiceNotesCount: 8,
      transcriptionHighlights: ['Almost one year!', 'Can\'t imagine not doing this'],
      goalsProgress: [],
      achievementsEarned: 48,
      achievementNames: ['Season Survivor', 'Holiday Champion'],
    },
  },
  {
    periodOffset: 14, // 2 weeks ago
    periodLength: 7,
    analysis: {
      title: 'One Year Approaches: Final Preparations',
      overallSummary:
        "The penultimate week of your first year. What started as an experiment has become a lifestyle. What began as tracking has evolved into genuine self-knowledge. You now understand your body, your patterns, your triggers, and your strengths in ways that would have seemed impossible 12 months ago.",
      celebrations: [
        'Achieved 50+ achievements throughout the year',
        'Your consistency rate exceeds 85% across all activities',
        'Successfully hit both your active goals this week',
      ],
      insights: [
        'Your year-over-year data shows clear positive trajectories',
        'Habits now feel effortless because they\'re identity-level changes',
        'You\'ve built a system that survives bad days and bad weeks',
      ],
      recommendations: [
        'Set aside time for a comprehensive year review',
        'Consider which habits serve you best and which could be simplified',
        'Think about helping others start their own journey',
      ],
      resources: [
        {
          title: 'Annual Review Process',
          url: 'https://jamesclear.com/annual-review',
          description: 'How to conduct a meaningful year-end review',
          type: 'article',
        },
        {
          title: 'r/productivity',
          url: 'https://reddit.com/r/productivity',
          description: 'Community for productivity and habit optimization',
          type: 'subreddit',
        },
      ],
      weeklyFocus: 'Reflect on the person you were when you started',
      motivation: 'A year of small steps created a giant leap.',
    },
    dataSummary: {
      totalActivitiesLogged: 54,
      uniqueActivityTypes: 7,
      mostTrackedActivity: 'Morning Walk',
      activityStreak: 42,
      voiceNotesCount: 10,
      transcriptionHighlights: ['One week to go!', 'This has changed my life'],
      goalsProgress: [
        {
          goalId: 'demo_goal_hydration',
          goalName: 'Daily Hydration',
          targetValue: 8,
          achievedValue: 9,
          percentComplete: 100,
        },
        {
          goalId: 'demo_goal_exercise',
          goalName: 'Weekly Exercise',
          targetValue: 150,
          achievedValue: 185,
          percentComplete: 100,
        },
      ],
      achievementsEarned: 52,
      achievementNames: ['50+ Achievements', 'Year Warrior', '6-Week Streak'],
    },
  },
  {
    periodOffset: 7, // Last week (current state at 1 year)
    periodLength: 7,
    analysis: {
      title: 'One Year: The Transformation Complete',
      overallSummary:
        "One year ago, you made a decision. Today, you celebrate the culmination of 365 days of showing up, tracking, adjusting, and growing. But this isn't really an ending - it's proof that you can do this. Forever. Your health is no longer a goal to achieve; it's a life you live. The data tells a story of transformation, but the real story is simpler: you became the person you wanted to be.",
      celebrations: [
        'Completed ONE FULL YEAR of health tracking!',
        'Earned 55+ achievements across all activity types',
        'Improved every major health metric from baseline',
        'Maintained habits through seasons, holidays, and challenges',
      ],
      insights: [
        'Your baseline health metrics are now in optimal ranges',
        'Consistency compounds: small daily actions created massive change',
        'You\'ve built systems that don\'t require willpower',
        'Your identity has shifted from "trying to be healthy" to "being healthy"',
      ],
      recommendations: [
        'Celebrate this milestone - you\'ve earned it',
        'Set intentions for year two: deepen, expand, or simplify',
        'Share your journey to inspire others',
        'Trust yourself - you\'ve proven you can do this',
      ],
      resources: [
        {
          title: 'Atomic Habits - Full Book Summary',
          url: 'https://jamesclear.com/atomic-habits-summary',
          description: 'The complete framework for lasting behavior change',
          type: 'article',
        },
        {
          title: 'The Power of Long-term Thinking',
          url: 'https://www.ted.com/talks/simon_sinek_how_great_leaders_inspire_action',
          description: 'Simon Sinek on purpose-driven action',
          type: 'video',
        },
        {
          title: 'r/selfimprovement',
          url: 'https://reddit.com/r/selfimprovement',
          description: 'Community for celebrating and sharing growth',
          type: 'subreddit',
        },
      ],
      weeklyFocus: 'This week, just be proud. You did it.',
      motivation: 'A year ago, you dreamed of being where you are today. Dream bigger.',
    },
    dataSummary: {
      totalActivitiesLogged: 56,
      uniqueActivityTypes: 7,
      mostTrackedActivity: 'Water Intake',
      activityStreak: 49,
      voiceNotesCount: 12,
      transcriptionHighlights: [
        'One year complete!',
        'This is the best version of me',
        'Can\'t wait for year two',
      ],
      goalsProgress: [
        {
          goalId: 'demo_goal_hydration',
          goalName: 'Daily Hydration',
          targetValue: 8,
          achievedValue: 9.2,
          percentComplete: 100,
        },
        {
          goalId: 'demo_goal_exercise',
          goalName: 'Weekly Exercise',
          targetValue: 150,
          achievedValue: 195,
          percentComplete: 100,
        },
        {
          goalId: 'demo_goal_medication',
          goalName: 'Medication Streak',
          targetValue: 1,
          achievedValue: 1,
          percentComplete: 100,
        },
      ],
      achievementsEarned: 55,
      achievementNames: ['1 Year Milestone', '50+ Achievements', '7-Week Streak', 'Complete Transformation'],
    },
  },
];

/**
 * Get check-in templates for a specific demo level
 */
export function getCheckInsForLevel(level: string): CheckInTemplate[] {
  switch (level) {
    case 'new-user':
    case 'just-started':
      return []; // No check-ins for new/just-started users
    case 'one-month':
      return ONE_MONTH_CHECKINS;
    case 'six-months':
      return SIX_MONTH_CHECKINS;
    case 'one-year':
      return ONE_YEAR_CHECKINS;
    default:
      return [];
  }
}
