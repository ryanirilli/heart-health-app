import Link from "next/link";
import { Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TopographyCanvas } from "@/components/TopographyCanvas";
import { HeroContent } from "./HeroContent";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If password reset is required, redirect to reset page
  // This is a backup check in case middleware is bypassed
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const passwordResetRequired = cookieStore.get("password_reset_required")?.value === "true";
  
  if (user && passwordResetRequired) {
    redirect("/reset-password");
  }

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen relative">
      {/* Procedural topography background */}
      <TopographyCanvas />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Navigation */}
        <nav className="flex items-center justify-between px-6 py-6 md:px-12">
          <div className="flex items-center gap-2.5">
            <Activity className="h-5 w-5 text-foreground" />
            <span className="font-medium text-foreground tracking-tight">
              Rhythm
            </span>
          </div>
          <Link
            href="/login"
            className="text-sm px-4 py-2 rounded-full bg-foreground/10 text-foreground hover:bg-foreground/20 transition-colors font-medium"
          >
            Sign In
          </Link>
        </nav>

        {/* Hero */}
        <main className="flex-1 flex items-center justify-center px-6 md:px-12">
          <HeroContent />
        </main>

        {/* Footer */}
        <footer className="px-6 md:px-12 py-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} Rhythm</p>
            <div className="flex gap-4">
              <Link
                href="/about"
                className="hover:text-foreground transition-colors"
              >
                About
              </Link>
              <Link
                href="/privacy"
                className="hover:text-foreground transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="hover:text-foreground transition-colors"
              >
                Terms
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
