'use client';

import { CalendarDays, Target } from 'lucide-react';
import { PillToggle } from '@/components/ui/pill-toggle';

export type AppView = 'activities' | 'goals';

interface FloatingNavBarProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
}

const navOptions: { value: AppView; label: string; icon: typeof CalendarDays }[] = [
  { value: 'activities', label: 'Activities', icon: CalendarDays },
  { value: 'goals', label: 'Goals', icon: Target },
];

export function FloatingNavBar({ currentView, onViewChange }: FloatingNavBarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <nav className="bg-card/95 backdrop-blur-md shadow-lg rounded-full">
        <PillToggle
          options={navOptions}
          value={currentView}
          onValueChange={onViewChange}
          layoutId="nav-pill"
        />
      </nav>
    </div>
  );
}

