import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TopographyCanvas } from "@/components/TopographyCanvas";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign In
          </Link>
        </nav>

        {/* Hero */}
        <main className="flex-1 flex items-center justify-center px-6 md:px-12">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-foreground leading-[1.15] tracking-tight mb-6">
              Less noise.
              <br />
              <span className="text-muted-foreground">More beats.</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-md mb-10 leading-relaxed font-light">
              A simple, beautiful way to track habits, set goals, and see your
              progress at a glance.
            </p>

            <Link
              href="/login?mode=signup"
              className="group inline-flex items-center gap-2 text-foreground hover:text-muted-foreground transition-colors"
            >
              <span className="text-sm font-medium">Get started</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 md:px-12 py-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} Rhythm</p>
            <div className="flex gap-4">
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
