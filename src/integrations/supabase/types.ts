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
      achievements: {
        Row: {
          code: string
          created_at: string
          criteria: Json | null
          description: string | null
          icon: string | null
          id: string
          name: string
          xp_reward: number
        }
        Insert: {
          code: string
          created_at?: string
          criteria?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          xp_reward?: number
        }
        Update: {
          code?: string
          created_at?: string
          criteria?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          xp_reward?: number
        }
        Relationships: []
      }
      background_jobs: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          job_type: string
          max_attempts: number
          payload: Json
          result: Json | null
          scheduled_at: string
          started_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          job_type: string
          max_attempts?: number
          payload?: Json
          result?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          job_type?: string
          max_attempts?: number
          payload?: Json
          result?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      cohort_members: {
        Row: {
          cohort_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          cohort_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          cohort_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_members_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      cohorts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          instructor_id: string
          invite_code: string | null
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          instructor_id: string
          invite_code?: string | null
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          instructor_id?: string
          invite_code?: string | null
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_drills: {
        Row: {
          created_at: string
          description: string | null
          difficulty: string | null
          id: string
          name: string
          prompt: string | null
          time_limit: number
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          name: string
          prompt?: string | null
          time_limit?: number
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          name?: string
          prompt?: string | null
          time_limit?: number
          user_id?: string
        }
        Relationships: []
      }
      custom_personas: {
        Row: {
          agreeability: number | null
          core_perspective: string
          created_at: string
          description: string | null
          id: string
          interrupt_level: number | null
          name: string
          role: string
          tone: string
          updated_at: string
          user_id: string
          verbosity: string
          vocab_level: string
          voice_name: string | null
        }
        Insert: {
          agreeability?: number | null
          core_perspective: string
          created_at?: string
          description?: string | null
          id?: string
          interrupt_level?: number | null
          name: string
          role: string
          tone?: string
          updated_at?: string
          user_id: string
          verbosity?: string
          vocab_level?: string
          voice_name?: string | null
        }
        Update: {
          agreeability?: number | null
          core_perspective?: string
          created_at?: string
          description?: string | null
          id?: string
          interrupt_level?: number | null
          name?: string
          role?: string
          tone?: string
          updated_at?: string
          user_id?: string
          verbosity?: string
          vocab_level?: string
          voice_name?: string | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          created_at: string
          error_message: string
          error_source: string
          error_stack: string | null
          id: string
          metadata: Json | null
          page_url: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message: string
          error_source?: string
          error_stack?: string | null
          id?: string
          metadata?: Json | null
          page_url?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string
          error_source?: string
          error_stack?: string | null
          id?: string
          metadata?: Json | null
          page_url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      experiment_assignments: {
        Row: {
          created_at: string
          experiment_id: string
          id: string
          user_id: string
          variant: string
        }
        Insert: {
          created_at?: string
          experiment_id: string
          id?: string
          user_id: string
          variant: string
        }
        Update: {
          created_at?: string
          experiment_id?: string
          id?: string
          user_id?: string
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiment_assignments_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      experiments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          traffic_percent: number
          updated_at: string
          variants: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          traffic_percent?: number
          updated_at?: string
          variants?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          traffic_percent?: number
          updated_at?: string
          variants?: Json
        }
        Relationships: []
      }
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
          citation: string | null
          confidence_estimate: number | null
          end_ts: string | null
          id: string
          intent: Database["public"]["Enums"]["participant_intent"] | null
          interruption: boolean | null
          lens: string | null
          novelty_note: string | null
          overlap_seconds: number | null
          participant_id: string
          session_id: string
          start_ts: string
          text: string
          tts_ssml: string | null
        }
        Insert: {
          citation?: string | null
          confidence_estimate?: number | null
          end_ts?: string | null
          id?: string
          intent?: Database["public"]["Enums"]["participant_intent"] | null
          interruption?: boolean | null
          lens?: string | null
          novelty_note?: string | null
          overlap_seconds?: number | null
          participant_id: string
          session_id: string
          start_ts?: string
          text: string
          tts_ssml?: string | null
        }
        Update: {
          citation?: string | null
          confidence_estimate?: number | null
          end_ts?: string | null
          id?: string
          intent?: Database["public"]["Enums"]["participant_intent"] | null
          interruption?: boolean | null
          lens?: string | null
          novelty_note?: string | null
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
          expression_score: number | null
          eye_contact_score: number | null
          filler_count: number | null
          fluency_score: number | null
          grammar_score: number | null
          id: string
          leadership_score: number | null
          posture_score: number | null
          sentiment_score: number | null
          sentiment_timeline: Json | null
          session_id: string
          star_analysis: Json | null
          structure_score: number | null
          teamwork_score: number | null
          total_words: number | null
          updated_at: string
          video_tips: Json | null
          voice_score: number | null
          words_per_min: number | null
        }
        Insert: {
          avg_pause_s?: number | null
          clarity_issues?: Json | null
          content_score?: number | null
          created_at?: string
          expression_score?: number | null
          eye_contact_score?: number | null
          filler_count?: number | null
          fluency_score?: number | null
          grammar_score?: number | null
          id?: string
          leadership_score?: number | null
          posture_score?: number | null
          sentiment_score?: number | null
          sentiment_timeline?: Json | null
          session_id: string
          star_analysis?: Json | null
          structure_score?: number | null
          teamwork_score?: number | null
          total_words?: number | null
          updated_at?: string
          video_tips?: Json | null
          voice_score?: number | null
          words_per_min?: number | null
        }
        Update: {
          avg_pause_s?: number | null
          clarity_issues?: Json | null
          content_score?: number | null
          created_at?: string
          expression_score?: number | null
          eye_contact_score?: number | null
          filler_count?: number | null
          fluency_score?: number | null
          grammar_score?: number | null
          id?: string
          leadership_score?: number | null
          posture_score?: number | null
          sentiment_score?: number | null
          sentiment_timeline?: Json | null
          session_id?: string
          star_analysis?: Json | null
          structure_score?: number | null
          teamwork_score?: number | null
          total_words?: number | null
          updated_at?: string
          video_tips?: Json | null
          voice_score?: number | null
          words_per_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gd_metrics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
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
          real_user_id: string | null
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
          real_user_id?: string | null
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
          real_user_id?: string | null
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
          host_user_id: string | null
          id: string
          is_multiplayer: boolean | null
          last_activity_at: string
          mic_lock_expires_at: string | null
          mic_lock_holder: string | null
          phase: string
          room_code: string | null
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
          host_user_id?: string | null
          id?: string
          is_multiplayer?: boolean | null
          last_activity_at?: string
          mic_lock_expires_at?: string | null
          mic_lock_holder?: string | null
          phase?: string
          room_code?: string | null
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
          host_user_id?: string | null
          id?: string
          is_multiplayer?: boolean | null
          last_activity_at?: string
          mic_lock_expires_at?: string | null
          mic_lock_holder?: string | null
          phase?: string
          room_code?: string | null
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
      moderator_decisions: {
        Row: {
          action: string
          applied: boolean
          confidence: number | null
          created_at: string
          evidence: Json
          id: string
          reason: string | null
          session_id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          applied?: boolean
          confidence?: number | null
          created_at?: string
          evidence?: Json
          id?: string
          reason?: string | null
          session_id: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          applied?: boolean
          confidence?: number | null
          created_at?: string
          evidence?: Json
          id?: string
          reason?: string | null
          session_id?: string
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderator_decisions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      practice_streaks: {
        Row: {
          current_streak: number
          daily_goal_minutes: number
          id: string
          last_practice_date: string | null
          longest_streak: number
          today_minutes: number
          total_practice_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          daily_goal_minutes?: number
          id?: string
          last_practice_date?: string | null
          longest_streak?: number
          today_minutes?: number
          total_practice_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          daily_goal_minutes?: number
          id?: string
          last_practice_date?: string | null
          longest_streak?: number
          today_minutes?: number
          total_practice_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          level: number
          updated_at: string
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          level?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          level?: number
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      response_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          function_name: string
          id: string
          response_data: Json
          ttl_seconds: number
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at?: string
          function_name: string
          id?: string
          response_data: Json
          ttl_seconds?: number
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          function_name?: string
          id?: string
          response_data?: Json
          ttl_seconds?: number
        }
        Relationships: []
      }
      session_notes: {
        Row: {
          created_at: string
          id: string
          note_text: string
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_text: string
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note_text?: string
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
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
      skill_progress: {
        Row: {
          current_score: number | null
          id: string
          level: string | null
          skill_name: string
          total_practice_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_score?: number | null
          id?: string
          level?: string | null
          skill_name: string
          total_practice_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_score?: number | null
          id?: string
          level?: string | null
          skill_name?: string
          total_practice_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      speaking_turns: {
        Row: {
          created_at: string
          duration_ms: number | null
          granted_at: string | null
          id: string
          participant_id: string | null
          participant_kind: string
          priority: number
          released_at: string | null
          requested_at: string
          session_id: string
          source: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          granted_at?: string | null
          id?: string
          participant_id?: string | null
          participant_kind?: string
          priority?: number
          released_at?: string | null
          requested_at?: string
          session_id: string
          source?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          granted_at?: string | null
          id?: string
          participant_id?: string | null
          participant_kind?: string
          priority?: number
          released_at?: string | null
          requested_at?: string
          session_id?: string
          source?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "speaking_turns_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      token_usage: {
        Row: {
          cached: boolean | null
          cost_estimate: number | null
          created_at: string
          function_name: string
          id: string
          input_tokens: number | null
          model: string | null
          output_tokens: number | null
          user_id: string | null
        }
        Insert: {
          cached?: boolean | null
          cost_estimate?: number | null
          created_at?: string
          function_name: string
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          cached?: boolean | null
          cost_estimate?: number | null
          created_at?: string
          function_name?: string
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      training_data: {
        Row: {
          ai_word_count: number | null
          content_score: number | null
          created_at: string
          filler_count: number | null
          fluency_score: number | null
          id: string
          improvement_areas: Json | null
          key_arguments: Json | null
          session_duration_s: number | null
          session_id: string
          structure_score: number | null
          topic: string
          transcript_summary: string | null
          user_id: string
          user_word_count: number | null
        }
        Insert: {
          ai_word_count?: number | null
          content_score?: number | null
          created_at?: string
          filler_count?: number | null
          fluency_score?: number | null
          id?: string
          improvement_areas?: Json | null
          key_arguments?: Json | null
          session_duration_s?: number | null
          session_id: string
          structure_score?: number | null
          topic: string
          transcript_summary?: string | null
          user_id: string
          user_word_count?: number | null
        }
        Update: {
          ai_word_count?: number | null
          content_score?: number | null
          created_at?: string
          filler_count?: number | null
          fluency_score?: number | null
          id?: string
          improvement_areas?: Json | null
          key_arguments?: Json | null
          session_duration_s?: number | null
          session_id?: string
          structure_score?: number | null
          topic?: string
          transcript_summary?: string | null
          user_id?: string
          user_word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_data_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          ai_accuracy_rating: number | null
          category_ratings: Json | null
          comments: string | null
          created_at: string
          id: string
          nps: number | null
          quality_rating: number | null
          session_id: string | null
          stars: number
          ui_rating: number | null
          updated_at: string
          user_id: string
          would_recommend: boolean | null
        }
        Insert: {
          ai_accuracy_rating?: number | null
          category_ratings?: Json | null
          comments?: string | null
          created_at?: string
          id?: string
          nps?: number | null
          quality_rating?: number | null
          session_id?: string | null
          stars: number
          ui_rating?: number | null
          updated_at?: string
          user_id: string
          would_recommend?: boolean | null
        }
        Update: {
          ai_accuracy_rating?: number | null
          category_ratings?: Json | null
          comments?: string | null
          created_at?: string
          id?: string
          nps?: number | null
          quality_rating?: number | null
          session_id?: string | null
          stars?: number
          ui_rating?: number | null
          updated_at?: string
          user_id?: string
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_rankings: {
        Row: {
          best_rating: number
          elo_rating: number
          id: string
          losses: number
          tier: string
          total_matches: number
          updated_at: string
          user_id: string
          wins: number
        }
        Insert: {
          best_rating?: number
          elo_rating?: number
          id?: string
          losses?: number
          tier?: string
          total_matches?: number
          updated_at?: string
          user_id: string
          wins?: number
        }
        Update: {
          best_rating?: number
          elo_rating?: number
          id?: string
          losses?: number
          tier?: string
          total_matches?: number
          updated_at?: string
          user_id?: string
          wins?: number
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
      can_access_session: {
        Args: { _session_id: string; _user_id: string }
        Returns: boolean
      }
      close_stale_sessions: {
        Args: { _idle_minutes?: number }
        Returns: number
      }
      expire_stale_turns: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_joinable_session: { Args: { _session_id: string }; Returns: boolean }
      owns_session: {
        Args: { _session_id: string; _user_id: string }
        Returns: boolean
      }
      release_mic: { Args: { _session_id: string }; Returns: Json }
      request_mic: {
        Args: { _kind?: string; _session_id: string; _source?: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user" | "instructor"
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
      app_role: ["admin", "user", "instructor"],
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
