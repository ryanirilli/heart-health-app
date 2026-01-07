'use client';

import { CalendarDays, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export type AppView = 'activities' | 'goals';

interface FloatingNavBarProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
}

const navItems: { view: AppView; label: string; icon: typeof CalendarDays }[] = [
  { view: 'activities', label: 'Activities', icon: CalendarDays },
  { view: 'goals', label: 'Goals', icon: Target },
];

export function FloatingNavBar({ currentView, onViewChange }: FloatingNavBarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <nav className="flex items-center gap-1 p-1.5 rounded-full bg-card/95 backdrop-blur-md border shadow-lg">
        {navItems.map(({ view, label, icon: Icon }) => {
          const isActive = currentView === view;

          return (
            <button
              key={view}
              onClick={() => onViewChange(view)}
              className={cn(
                'relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isActive
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-primary rounded-full"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <Icon className="relative z-10 h-4 w-4" />
              <span className="relative z-10">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

