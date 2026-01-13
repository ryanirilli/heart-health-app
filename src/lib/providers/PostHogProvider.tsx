"use client";

import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";

/**
 * PostHogProvider component that handles user identification and logout.
 * 
 * This component:
 * - Identifies users when they log in (linking anonymous events to the user)
 * - Sets user properties (email, name) for segmentation in PostHog
 * - Resets the PostHog identity on logout (clears distinct_id and starts fresh)
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const hasIdentified = useRef(false);

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          // Identify the user with PostHog
          const user = session.user;
          
          posthog.identify(user.id, {
            email: user.email,
            name: user.user_metadata?.full_name || user.user_metadata?.name,
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
            created_at: user.created_at,
            // Track auth provider for segmentation
            auth_provider: user.app_metadata?.provider || "email",
          });

          hasIdentified.current = true;
        }

        if (event === "SIGNED_OUT") {
          // Reset PostHog on logout
          // This clears the distinct_id and generates a new anonymous ID
          // Important: This prevents the next user from inheriting the previous user's identity
          posthog.reset();
          hasIdentified.current = false;
        }
      }
    );

    // Check if user is already logged in on mount
    async function checkExistingSession() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && !hasIdentified.current) {
        posthog.identify(user.id, {
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
          created_at: user.created_at,
          auth_provider: user.app_metadata?.provider || "email",
        });
        hasIdentified.current = true;
      }
    }

    checkExistingSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  return <>{children}</>;
}
