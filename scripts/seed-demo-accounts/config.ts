/**
 * Configuration for demo account seeding
 */

export type DemoLevel = 'new-user' | 'just-started' | 'one-month' | 'six-months' | 'one-year';

export interface DemoAccountConfig {
  level: DemoLevel;
  email: string;
  displayName: string;
  description: string;
}

export const DEMO_PASSWORD = 'demo123';

export const DEMO_ACCOUNTS: DemoAccountConfig[] = [
  {
    level: 'new-user',
    email: 'demo-new@rhythm.com',
    displayName: 'Demo User (New)',
    description: 'Just signed up, empty account',
  },
  {
    level: 'just-started',
    email: 'demo-started@rhythm.com',
    displayName: 'Demo User (Just Started)',
    description: 'First week, exploring features',
  },
  {
    level: 'one-month',
    email: 'demo-1month@rhythm.com',
    displayName: 'Demo User (1 Month)',
    description: 'Building habits, first achievements',
  },
  {
    level: 'six-months',
    email: 'demo-6months@rhythm.com',
    displayName: 'Demo User (6 Months)',
    description: 'Established patterns, good progress',
  },
  {
    level: 'one-year',
    email: 'demo-1year@rhythm.com',
    displayName: 'Demo User (1 Year)',
    description: 'Power user, full feature utilization',
  },
];

export function getDemoAccountByLevel(level: DemoLevel): DemoAccountConfig | undefined {
  return DEMO_ACCOUNTS.find((account) => account.level === level);
}

export function isDemoEmail(email: string): boolean {
  return DEMO_ACCOUNTS.some((account) => account.email === email);
}
