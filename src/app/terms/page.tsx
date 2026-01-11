import Link from "next/link";
import { Activity, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Rhythm, the simple habit tracking app.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-foreground hover:text-muted-foreground transition-colors"
            >
              <Activity className="h-5 w-5" />
              <span className="font-medium tracking-tight">Rhythm</span>
            </Link>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors px-3 py-1.5 rounded-full"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <div className="space-y-2 mb-12">
          <h1 className="text-3xl md:text-4xl font-light text-foreground tracking-tight">
            Terms of Service
          </h1>
          <p className="text-muted-foreground">
            Last updated: January 2026
          </p>
        </div>

        <div className="prose prose-invert prose-neutral max-w-none">
          <div className="space-y-10">
            {/* Intro */}
            <section className="space-y-4">
              <p className="text-lg text-muted-foreground leading-relaxed">
                Welcome to Rhythm. These terms are straightforward because we
                believe in keeping things simple. By using Rhythm, you agree to
                these terms.
              </p>
            </section>

            {/* What Rhythm Is */}
            <section className="space-y-4">
              <h2 className="text-xl font-medium text-foreground">
                What Rhythm Is
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Rhythm is a personal habit and activity tracking app. You can
                create custom trackers for anything you want to monitor, log
                entries over time, set goals, and visualize your progress. It is
                designed to be simple, beautiful, and entirely yours.
              </p>
            </section>

            {/* Your Account */}
            <section className="space-y-4">
              <h2 className="text-xl font-medium text-foreground">
                Your Account
              </h2>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex gap-3">
                  <span className="text-chart-1 mt-1.5">•</span>
                  <span>
                    You need an account to use Rhythm. You can sign up with
                    email or Google.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-chart-1 mt-1.5">•</span>
                  <span>
                    Keep your login credentials secure. You are responsible for
                    activity on your account.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-chart-1 mt-1.5">•</span>
                  <span>
                    You must be at least 13 years old to use Rhythm.
                  </span>
                </li>
              </ul>
            </section>

            {/* Your Data */}
            <section className="space-y-4">
              <h2 className="text-xl font-medium text-foreground">
                Your Data Belongs to You
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                The activities you track, the goals you set, and the patterns
                you build are yours. We do not sell your data. We do not use it
                for advertising. We store it securely so you can access it
                whenever you need.
              </p>
            </section>

            {/* Acceptable Use */}
            <section className="space-y-4">
              <h2 className="text-xl font-medium text-foreground">
                Acceptable Use
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Use Rhythm for its intended purpose: tracking your personal
                habits and activities. Do not attempt to access other users
                data, reverse engineer the app, or use it for anything illegal.
              </p>
            </section>

            {/* Service Availability */}
            <section className="space-y-4">
              <h2 className="text-xl font-medium text-foreground">
                Service Availability
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We aim to keep Rhythm running smoothly, but we cannot guarantee
                100% uptime. Sometimes things break, updates happen, or
                maintenance is required. We will do our best to minimize
                disruptions.
              </p>
            </section>

            {/* Changes */}
            <section className="space-y-4">
              <h2 className="text-xl font-medium text-foreground">
                Changes to These Terms
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update these terms as Rhythm evolves. If we make
                significant changes, we will let you know. Continuing to use
                Rhythm after changes means you accept the updated terms.
              </p>
            </section>

            {/* Termination */}
            <section className="space-y-4">
              <h2 className="text-xl font-medium text-foreground">
                Closing Your Account
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                You can stop using Rhythm at any time. If you want your data
                deleted, contact us and we will take care of it. We may also
                suspend or terminate accounts that violate these terms.
              </p>
            </section>

            {/* Contact */}
            <section className="space-y-4 pt-6 border-t border-border/40">
              <h2 className="text-xl font-medium text-foreground">
                Questions?
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about these terms, reach out to us at{" "}
                <a
                  href="mailto:hello@rhythmtracker.com"
                  className="text-foreground hover:text-chart-1 transition-colors underline underline-offset-4"
                >
                  hello@rhythmtracker.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} Rhythm</p>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

