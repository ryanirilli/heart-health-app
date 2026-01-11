import Link from "next/link";
import { Activity, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Rhythm. Learn how we handle and protect your data.",
};

export default function PrivacyPage() {
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
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
            Privacy Policy
          </h1>
          <p className="text-muted-foreground">Last updated: January 2026</p>
        </div>

        <div className="prose prose-invert prose-neutral max-w-none">
          <div className="space-y-10">
            {/* Intro */}
            <section className="space-y-4">
              <p className="text-lg text-muted-foreground leading-relaxed">
                Your privacy matters. Rhythm is built to help you track your
                habits, not to track you. Here is exactly what we collect, why,
                and how we protect it.
              </p>
            </section>

            {/* What We Collect */}
            <section className="space-y-4">
              <h2 className="text-xl font-medium text-foreground">
                What We Collect
              </h2>
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-base font-medium text-foreground/90">
                    Account Information
                  </h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex gap-3">
                      <span className="text-chart-2 mt-1.5">•</span>
                      <span>
                        <strong className="text-foreground/80">Email address</strong> to
                        create and secure your account
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-chart-2 mt-1.5">•</span>
                      <span>
                        <strong className="text-foreground/80">
                          Google account info
                        </strong>{" "}
                        if you choose to sign in with Google (name and email
                        only)
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-medium text-foreground/90">
                    Your Activity Data
                  </h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex gap-3">
                      <span className="text-chart-2 mt-1.5">•</span>
                      <span>
                        <strong className="text-foreground/80">Activity types</strong> you
                        create (names, units, display settings)
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-chart-2 mt-1.5">•</span>
                      <span>
                        <strong className="text-foreground/80">Activity entries</strong>{" "}
                        you log (dates and values)
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-chart-2 mt-1.5">•</span>
                      <span>
                        <strong className="text-foreground/80">Goals</strong> you set
                        (targets, timeframes, progress)
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* What We Don't Collect */}
            <section className="space-y-4">
              <h2 className="text-xl font-medium text-foreground">
                What We Do Not Collect
              </h2>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex gap-3">
                  <span className="text-chart-1 mt-1.5">✓</span>
                  <span>No location tracking</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-chart-1 mt-1.5">✓</span>
                  <span>No contact list access</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-chart-1 mt-1.5">✓</span>
                  <span>No advertising identifiers</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-chart-1 mt-1.5">✓</span>
                  <span>No third-party analytics trackers</span>
                </li>
              </ul>
            </section>

            {/* How We Use Your Data */}
            <section className="space-y-4">
              <h2 className="text-xl font-medium text-foreground">
                How We Use Your Data
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Your data is used for one purpose: making Rhythm work for you.
                We use it to display your activities, calculate goal progress,
                and show your patterns over time. That is it.
              </p>
            </section>

            {/* Data Security */}
            <section className="space-y-4">
              <h2 className="text-xl font-medium text-foreground">
                How We Protect Your Data
              </h2>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex gap-3">
                  <span className="text-chart-2 mt-1.5">•</span>
                  <span>
                    All data is encrypted in transit using HTTPS
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-chart-2 mt-1.5">•</span>
                  <span>
                    Database access is protected by row-level security, so you
                    can only access your own data
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-chart-2 mt-1.5">•</span>
                  <span>
                    Authentication is handled by Supabase, a trusted
                    infrastructure provider
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-chart-2 mt-1.5">•</span>
                  <span>Passwords are hashed and never stored in plain text</span>
                </li>
              </ul>
            </section>

            {/* Data Sharing */}
            <section className="space-y-4">
              <h2 className="text-xl font-medium text-foreground">
                Data Sharing
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We do not sell your data. We do not share it with advertisers.
                We do not use it for marketing. Your activity data stays between
                you and Rhythm.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                The only third party involved is Supabase, which provides our
                database and authentication infrastructure. They process data on
                our behalf and are bound by strict data protection agreements.
              </p>
            </section>

            {/* Data Retention */}
            <section className="space-y-4">
              <h2 className="text-xl font-medium text-foreground">
                Data Retention
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Your data is kept as long as you have an account. If you delete
                your account, we will delete your data. If you want specific
                data removed, just ask.
              </p>
            </section>

            {/* Your Rights */}
            <section className="space-y-4">
              <h2 className="text-xl font-medium text-foreground">
                Your Rights
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                You have the right to:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex gap-3">
                  <span className="text-chart-1 mt-1.5">•</span>
                  <span>Access all the data we have about you</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-chart-1 mt-1.5">•</span>
                  <span>Request correction of inaccurate data</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-chart-1 mt-1.5">•</span>
                  <span>Request deletion of your data</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-chart-1 mt-1.5">•</span>
                  <span>Export your data in a portable format</span>
                </li>
              </ul>
            </section>

            {/* Cookies */}
            <section className="space-y-4">
              <h2 className="text-xl font-medium text-foreground">Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use essential cookies only for authentication, so you stay
                logged in. No tracking cookies. No third-party cookies.
              </p>
            </section>

            {/* Changes */}
            <section className="space-y-4">
              <h2 className="text-xl font-medium text-foreground">
                Changes to This Policy
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                If we make meaningful changes to how we handle your data, we
                will update this policy and let you know. The date at the top
                shows when it was last updated.
              </p>
            </section>

            {/* Contact */}
            <section className="space-y-4 pt-6 border-t border-border/40">
              <h2 className="text-xl font-medium text-foreground">
                Questions?
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about your privacy or this policy, reach
                out to us at{" "}
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
        </div>
      </footer>
    </div>
  );
}

