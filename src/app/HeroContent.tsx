"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function HeroContent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Delay before animation starts for a moment of anticipation
    const timer = setTimeout(() => setIsVisible(true), 700);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-2xl">
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-foreground leading-[1.15] tracking-tight mb-6">
        {/* "Less noise." - clips from bottom */}
        <span className="block overflow-hidden">
          <span
            className={cn(
              "block transition-transform duration-1000",
              isVisible ? "translate-y-0" : "translate-y-full"
            )}
            style={{
              transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            Less noise.
          </span>
        </span>

        {/* "More beats." - staggered clip from bottom */}
        <span className="block overflow-hidden">
          <span
            className={cn(
              "block text-muted-foreground transition-transform duration-1000",
              isVisible ? "translate-y-0" : "translate-y-full"
            )}
            style={{
              transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
              transitionDelay: "150ms",
            }}
          >
            More beats.
          </span>
        </span>
      </h1>

      {/* Description - fade in */}
      <p
        className={cn(
          "text-lg text-muted-foreground max-w-md mb-10 leading-relaxed font-light transition-all duration-700",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
        style={{
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          transitionDelay: "400ms",
        }}
      >
        A free, beautiful way to track habits, set goals, and see your progress
        at a glance simply.
      </p>

      {/* CTA - fade in */}
      <div
        className={cn(
          "transition-all duration-700",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
        style={{
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          transitionDelay: "550ms",
        }}
      >
        <Link
          href="/login?mode=signup"
          className="group inline-flex items-center gap-2 text-foreground hover:text-muted-foreground transition-colors"
        >
          <span className="text-sm font-medium">Get started</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
