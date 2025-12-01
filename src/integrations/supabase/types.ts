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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      gd_feedback: {
        Row: {
          created_at: string
          feedback_text: string
          feedback_type: string
          id: string
          message_id: string | null
          session_id: string
          severity: string | null
        }
        Insert: {
          created_at?: string
          feedback_text: string
          feedback_type: string
          id?: string
          message_id?: string | null
          session_id: string
          severity?: string | null
        }
        Update: {
          created_at?: string
          feedback_text?: string
          feedback_type?: string
          id?: string
          message_id?: string | null
          session_id?: string
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gd_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "gd_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gd_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      gd_messages: {
        Row: {
          confidence_estimate: number | null
          end_ts: string | null
          id: string
          intent: Database["public"]["Enums"]["participant_intent"] | null
          interruption: boolean | null
          overlap_seconds: number | null
          participant_id: string
          session_id: string
          start_ts: string
          text: string
          tts_ssml: string | null
        }
        Insert: {
          confidence_estimate?: number | null
          end_ts?: string | null
          id?: string
          intent?: Database["public"]["Enums"]["participant_intent"] | null
          interruption?: boolean | null
          overlap_seconds?: number | null
          participant_id: string
          session_id: string
          start_ts?: string
          text: string
          tts_ssml?: string | null
        }
        Update: {
          confidence_estimate?: number | null
          end_ts?: string | null
          id?: string
          intent?: Database["public"]["Enums"]["participant_intent"] | null
          interruption?: boolean | null
          overlap_seconds?: number | null
          participant_id?: string
          session_id?: string
          start_ts?: string
          text?: string
          tts_ssml?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gd_messages_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "gd_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gd_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      gd_metrics: {
        Row: {
          avg_pause_s: number | null
          clarity_issues: Json | null
          content_score: number | null
          created_at: string
          filler_count: number | null
          fluency_score: number | null
          id: string
          session_id: string
          star_analysis: Json | null
          structure_score: number | null
          total_words: number | null
          updated_at: string
          voice_score: number | null
          words_per_min: number | null
        }
        Insert: {
          avg_pause_s?: number | null
          clarity_issues?: Json | null
          content_score?: number | null
          created_at?: string
          filler_count?: number | null
          fluency_score?: number | null
          id?: string
          session_id: string
          star_analysis?: Json | null
          structure_score?: number | null
          total_words?: number | null
          updated_at?: string
          voice_score?: number | null
          words_per_min?: number | null
        }
        Update: {
          avg_pause_s?: number | null
          clarity_issues?: Json | null
          content_score?: number | null
          created_at?: string
          filler_count?: number | null
          fluency_score?: number | null
          id?: string
          session_id?: string
          star_analysis?: Json | null
          structure_score?: number | null
          total_words?: number | null
          updated_at?: string
          voice_score?: number | null
          words_per_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gd_metrics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      gd_participants: {
        Row: {
          created_at: string
          id: string
          is_user: boolean
          order_index: number
          persona_agreeability: number | null
          persona_interrupt_level: number | null
          persona_name: string
          persona_role: string | null
          persona_tone: string | null
          persona_verbosity: string | null
          persona_vocab_level: string | null
          session_id: string
          voice_name: string | null
          voice_pitch_pct: number | null
          voice_rate_pct: number | null
          voice_style: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_user?: boolean
          order_index: number
          persona_agreeability?: number | null
          persona_interrupt_level?: number | null
          persona_name: string
          persona_role?: string | null
          persona_tone?: string | null
          persona_verbosity?: string | null
          persona_vocab_level?: string | null
          session_id: string
          voice_name?: string | null
          voice_pitch_pct?: number | null
          voice_rate_pct?: number | null
          voice_style?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_user?: boolean
          order_index?: number
          persona_agreeability?: number | null
          persona_interrupt_level?: number | null
          persona_name?: string
          persona_role?: string | null
          persona_tone?: string | null
          persona_verbosity?: string | null
          persona_vocab_level?: string | null
          session_id?: string
          voice_name?: string | null
          voice_pitch_pct?: number | null
          voice_rate_pct?: number | null
          voice_style?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gd_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      gd_sessions: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          start_time: string | null
          status: Database["public"]["Enums"]["discussion_status"]
          topic: string
          topic_category: string | null
          topic_difficulty: string | null
          topic_tags: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["discussion_status"]
          topic: string
          topic_category?: string | null
          topic_difficulty?: string | null
          topic_tags?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["discussion_status"]
          topic?: string
          topic_category?: string | null
          topic_difficulty?: string | null
          topic_tags?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      skill_drills: {
        Row: {
          ai_feedback: string | null
          completed_at: string | null
          created_at: string
          drill_type: Database["public"]["Enums"]["drill_type"]
          id: string
          score: number | null
          time_limit_seconds: number | null
          topic: string
          user_id: string | null
          user_response: string | null
        }
        Insert: {
          ai_feedback?: string | null
          completed_at?: string | null
          created_at?: string
          drill_type: Database["public"]["Enums"]["drill_type"]
          id?: string
          score?: number | null
          time_limit_seconds?: number | null
          topic: string
          user_id?: string | null
          user_response?: string | null
        }
        Update: {
          ai_feedback?: string | null
          completed_at?: string | null
          created_at?: string
          drill_type?: Database["public"]["Enums"]["drill_type"]
          id?: string
          score?: number | null
          time_limit_seconds?: number | null
          topic?: string
          user_id?: string | null
          user_response?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      discussion_status: "setup" | "active" | "paused" | "completed"
      drill_type:
        | "opening_statement"
        | "star_response"
        | "rebuttal"
        | "time_boxed"
      participant_intent:
        | "agree"
        | "elaborate"
        | "contradict"
        | "ask_question"
        | "summarize"
        | "counterpoint"
        | "example"
        | "clarify"
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
  public: {
    Enums: {
      app_role: ["admin", "user"],
      discussion_status: ["setup", "active", "paused", "completed"],
      drill_type: [
        "opening_statement",
        "star_response",
        "rebuttal",
        "time_boxed",
      ],
      participant_intent: [
        "agree",
        "elaborate",
        "contradict",
        "ask_question",
        "summarize",
        "counterpoint",
        "example",
        "clarify",
      ],
    },
  },
} as const
