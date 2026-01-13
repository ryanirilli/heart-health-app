import Link from "next/link";
import { Activity, ArrowLeft, Github, Linkedin, Instagram } from "lucide-react";
import { FadeInImage } from "./FadeInImage";

export const metadata = {
  title: "About",
  description: "About Ryan Irilli, maker of Rhythm.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
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
      <main className="max-w-3xl mx-auto px-6 py-12 md:py-16 flex-1 w-full">
        <div className="space-y-24">
          {/* Ryan Irilli */}
          <section className="space-y-12">
            {/* Profile Header */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              <div className="relative w-32 h-32 flex-shrink-0 rounded-full overflow-hidden border-2 border-border/50 shadow-sm">
                <FadeInImage
                  src="/ryan-avatar.jpg"
                  alt="Ryan Irilli"
                  fill
                  className="object-cover object-top"
                />
              </div>

              <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-3 pt-2">
                <div>
                  <h1 className="text-3xl font-light text-foreground tracking-tight">
                    Ryan Irilli
                  </h1>
                  <p className="text-muted-foreground text-lg">Maker of Rhythm</p>
                </div>

                <div className="flex items-center gap-4 text-muted-foreground">
                  <a
                    href="https://github.com/ryanirilli"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors"
                    aria-label="GitHub"
                  >
                    <Github className="h-5 w-5" />
                  </a>
                  <a
                    href="https://www.linkedin.com/in/ryanirilli/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a
                    href="https://www.instagram.com/ryanirilli"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Bio Content */}
            <div className="prose prose-invert prose-neutral max-w-none">
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                I’m a software engineer, and also a husband and dad. Like a lot of
                people, I’ve struggled to stick with personal goals because they
                get drowned out by everyday life. When you’re juggling work,
                family, and everything else, it’s easy for the stuff you care
                about to slide.
              </p>

              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                I built Rhythm because I wanted a simple daily check-in that keeps
                my goals visible without turning into a whole project. Just a space
                to stay mindful of the habits I’m trying to build.
              </p>

              <p className="text-lg text-muted-foreground leading-relaxed">
                My kids are 1 and 3, so life is noisy and unpredictable (iykyk).
                Rhythm is my way of finding a steady beat in all of that, one day
                at a time.
              </p>
            </div>
          </section>

          {/* Mark Stratford */}
          <section className="space-y-12">
            {/* Profile Header */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              <div className="relative w-32 h-32 flex-shrink-0 rounded-full overflow-hidden border-2 border-border/50 shadow-sm">
                <FadeInImage
                  src="/mark-avatar.jpeg"
                  alt="Mark Stratford"
                  fill
                  className="object-cover object-top scale-110 origin-top"
                />
              </div>

              <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-3 pt-2">
                <div>
                  <h1 className="text-3xl font-light text-foreground tracking-tight">
                    Mark Stratford
                  </h1>
                  <p className="text-muted-foreground text-lg">Partner in Rhythm</p>
                </div>

                <div className="flex items-center gap-4 text-muted-foreground">
                  <a
                    href="https://github.com/MarkStratford"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors"
                    aria-label="GitHub"
                  >
                    <Github className="h-5 w-5" />
                  </a>
                  <a
                    href="https://www.linkedin.com/in/stratfordmark"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Bio Content */}
            <div className="prose prose-invert prose-neutral max-w-none">
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                I’m a product manager, and like Ryan, a husband and dad to two
                toddlers. I’m originally from Ireland but have called the US
                home for almost a decade now.
              </p>

              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                I’ve always found that indefinite resolutions just don't work. They
                become daunting and eventually, they break. My approach is built on
                distilling big ambitions into monthly challenges. By focusing on
                30-day "trials" with daily commitments, growth becomes achievable
                and exciting rather than overwhelming. If a habit brings value, I
                keep it; if not, I move on without the guilt.
              </p>

              <p className="text-lg text-muted-foreground leading-relaxed">
                I'm here because I love making well designed products that
                facilitate real meaning in the world. Together we’ve created
                Rhythm to be the quietest part of your day. It’s an opportunity to
                help people cut through the noise and build momentum that actually
                sticks.
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40">
        <div className="max-w-3xl mx-auto px-6 py-6">
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
        </div>
      </footer>
    </div>
  );
}
