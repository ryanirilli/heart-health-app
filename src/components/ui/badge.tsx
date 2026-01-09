import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "rounded-md border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "rounded-md border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "rounded-md border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "rounded-md text-foreground",
        // App-specific: pill-shaped badge for "Today" indicator
        today: "rounded-full border-transparent bg-primary/10 text-primary",
        // App-specific: muted badge for "Archived" labels
        muted: "rounded border-transparent bg-muted text-muted-foreground",
        // Goal status badges - themed to match goal states
        goalMet: "rounded-md border-green-500/30 bg-green-500/20 text-green-700 dark:text-green-300",
        goalMetOutline: "rounded-md border-green-500/40 bg-transparent text-green-700 dark:text-green-300",
        goalWarning: "rounded-md border-amber-500/30 bg-amber-500/20 text-amber-700 dark:text-amber-300",
        goalWarningOutline: "rounded-md border-amber-500/40 bg-transparent text-amber-700 dark:text-amber-300",
        goalProgress: "rounded-md border-primary/30 bg-primary/10 text-primary",
        goalProgressOutline: "rounded-md border-primary/40 bg-transparent text-primary",
        goalMissed: "rounded-md border-muted-foreground/20 bg-muted/30 text-muted-foreground",
        goalMissedOutline: "rounded-md border-muted-foreground/30 bg-transparent text-muted-foreground",
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
