'use client';

import { createContext, useContext, ReactNode } from 'react';

interface ActivityConfig {
  /** The unit label for activity values (e.g., "drinks", "steps", "minutes") */
  unit: string;
  /** Whether to show the unit as plural when value > 1 */
  pluralize?: boolean;
}

const defaultConfig: ActivityConfig = {
  unit: 'drinks',
  pluralize: true,
};

const ActivityContext = createContext<ActivityConfig>(defaultConfig);

interface ActivityProviderProps {
  children: ReactNode;
  config?: Partial<ActivityConfig>;
}

export function ActivityProvider({ children, config }: ActivityProviderProps) {
  const mergedConfig = { ...defaultConfig, ...config };
  
  return (
    <ActivityContext.Provider value={mergedConfig}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivityConfig() {
  return useContext(ActivityContext);
}

/**
 * Format a value with the configured unit
 */
export function formatValueWithUnit(value: number, config: ActivityConfig): string {
  const { unit, pluralize } = config;
  
  if (pluralize && value !== 1) {
    // Simple pluralization - add 's' if not already ending in 's'
    const pluralUnit = unit.endsWith('s') ? unit : `${unit}s`;
    return `${value} ${pluralUnit}`;
  }
  
  return `${value} ${unit}`;
}

