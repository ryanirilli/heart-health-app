import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "rounded-full border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        secondary:
          "rounded-full border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "rounded-full border-transparent bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "rounded-full border-border/50 text-foreground",
        // App-specific: pill-shaped badge for "Today" indicator
        today: "rounded-full border-transparent bg-ring/15 text-ring font-medium",
        // App-specific: muted badge for "Archived" labels
        muted: "rounded-full border-transparent bg-muted text-muted-foreground",
        // Goal status badges - soft, cohesive colors
        goalMet: "rounded-full border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        goalMetOutline: "rounded-full border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        goalWarning: "rounded-full border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
        goalWarningOutline: "rounded-full border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
        goalProgress: "rounded-full border-transparent bg-muted text-foreground/80",
        goalProgressOutline: "rounded-full border-transparent bg-muted text-foreground/80",
        goalMissed: "rounded-full border-transparent bg-muted/50 text-muted-foreground",
        goalMissedOutline: "rounded-full border-transparent bg-muted/50 text-muted-foreground",
        // AI confidence badges - theme-consistent styling
        confidenceHigh: "rounded-full border-transparent bg-ring/15 text-ring font-medium",
        confidenceMedium: "rounded-full border-transparent bg-primary/20 text-primary font-medium",
        confidenceLow: "rounded-full border-transparent bg-muted text-muted-foreground font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
