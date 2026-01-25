export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          achieved_at: string | null
          achieved_value: number
          goal_id: string
          id: string
          period_end: string
          period_start: string
          target_value: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          achieved_value: number
          goal_id: string
          id?: string
          period_end: string
          period_start: string
          target_value: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          achieved_value?: number
          goal_id?: string
          id?: string
          period_end?: string
          period_start?: string
          target_value?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          activity_type_id: string
          created_at: string | null
          date: string
          id: string
          updated_at: string | null
          user_id: string
          value: number
        }
        Insert: {
          activity_type_id: string
          created_at?: string | null
          date: string
          id?: string
          updated_at?: string | null
          user_id: string
          value: number
        }
        Update: {
          activity_type_id?: string
          created_at?: string | null
          date?: string
          id?: string
          updated_at?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "activities_activity_type_id_fkey"
            columns: ["activity_type_id"]
            isOneToOne: false
            referencedRelation: "activity_types"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_notes: {
        Row: {
          created_at: string | null
          date: string
          id: string
          note: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          note: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          note?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      activity_types: {
        Row: {
          button_options: Json | null
          created_at: string | null
          deleted: boolean | null
          display_order: number
          fixed_value: number | null
          goal_type: string | null
          id: string
          is_negative: boolean | null
          max_value: number | null
          min_value: number | null
          name: string
          pluralize: boolean | null
          step: number | null
          ui_type: string
          unit: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          button_options?: Json | null
          created_at?: string | null
          deleted?: boolean | null
          display_order?: number
          fixed_value?: number | null
          goal_type?: string | null
          id: string
          is_negative?: boolean | null
          max_value?: number | null
          min_value?: number | null
          name: string
          pluralize?: boolean | null
          step?: number | null
          ui_type?: string
          unit?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          button_options?: Json | null
          created_at?: string | null
          deleted?: boolean | null
          display_order?: number
          fixed_value?: number | null
          goal_type?: string | null
          id?: string
          is_negative?: boolean | null
          max_value?: number | null
          min_value?: number | null
          name?: string
          pluralize?: boolean | null
          step?: number | null
          ui_type?: string
          unit?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          activity_type_id: string
          created_at: string | null
          date_type: string
          end_date: string | null
          icon: string
          id: string
          name: string
          start_date: string | null
          target_date: string | null
          target_value: number
          tracking_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_type_id: string
          created_at?: string | null
          date_type?: string
          end_date?: string | null
          icon?: string
          id?: string
          name: string
          start_date?: string | null
          target_date?: string | null
          target_value: number
          tracking_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_type_id?: string
          created_at?: string | null
          date_type?: string
          end_date?: string | null
          icon?: string
          id?: string
          name?: string
          start_date?: string | null
          target_date?: string | null
          target_value?: number
          tracking_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_activity_type_id_fkey"
            columns: ["activity_type_id"]
            isOneToOne: false
            referencedRelation: "activity_types"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      voice_notes: {
        Row: {
          created_at: string | null
          date: string
          duration_seconds: number
          extracted_activities: Json | null
          id: string
          storage_path: string
          transcription: string | null
          transcription_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          duration_seconds: number
          extracted_activities?: Json | null
          id?: string
          storage_path: string
          transcription?: string | null
          transcription_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          duration_seconds?: number
          extracted_activities?: Json | null
          id?: string
          storage_path?: string
          transcription?: string | null
          transcription_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      evaluate_achievements: {
        Args: { p_activity_type_id: string; p_date: string; p_user_id: string }
        Returns: undefined
      }
      get_month_end: { Args: { d: string }; Returns: string }
      get_month_start: { Args: { d: string }; Returns: string }
      get_week_end: { Args: { d: string }; Returns: string }
      get_week_start: { Args: { d: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
