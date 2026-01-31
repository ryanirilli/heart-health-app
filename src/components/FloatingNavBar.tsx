'use client';

import { CalendarDays, Target, Heart } from 'lucide-react';
import { PillToggle } from '@/components/ui/pill-toggle';

export type AppView = 'activities' | 'goals' | 'check-in';

interface FloatingNavBarProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
}

export function FloatingNavBar({ currentView, onViewChange }: FloatingNavBarProps) {
  const navOptions: { value: AppView; label: string; icon: typeof CalendarDays }[] = [
    { value: 'activities', label: 'Activity', icon: CalendarDays },
    { value: 'goals', label: 'Goals', icon: Target },
    { value: 'check-in', label: 'Check in', icon: Heart },
  ];

  return (
    <>
      {/* Gradient backdrop - theme aware */}
      <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none z-40" />
      
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
        <nav className="bg-card/95 backdrop-blur-md shadow-lg rounded-full w-full">
          <PillToggle
            options={navOptions}
            value={currentView}
            onValueChange={onViewChange}
            layoutId="nav-pill"
            fullWidth
          />
        </nav>
      </div>
    </>
  );
}

