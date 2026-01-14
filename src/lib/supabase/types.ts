// Database types for Supabase tables

export interface DbActivityType {
  id: string;
  user_id: string;
  name: string;
  unit: string | null;
  pluralize: boolean;
  is_negative: boolean | null;
  goal_type: 'positive' | 'negative' | 'neutral' | null;
  ui_type: 'increment' | 'slider' | 'buttonGroup' | 'toggle';
  min_value: number | null;
  max_value: number | null;
  step: number | null;
  button_options: { label: string; value: number }[] | null;
  deleted: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbActivity {
  id: string;
  user_id: string;
  activity_type_id: string;
  date: string;
  value: number;
  created_at: string;
  updated_at: string;
}

export interface DbGoal {
  id: string;
  user_id: string;
  activity_type_id: string;
  name: string;
  target_value: number;
  icon: string;
  date_type: 'daily' | 'weekly' | 'monthly' | 'by_date' | 'date_range';
  tracking_type: 'average' | 'absolute' | null;
  target_date: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbActivityNote {
  id: string;
  user_id: string;
  date: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface DbVoiceNote {
  id: string;
  user_id: string;
  date: string;
  storage_path: string;
  duration_seconds: number;
  created_at: string;
  updated_at: string;
}

// Insert types (without auto-generated fields)
export type DbActivityTypeInsert = Omit<DbActivityType, 'created_at' | 'updated_at'>;
export type DbActivityInsert = Omit<DbActivity, 'id' | 'created_at' | 'updated_at'>;
export type DbGoalInsert = Omit<DbGoal, 'id' | 'created_at' | 'updated_at'>;
export type DbProfileUpdate = Partial<Pick<DbProfile, 'display_name' | 'bio' | 'avatar_url'>>;
export type DbVoiceNoteInsert = Omit<DbVoiceNote, 'id' | 'created_at' | 'updated_at'>;

