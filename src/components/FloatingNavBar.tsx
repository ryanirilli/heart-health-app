'use client';

import { useState, useEffect } from 'react';
import { CalendarDays, Target, TrendingUp } from 'lucide-react';
import { PillToggle } from '@/components/ui/pill-toggle';
import { useFeatureFlagEnabled } from 'posthog-js/react';

export type AppView = 'activities' | 'goals' | 'trends';

interface FloatingNavBarProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
}

export function FloatingNavBar({ currentView, onViewChange }: FloatingNavBarProps) {
  const trendsEnabled = useFeatureFlagEnabled('trends-feature');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const navOptions: { value: AppView; label: string; icon: typeof CalendarDays }[] = [
    { value: 'activities', label: 'Activities', icon: CalendarDays },
    { value: 'goals', label: 'Goals', icon: Target },
  ];

  if (isMounted && trendsEnabled) {
    navOptions.push({ value: 'trends', label: 'Trends', icon: TrendingUp });
  }

  return (
    <>
      {/* Gradient backdrop - theme aware */}
      <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none z-40" />
      
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
    </>
  );
}

