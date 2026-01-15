"use client";

import { useEffect, useState } from "react";
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
  const [mounted, setMounted] = useState(false);
  
  // Handle hydration mismatch by waiting until mount to return the true flag value
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Debug logging - temporarily always on to diagnose
  useEffect(() => {
    if (mounted) {
      console.log(`[FeatureFlag] "${flagName}":`, {
        rawValue: isEnabled,
        resolvedValue: isEnabled === true,
        status: isEnabled === undefined ? 'loading' : isEnabled ? 'enabled' : 'disabled'
      });
    }
  }, [flagName, isEnabled, mounted]);
  
  // Always return false during SSR and initial hydration to match server output
  if (!mounted) return false;
  
  // PostHog returns undefined while loading, treat as false
  return isEnabled === true;
}

// Feature flag constants
export const FEATURE_FLAGS = {
  VOICE_NOTES: "voice-notes",
} as const;

