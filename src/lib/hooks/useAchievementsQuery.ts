'use client';

import { useQuery } from '@tanstack/react-query';

export interface AchievementGoal {
  id: string;
  name: string;
  icon: string;
  activity_type_id: string;
}

export interface Achievement {
  id: string;
  goal_id: string;
  period_start: string;
  period_end: string;
  achieved_value: number;
  target_value: number;
  achieved_at: string;
  goals: AchievementGoal;
}

export interface AchievementsResponse {
  achievements: Achievement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const ACHIEVEMENTS_QUERY_KEY = ['achievements'] as const;

export function useAchievementsQuery(page: number = 1, limit: number = 10) {
  return useQuery({
    queryKey: [...ACHIEVEMENTS_QUERY_KEY, page, limit],
    queryFn: async () => {
      const response = await fetch(`/api/achievements?page=${page}&limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch achievements');
      }
      return response.json() as Promise<AchievementsResponse>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
