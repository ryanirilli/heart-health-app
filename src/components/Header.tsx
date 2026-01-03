import { Activity } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-sm">
      <div className="w-full px-2">
        <div className="flex h-14 items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-chart-1/20">
              <Activity className="h-4 w-4 text-chart-1" />
            </div>
            <span className="font-semibold text-foreground">Rhythm</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
