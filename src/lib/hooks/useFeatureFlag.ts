"use client";

import { useEffect } from "react";
import { useFeatureFlagEnabled } from "posthog-js/react";

// Enable debug logging via localStorage: localStorage.setItem('DEBUG_FEATURE_FLAGS', 'true')
const isDebugEnabled = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('DEBUG_FEATURE_FLAGS') === 'true';
};

/**
 * Hook to check if a feature flag is enabled for the current user.
 * Uses PostHog's feature flag system.
 * 
 * Debug logging can be enabled by running in the browser console:
 * localStorage.setItem('DEBUG_FEATURE_FLAGS', 'true')
 * 
 * @param flagName - The name of the feature flag to check
 * @returns boolean - Whether the feature flag is enabled
 */
export function useFeatureFlag(flagName: string): boolean {
  const isEnabled = useFeatureFlagEnabled(flagName);
  
  // Debug logging - temporarily always on to diagnose
  useEffect(() => {
    // Always log for now to debug
    console.log(`[FeatureFlag] "${flagName}":`, {
      rawValue: isEnabled,
      resolvedValue: isEnabled === true,
      status: isEnabled === undefined ? 'loading' : isEnabled ? 'enabled' : 'disabled'
    });
  }, [flagName, isEnabled]);
  
  // PostHog returns undefined while loading, treat as false
  return isEnabled === true;
}

// Feature flag constants
export const FEATURE_FLAGS = {
  VOICE_NOTES: "voice-notes",
} as const;

