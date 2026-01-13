"use client";

import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { createClient } from "@/lib/supabase/client";

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: false, // Disable automatic pageview capture, as we capture manually
  })
}

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

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
