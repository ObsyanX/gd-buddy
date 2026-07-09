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
      accessibility_prefs: {
        Row: {
          captions: boolean
          colorblind_palette: string
          created_at: string
          dyslexia_font: boolean
          font_scale: number
          high_contrast: boolean
          id: string
          locale: string
          metadata: Json
          org_id: string | null
          speech_rate: number
          timer_visibility: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          captions?: boolean
          colorblind_palette?: string
          created_at?: string
          dyslexia_font?: boolean
          font_scale?: number
          high_contrast?: boolean
          id?: string
          locale?: string
          metadata?: Json
          org_id?: string | null
          speech_rate?: number
          timer_visibility?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          captions?: boolean
          colorblind_palette?: string
          created_at?: string
          dyslexia_font?: boolean
          font_scale?: number
          high_contrast?: boolean
          id?: string
          locale?: string
          metadata?: Json
          org_id?: string | null
          speech_rate?: number
          timer_visibility?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accessibility_prefs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      ad_campaigns: {
        Row: {
          advertiser: string | null
          budget_cents: number
          created_at: string
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          advertiser?: string | null
          budget_cents?: number
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          advertiser?: string | null
          budget_cents?: number
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ad_clicks: {
        Row: {
          ad_id: string
          country: string | null
          created_at: string
          device: string | null
          id: string
          placement: string | null
          referrer: string | null
          user_id: string | null
          visitor_id: string | null
        }
        Insert: {
          ad_id: string
          country?: string | null
          created_at?: string
          device?: string | null
          id?: string
          placement?: string | null
          referrer?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          ad_id?: string
          country?: string | null
          created_at?: string
          device?: string | null
          id?: string
          placement?: string | null
          referrer?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_clicks_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "advertisements"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_conversions: {
        Row: {
          ad_id: string
          created_at: string
          currency: string
          id: string
          meta: Json
          postback_ref: string | null
          revenue_cents: number
          source: string | null
          user_id: string | null
          visitor_id: string | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          currency?: string
          id?: string
          meta?: Json
          postback_ref?: string | null
          revenue_cents?: number
          source?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          currency?: string
          id?: string
          meta?: Json
          postback_ref?: string | null
          revenue_cents?: number
          source?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_conversions_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "advertisements"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_impressions: {
        Row: {
          ad_id: string
          country: string | null
          created_at: string
          device: string | null
          id: string
          placement: string | null
          user_id: string | null
          visitor_id: string | null
        }
        Insert: {
          ad_id: string
          country?: string | null
          created_at?: string
          device?: string | null
          id?: string
          placement?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          ad_id?: string
          country?: string | null
          created_at?: string
          device?: string | null
          id?: string
          placement?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_impressions_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "advertisements"
            referencedColumns: ["id"]
          },
        ]
      }
      adaptive_speaking_allowances: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          recommended_seconds: number
          session_id: string
          updated_at: string
          used_seconds: number
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          recommended_seconds?: number
          session_id: string
          updated_at?: string
          used_seconds?: number
          user_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          recommended_seconds?: number
          session_id?: string
          updated_at?: string
          used_seconds?: number
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "adaptive_speaking_allowances_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      adr_docs: {
        Row: {
          alternatives: string | null
          consequences: string | null
          created_at: string
          decision: string | null
          id: string
          md_body: string | null
          problem: string | null
          slug: string
          status: string
          title: string
          tradeoffs: string | null
          updated_at: string
        }
        Insert: {
          alternatives?: string | null
          consequences?: string | null
          created_at?: string
          decision?: string | null
          id?: string
          md_body?: string | null
          problem?: string | null
          slug: string
          status?: string
          title: string
          tradeoffs?: string | null
          updated_at?: string
        }
        Update: {
          alternatives?: string | null
          consequences?: string | null
          created_at?: string
          decision?: string | null
          id?: string
          md_body?: string | null
          problem?: string | null
          slug?: string
          status?: string
          title?: string
          tradeoffs?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      advertisements: {
        Row: {
          ad_type: Database["public"]["Enums"]["ad_type"]
          advertiser: string | null
          auto_paused: boolean
          browsers: string[]
          campaign_id: string | null
          click_count: number
          countries: string[]
          cpc_cents: number | null
          cpm_cents: number | null
          created_at: string
          cta_text: string | null
          daily_budget_cents: number | null
          description: string | null
          destination_url: string
          devices: string[]
          end_date: string | null
          experiment_group: string | null
          frequency_cap_per_day: number | null
          html_body: string | null
          id: string
          image_url: string | null
          image_url_dark: string | null
          lifetime_budget_cents: number | null
          max_clicks: number | null
          max_views: number | null
          media_type: string
          operating_systems: string[]
          placements: string[]
          priority: number
          refresh_ms: number | null
          rotation: Database["public"]["Enums"]["ad_rotation"]
          spend_cents: number
          start_date: string | null
          status: string
          title: string
          tracking_enabled: boolean
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          video_poster: string | null
          video_url: string | null
          view_count: number
          weight: number
        }
        Insert: {
          ad_type?: Database["public"]["Enums"]["ad_type"]
          advertiser?: string | null
          auto_paused?: boolean
          browsers?: string[]
          campaign_id?: string | null
          click_count?: number
          countries?: string[]
          cpc_cents?: number | null
          cpm_cents?: number | null
          created_at?: string
          cta_text?: string | null
          daily_budget_cents?: number | null
          description?: string | null
          destination_url: string
          devices?: string[]
          end_date?: string | null
          experiment_group?: string | null
          frequency_cap_per_day?: number | null
          html_body?: string | null
          id?: string
          image_url?: string | null
          image_url_dark?: string | null
          lifetime_budget_cents?: number | null
          max_clicks?: number | null
          max_views?: number | null
          media_type?: string
          operating_systems?: string[]
          placements?: string[]
          priority?: number
          refresh_ms?: number | null
          rotation?: Database["public"]["Enums"]["ad_rotation"]
          spend_cents?: number
          start_date?: string | null
          status?: string
          title: string
          tracking_enabled?: boolean
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          video_poster?: string | null
          video_url?: string | null
          view_count?: number
          weight?: number
        }
        Update: {
          ad_type?: Database["public"]["Enums"]["ad_type"]
          advertiser?: string | null
          auto_paused?: boolean
          browsers?: string[]
          campaign_id?: string | null
          click_count?: number
          countries?: string[]
          cpc_cents?: number | null
          cpm_cents?: number | null
          created_at?: string
          cta_text?: string | null
          daily_budget_cents?: number | null
          description?: string | null
          destination_url?: string
          devices?: string[]
          end_date?: string | null
          experiment_group?: string | null
          frequency_cap_per_day?: number | null
          html_body?: string | null
          id?: string
          image_url?: string | null
          image_url_dark?: string | null
          lifetime_budget_cents?: number | null
          max_clicks?: number | null
          max_views?: number | null
          media_type?: string
          operating_systems?: string[]
          placements?: string[]
          priority?: number
          refresh_ms?: number | null
          rotation?: Database["public"]["Enums"]["ad_rotation"]
          spend_cents?: number
          start_date?: string | null
          status?: string
          title?: string
          tracking_enabled?: boolean
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          video_poster?: string | null
          video_url?: string | null
          view_count?: number
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "advertisements_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_costs: {
        Row: {
          cost_estimate: number
          created_at: string
          function_name: string
          id: string
          input_tokens: number
          metadata: Json
          model_id: string | null
          org_id: string | null
          output_tokens: number
          request_id: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          cost_estimate?: number
          created_at?: string
          function_name: string
          id?: string
          input_tokens?: number
          metadata?: Json
          model_id?: string | null
          org_id?: string | null
          output_tokens?: number
          request_id?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          cost_estimate?: number
          created_at?: string
          function_name?: string
          id?: string
          input_tokens?: number
          metadata?: Json
          model_id?: string | null
          org_id?: string | null
          output_tokens?: number
          request_id?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_costs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_costs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_models: {
        Row: {
          active: boolean
          created_at: string
          id: string
          model_id: string
          notes: string | null
          params: Json
          purpose: string
          updated_at: string
          vendor: string
          version: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          model_id: string
          notes?: string | null
          params?: Json
          purpose: string
          updated_at?: string
          vendor: string
          version?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          model_id?: string
          notes?: string | null
          params?: Json
          purpose?: string
          updated_at?: string
          vendor?: string
          version?: string
        }
        Relationships: []
      }
      analytics_daily: {
        Row: {
          active_users: number
          ad_clicks: number
          ad_impressions: number
          ad_revenue_cents: number
          affiliate_revenue_cents: number
          article_views: number
          completed_sessions: number
          day: string
          gd_sessions: number
          page_views: number
          revenue_cents: number
          sessions: number
          signups: number
          unique_visitors: number
          updated_at: string
          visitors: number
        }
        Insert: {
          active_users?: number
          ad_clicks?: number
          ad_impressions?: number
          ad_revenue_cents?: number
          affiliate_revenue_cents?: number
          article_views?: number
          completed_sessions?: number
          day: string
          gd_sessions?: number
          page_views?: number
          revenue_cents?: number
          sessions?: number
          signups?: number
          unique_visitors?: number
          updated_at?: string
          visitors?: number
        }
        Update: {
          active_users?: number
          ad_clicks?: number
          ad_impressions?: number
          ad_revenue_cents?: number
          affiliate_revenue_cents?: number
          article_views?: number
          completed_sessions?: number
          day?: string
          gd_sessions?: number
          page_views?: number
          revenue_cents?: number
          sessions?: number
          signups?: number
          unique_visitors?: number
          updated_at?: string
          visitors?: number
        }
        Relationships: []
      }
      article_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      article_comments: {
        Row: {
          approved: boolean
          article_id: string
          body: string
          created_at: string
          id: string
          moderated_at: string | null
          moderated_by: string | null
          parent_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          article_id: string
          body: string
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          parent_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          article_id?: string
          body?: string
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          parent_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "article_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      article_likes: {
        Row: {
          article_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_likes_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_revisions: {
        Row: {
          article_id: string
          body_json: Json | null
          body_markdown: string | null
          created_at: string
          editor_id: string | null
          id: string
          summary: string | null
          title: string | null
        }
        Insert: {
          article_id: string
          body_json?: Json | null
          body_markdown?: string | null
          created_at?: string
          editor_id?: string | null
          id?: string
          summary?: string | null
          title?: string | null
        }
        Update: {
          article_id?: string
          body_json?: Json | null
          body_markdown?: string | null
          created_at?: string
          editor_id?: string | null
          id?: string
          summary?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_revisions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_tag_map: {
        Row: {
          article_id: string
          tag_id: string
        }
        Insert: {
          article_id: string
          tag_id: string
        }
        Update: {
          article_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_tag_map_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_tag_map_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "article_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      article_tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          author_id: string | null
          body_html: string | null
          body_json: Json | null
          body_markdown: string
          category_id: string | null
          comment_count: number
          created_at: string
          editor_mode: string
          featured_image: string | null
          id: string
          like_count: number
          publish_at: string | null
          reading_time_min: number
          related_ids: string[]
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          share_count: number
          slug: string
          status: Database["public"]["Enums"]["article_status"]
          summary: string | null
          thumbnail: string | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id?: string | null
          body_html?: string | null
          body_json?: Json | null
          body_markdown?: string
          category_id?: string | null
          comment_count?: number
          created_at?: string
          editor_mode?: string
          featured_image?: string | null
          id?: string
          like_count?: number
          publish_at?: string | null
          reading_time_min?: number
          related_ids?: string[]
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          share_count?: number
          slug: string
          status?: Database["public"]["Enums"]["article_status"]
          summary?: string | null
          thumbnail?: string | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string | null
          body_html?: string | null
          body_json?: Json | null
          body_markdown?: string
          category_id?: string | null
          comment_count?: number
          created_at?: string
          editor_mode?: string
          featured_image?: string | null
          id?: string
          like_count?: number
          publish_at?: string | null
          reading_time_min?: number
          related_ids?: string[]
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          share_count?: number
          slug?: string
          status?: Database["public"]["Enums"]["article_status"]
          summary?: string | null
          thumbnail?: string | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "article_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
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
      benchmark_reports: {
        Row: {
          ai_human_agreement: number | null
          calibration_ece: number | null
          created_at: string
          dataset_ref: string | null
          f1: number | null
          false_negatives: number | null
          false_positives: number | null
          id: string
          metrics: Json
          model_versions: Json
          name: string
          precision: number | null
          recall: number | null
          scope: string
        }
        Insert: {
          ai_human_agreement?: number | null
          calibration_ece?: number | null
          created_at?: string
          dataset_ref?: string | null
          f1?: number | null
          false_negatives?: number | null
          false_positives?: number | null
          id?: string
          metrics?: Json
          model_versions?: Json
          name: string
          precision?: number | null
          recall?: number | null
          scope: string
        }
        Update: {
          ai_human_agreement?: number | null
          calibration_ece?: number | null
          created_at?: string
          dataset_ref?: string | null
          f1?: number | null
          false_negatives?: number | null
          false_positives?: number | null
          id?: string
          metrics?: Json
          model_versions?: Json
          name?: string
          precision?: number | null
          recall?: number | null
          scope?: string
        }
        Relationships: []
      }
      calibration_bins: {
        Row: {
          action: string
          bin_hi: number
          bin_lo: number
          correct: number
          empirical_accuracy: number
          id: string
          samples: number
          updated_at: string
          window_days: number
        }
        Insert: {
          action: string
          bin_hi: number
          bin_lo: number
          correct?: number
          empirical_accuracy?: number
          id?: string
          samples?: number
          updated_at?: string
          window_days?: number
        }
        Update: {
          action?: string
          bin_hi?: number
          bin_lo?: number
          correct?: number
          empirical_accuracy?: number
          id?: string
          samples?: number
          updated_at?: string
          window_days?: number
        }
        Relationships: []
      }
      coaching_tips: {
        Row: {
          body: string
          category: string
          created_at: string
          evidence: Json
          headline: string
          id: string
          priority: number
          session_id: string
          user_id: string
        }
        Insert: {
          body: string
          category: string
          created_at?: string
          evidence?: Json
          headline: string
          id?: string
          priority?: number
          session_id: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          evidence?: Json
          headline?: string
          id?: string
          priority?: number
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_tips_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
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
      completion_signals: {
        Row: {
          acted_on: boolean
          confidence: number
          created_at: string
          detected_at: string
          evidence: Json
          id: string
          reason: string
          session_id: string
        }
        Insert: {
          acted_on?: boolean
          confidence: number
          created_at?: string
          detected_at?: string
          evidence?: Json
          id?: string
          reason: string
          session_id: string
        }
        Update: {
          acted_on?: boolean
          confidence?: number
          created_at?: string
          detected_at?: string
          evidence?: Json
          id?: string
          reason?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "completion_signals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      contradictions: {
        Row: {
          confidence: number
          created_at: string
          detected_at: string
          earlier_message_id: string | null
          explanation: string | null
          id: string
          later_message_id: string | null
          same_speaker: boolean
          session_id: string
        }
        Insert: {
          confidence: number
          created_at?: string
          detected_at?: string
          earlier_message_id?: string | null
          explanation?: string | null
          id?: string
          later_message_id?: string | null
          same_speaker?: boolean
          session_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          detected_at?: string
          earlier_message_id?: string | null
          explanation?: string | null
          id?: string
          later_message_id?: string | null
          same_speaker?: boolean
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contradictions_earlier_message_id_fkey"
            columns: ["earlier_message_id"]
            isOneToOne: false
            referencedRelation: "gd_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contradictions_later_message_id_fkey"
            columns: ["later_message_id"]
            isOneToOne: false
            referencedRelation: "gd_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contradictions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_memory: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          id: string
          message_id: string | null
          participant_id: string | null
          salience: number
          session_id: string
          ts: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          message_id?: string | null
          participant_id?: string | null
          salience?: number
          session_id: string
          ts?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          message_id?: string | null
          participant_id?: string | null
          salience?: number
          session_id?: string
          ts?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_memory_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "gd_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_memory_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
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
      discussion_health: {
        Row: {
          created_at: string
          energy: number
          interruption_rate: number
          overall_health: number
          participation_gini: number
          sentiment_index: number
          session_id: string
          topic_focus: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          energy?: number
          interruption_rate?: number
          overall_health?: number
          participation_gini?: number
          sentiment_index?: number
          session_id: string
          topic_focus?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          energy?: number
          interruption_rate?: number
          overall_health?: number
          participation_gini?: number
          sentiment_index?: number
          session_id?: string
          topic_focus?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_health_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      duplicate_ideas: {
        Row: {
          created_at: string
          detected_at: string
          duplicate_message_id: string | null
          id: string
          original_message_id: string | null
          session_id: string
          similarity: number
        }
        Insert: {
          created_at?: string
          detected_at?: string
          duplicate_message_id?: string | null
          id?: string
          original_message_id?: string | null
          session_id: string
          similarity: number
        }
        Update: {
          created_at?: string
          detected_at?: string
          duplicate_message_id?: string | null
          id?: string
          original_message_id?: string | null
          session_id?: string
          similarity?: number
        }
        Relationships: [
          {
            foreignKeyName: "duplicate_ideas_duplicate_message_id_fkey"
            columns: ["duplicate_message_id"]
            isOneToOne: false
            referencedRelation: "gd_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_ideas_original_message_id_fkey"
            columns: ["original_message_id"]
            isOneToOne: false
            referencedRelation: "gd_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_ideas_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      emotion_events: {
        Row: {
          arousal: number
          confidence: number
          created_at: string
          evidence: Json
          id: string
          label: string
          participant_id: string | null
          session_id: string
          source: string
          valence: number
        }
        Insert: {
          arousal?: number
          confidence?: number
          created_at?: string
          evidence?: Json
          id?: string
          label: string
          participant_id?: string | null
          session_id: string
          source: string
          valence?: number
        }
        Update: {
          arousal?: number
          confidence?: number
          created_at?: string
          evidence?: Json
          id?: string
          label?: string
          participant_id?: string | null
          session_id?: string
          source?: string
          valence?: number
        }
        Relationships: [
          {
            foreignKeyName: "emotion_events_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "gd_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emotion_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprise_metrics_daily: {
        Row: {
          avg_health: number | null
          avg_radar: Json
          created_at: string
          day: string
          id: string
          org_id: string
          participants_count: number
          sessions_count: number
          tokens_used: number
          updated_at: string
        }
        Insert: {
          avg_health?: number | null
          avg_radar?: Json
          created_at?: string
          day: string
          id?: string
          org_id: string
          participants_count?: number
          sessions_count?: number
          tokens_used?: number
          updated_at?: string
        }
        Update: {
          avg_health?: number | null
          avg_radar?: Json
          created_at?: string
          day?: string
          id?: string
          org_id?: string
          participants_count?: number
          sessions_count?: number
          tokens_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_metrics_daily_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      event_log: {
        Row: {
          actor_user_id: string | null
          created_at: string
          id: string
          kind: string
          payload: Json
          seq: number
          session_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          seq?: number
          session_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          seq?: number
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
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
      fact_checks: {
        Row: {
          checked_at: string
          claim: string
          confidence: number
          created_at: string
          explanation: string | null
          id: string
          message_id: string | null
          session_id: string
          sources: Json
          verdict: string
        }
        Insert: {
          checked_at?: string
          claim: string
          confidence: number
          created_at?: string
          explanation?: string | null
          id?: string
          message_id?: string | null
          session_id: string
          sources?: Json
          verdict: string
        }
        Update: {
          checked_at?: string
          claim?: string
          confidence?: number
          created_at?: string
          explanation?: string | null
          id?: string
          message_id?: string | null
          session_id?: string
          sources?: Json
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "fact_checks_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "gd_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_checks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      fallacies: {
        Row: {
          confidence: number
          created_at: string
          detected_at: string
          explanation: string | null
          fallacy_type: string
          id: string
          message_id: string | null
          session_id: string
        }
        Insert: {
          confidence: number
          created_at?: string
          detected_at?: string
          explanation?: string | null
          fallacy_type: string
          id?: string
          message_id?: string | null
          session_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          detected_at?: string
          explanation?: string | null
          fallacy_type?: string
          id?: string
          message_id?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fallacies_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "gd_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fallacies_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
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
          consent_analytics: boolean
          consent_recording: boolean
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
          consent_analytics?: boolean
          consent_recording?: boolean
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
          consent_analytics?: boolean
          consent_recording?: boolean
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
          extension_used: boolean
          host_user_id: string | null
          id: string
          is_multiplayer: boolean | null
          last_activity_at: string
          mic_lock_expires_at: string | null
          mic_lock_holder: string | null
          org_id: string | null
          phase: string
          room_code: string | null
          silence_meta: Json | null
          start_time: string | null
          status: Database["public"]["Enums"]["discussion_status"]
          termination_reason: string | null
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
          extension_used?: boolean
          host_user_id?: string | null
          id?: string
          is_multiplayer?: boolean | null
          last_activity_at?: string
          mic_lock_expires_at?: string | null
          mic_lock_holder?: string | null
          org_id?: string | null
          phase?: string
          room_code?: string | null
          silence_meta?: Json | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["discussion_status"]
          termination_reason?: string | null
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
          extension_used?: boolean
          host_user_id?: string | null
          id?: string
          is_multiplayer?: boolean | null
          last_activity_at?: string
          mic_lock_expires_at?: string | null
          mic_lock_holder?: string | null
          org_id?: string | null
          phase?: string
          room_code?: string | null
          silence_meta?: Json | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["discussion_status"]
          termination_reason?: string | null
          topic?: string
          topic_category?: string | null
          topic_difficulty?: string | null
          topic_tags?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gd_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_edges: {
        Row: {
          created_at: string
          from_node: string
          id: string
          relation: string
          session_id: string
          strength: number
          to_node: string
        }
        Insert: {
          created_at?: string
          from_node: string
          id?: string
          relation: string
          session_id: string
          strength?: number
          to_node: string
        }
        Update: {
          created_at?: string
          from_node?: string
          id?: string
          relation?: string
          session_id?: string
          strength?: number
          to_node?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_edges_from_node_fkey"
            columns: ["from_node"]
            isOneToOne: false
            referencedRelation: "knowledge_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_edges_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_edges_to_node_fkey"
            columns: ["to_node"]
            isOneToOne: false
            referencedRelation: "knowledge_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_nodes: {
        Row: {
          created_at: string
          first_message_id: string | null
          id: string
          label: string
          node_type: string
          salience: number
          session_id: string
        }
        Insert: {
          created_at?: string
          first_message_id?: string | null
          id?: string
          label: string
          node_type: string
          salience?: number
          session_id: string
        }
        Update: {
          created_at?: string
          first_message_id?: string | null
          id?: string
          label?: string
          node_type?: string
          salience?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_nodes_first_message_id_fkey"
            columns: ["first_message_id"]
            isOneToOne: false
            referencedRelation: "gd_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_nodes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      login_events: {
        Row: {
          country: string | null
          created_at: string
          email: string | null
          id: string
          ip: string | null
          reason: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          ip?: string | null
          reason?: string | null
          success: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          ip?: string | null
          reason?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      moderation_policies: {
        Row: {
          confidence_floor: number
          created_at: string
          enabled: boolean
          id: string
          org_id: string | null
          priority: number
          rule_id: string
          scope: string
          session_id: string | null
          then_action: Json
          updated_at: string
          when_expr: Json
        }
        Insert: {
          confidence_floor?: number
          created_at?: string
          enabled?: boolean
          id?: string
          org_id?: string | null
          priority?: number
          rule_id: string
          scope: string
          session_id?: string | null
          then_action: Json
          updated_at?: string
          when_expr: Json
        }
        Update: {
          confidence_floor?: number
          created_at?: string
          enabled?: boolean
          id?: string
          org_id?: string | null
          priority?: number
          rule_id?: string
          scope?: string
          session_id?: string | null
          then_action?: Json
          updated_at?: string
          when_expr?: Json
        }
        Relationships: [
          {
            foreignKeyName: "moderation_policies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_policies_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      moderator_decisions: {
        Row: {
          action: string
          alternatives: Json | null
          applied: boolean
          chosen_because: string | null
          confidence: number | null
          created_at: string
          evidence: Json
          id: string
          matched_rule: string | null
          reason: string | null
          reasoning_trace: Json | null
          session_id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          alternatives?: Json | null
          applied?: boolean
          chosen_because?: string | null
          confidence?: number | null
          created_at?: string
          evidence?: Json
          id?: string
          matched_rule?: string | null
          reason?: string | null
          reasoning_trace?: Json | null
          session_id: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          alternatives?: Json | null
          applied?: boolean
          chosen_because?: string | null
          confidence?: number | null
          created_at?: string
          evidence?: Json
          id?: string
          matched_rule?: string | null
          reason?: string | null
          reasoning_trace?: Json | null
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
      moderator_personalities: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          encouragement: number
          id: string
          intervention_rate: number
          is_default: boolean
          name: string
          org_id: string | null
          policy_overrides: Json
          prompt_template: string | null
          strictness: number
          tone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          encouragement?: number
          id?: string
          intervention_rate?: number
          is_default?: boolean
          name: string
          org_id?: string | null
          policy_overrides?: Json
          prompt_template?: string | null
          strictness?: number
          tone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          encouragement?: number
          id?: string
          intervention_rate?: number
          is_default?: boolean
          name?: string
          org_id?: string | null
          policy_overrides?: Json
          prompt_template?: string | null
          strictness?: number
          tone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderator_personalities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          confirm_token: string | null
          confirmed: boolean
          confirmed_at: string | null
          created_at: string
          email: string
          id: string
          source: string | null
          unsubscribe_token: string | null
          unsubscribed_at: string | null
          user_id: string | null
        }
        Insert: {
          confirm_token?: string | null
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          email: string
          id?: string
          source?: string | null
          unsubscribe_token?: string | null
          unsubscribed_at?: string | null
          user_id?: string | null
        }
        Update: {
          confirm_token?: string | null
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          source?: string | null
          unsubscribe_token?: string | null
          unsubscribed_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      org_configs: {
        Row: {
          id: string
          key: string
          org_id: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          org_id: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          org_id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "org_configs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      overrides: {
        Row: {
          actor_role: string
          actor_user_id: string | null
          created_at: string
          decision_id: string | null
          id: string
          manual_decision: Json
          original_decision: Json
          reason: string | null
          session_id: string | null
        }
        Insert: {
          actor_role: string
          actor_user_id?: string | null
          created_at?: string
          decision_id?: string | null
          id?: string
          manual_decision?: Json
          original_decision?: Json
          reason?: string | null
          session_id?: string | null
        }
        Update: {
          actor_role?: string
          actor_user_id?: string | null
          created_at?: string
          decision_id?: string | null
          id?: string
          manual_decision?: Json
          original_decision?: Json
          reason?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "overrides_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "moderator_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overrides_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          browser: string | null
          country: string | null
          created_at: string
          device: string | null
          duration_ms: number | null
          id: string
          os: string | null
          path: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          duration_ms?: number | null
          id?: string
          os?: string | null
          path: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          duration_ms?: number | null
          id?: string
          os?: string | null
          path?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_views_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "visitor_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_behaviour: {
        Row: {
          avg_turn_ms: number
          created_at: string
          dominance_score: number
          emotion_label: string | null
          engagement_score: number
          id: string
          interruption_count: number
          last_spoke_at: string | null
          participant_id: string
          sentiment_avg: number
          sentiment_trend: number
          session_id: string
          talk_time_ms: number
          turn_count: number
          updated_at: string
        }
        Insert: {
          avg_turn_ms?: number
          created_at?: string
          dominance_score?: number
          emotion_label?: string | null
          engagement_score?: number
          id?: string
          interruption_count?: number
          last_spoke_at?: string | null
          participant_id: string
          sentiment_avg?: number
          sentiment_trend?: number
          session_id: string
          talk_time_ms?: number
          turn_count?: number
          updated_at?: string
        }
        Update: {
          avg_turn_ms?: number
          created_at?: string
          dominance_score?: number
          emotion_label?: string | null
          engagement_score?: number
          id?: string
          interruption_count?: number
          last_spoke_at?: string | null
          participant_id?: string
          sentiment_avg?: number
          sentiment_trend?: number
          session_id?: string
          talk_time_ms?: number
          turn_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_behaviour_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "gd_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_behaviour_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      perf_budgets: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          p50_ms: number | null
          p90_ms: number | null
          p95_ms: number | null
          p99_ms: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          p50_ms?: number | null
          p90_ms?: number | null
          p95_ms?: number | null
          p99_ms?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          p50_ms?: number | null
          p90_ms?: number | null
          p95_ms?: number | null
          p99_ms?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      perf_events: {
        Row: {
          created_at: string
          duration_ms: number
          id: string
          metadata: Json | null
          name: string
          ok: boolean
          session_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms: number
          id?: string
          metadata?: Json | null
          name: string
          ok?: boolean
          session_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number
          id?: string
          metadata?: Json | null
          name?: string
          ok?: boolean
          session_id?: string | null
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
      prompts: {
        Row: {
          ab_flag: string | null
          active: boolean
          body: string
          category: string
          created_at: string
          id: string
          language: string
          metadata: Json
          org_id: string | null
          owner: string | null
          updated_at: string
          version: string
        }
        Insert: {
          ab_flag?: string | null
          active?: boolean
          body: string
          category: string
          created_at?: string
          id?: string
          language?: string
          metadata?: Json
          org_id?: string | null
          owner?: string | null
          updated_at?: string
          version?: string
        }
        Update: {
          ab_flag?: string | null
          active?: boolean
          body?: string
          category?: string
          created_at?: string
          id?: string
          language?: string
          metadata?: Json
          org_id?: string | null
          owner?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      replay_events: {
        Row: {
          actor_id: string | null
          actor_kind: string
          created_at: string
          event_type: string
          id: string
          offset_ms: number
          payload: Json
          replay_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_kind?: string
          created_at?: string
          event_type: string
          id?: string
          offset_ms: number
          payload?: Json
          replay_id: string
        }
        Update: {
          actor_id?: string | null
          actor_kind?: string
          created_at?: string
          event_type?: string
          id?: string
          offset_ms?: number
          payload?: Json
          replay_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "replay_events_replay_id_fkey"
            columns: ["replay_id"]
            isOneToOne: false
            referencedRelation: "session_replays"
            referencedColumns: ["id"]
          },
        ]
      }
      research_exports: {
        Row: {
          anonymized_at: string | null
          created_at: string
          download_url: string | null
          expires_at: string | null
          id: string
          metadata: Json
          org_id: string | null
          requested_by: string | null
          scope: Json
          status: string
          updated_at: string
        }
        Insert: {
          anonymized_at?: string | null
          created_at?: string
          download_url?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json
          org_id?: string | null
          requested_by?: string | null
          scope?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          anonymized_at?: string | null
          created_at?: string
          download_url?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json
          org_id?: string | null
          requested_by?: string | null
          scope?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_exports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      safety_incidents: {
        Row: {
          created_at: string
          function_name: string | null
          id: string
          kind: string
          metadata: Json
          request_id: string | null
          session_id: string | null
          snippet_hash: string | null
          verdict: string
        }
        Insert: {
          created_at?: string
          function_name?: string | null
          id?: string
          kind: string
          metadata?: Json
          request_id?: string | null
          session_id?: string | null
          snippet_hash?: string | null
          verdict: string
        }
        Update: {
          created_at?: string
          function_name?: string | null
          id?: string
          kind?: string
          metadata?: Json
          request_id?: string | null
          session_id?: string | null
          snippet_hash?: string | null
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_incidents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
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
      session_replays: {
        Row: {
          created_at: string
          duration_seconds: number
          event_count: number
          id: string
          owner_id: string
          session_id: string
          summary: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          event_count?: number
          id?: string
          owner_id: string
          session_id: string
          summary?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          event_count?: number
          id?: string
          owner_id?: string
          session_id?: string
          summary?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_replays_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_scores: {
        Row: {
          clarity: number
          collaboration: number
          computed_at: string
          created_at: string
          emotional_intelligence: number
          evidence: number
          id: string
          leadership: number
          overall: number
          reasoning: number
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clarity?: number
          collaboration?: number
          computed_at?: string
          created_at?: string
          emotional_intelligence?: number
          evidence?: number
          id?: string
          leadership?: number
          overall?: number
          reasoning?: number
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clarity?: number
          collaboration?: number
          computed_at?: string
          created_at?: string
          emotional_intelligence?: number
          evidence?: number
          id?: string
          leadership?: number
          overall?: number
          reasoning?: number
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_scores_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      silence_events: {
        Row: {
          created_at: string
          fired_at: string
          id: string
          prompt_text: string | null
          session_id: string
          silence_seconds: number
          stage: number
          target_user_id: string | null
        }
        Insert: {
          created_at?: string
          fired_at?: string
          id?: string
          prompt_text?: string | null
          session_id: string
          silence_seconds: number
          stage: number
          target_user_id?: string | null
        }
        Update: {
          created_at?: string
          fired_at?: string
          id?: string
          prompt_text?: string | null
          session_id?: string
          silence_seconds?: number
          stage?: number
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "silence_events_session_id_fkey"
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
      subsystem_versions: {
        Row: {
          created_at: string
          graph_version: string | null
          id: string
          model_versions: Json
          policy_version: string | null
          prompt_version: string | null
          reasoning_version: string | null
          scope: string
          scoring_version: string | null
          session_id: string | null
        }
        Insert: {
          created_at?: string
          graph_version?: string | null
          id?: string
          model_versions?: Json
          policy_version?: string | null
          prompt_version?: string | null
          reasoning_version?: string | null
          scope?: string
          scoring_version?: string | null
          session_id?: string | null
        }
        Update: {
          created_at?: string
          graph_version?: string | null
          id?: string
          model_versions?: Json
          policy_version?: string | null
          prompt_version?: string | null
          reasoning_version?: string | null
          scope?: string
          scoring_version?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subsystem_versions_session_id_fkey"
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
      visitor_sessions: {
        Row: {
          browser: string | null
          country: string | null
          created_at: string
          device: string | null
          entry_path: string | null
          first_seen: string
          id: string
          last_seen: string
          os: string | null
          page_count: number
          referrer: string | null
          updated_at: string
          user_agent: string | null
          user_id: string | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          entry_path?: string | null
          first_seen?: string
          id?: string
          last_seen?: string
          os?: string | null
          page_count?: number
          referrer?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          entry_path?: string | null
          first_seen?: string
          id?: string
          last_seen?: string
          os?: string | null
          page_count?: number
          referrer?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          visitor_id?: string
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
      delete_user_data: { Args: { _user_id: string }; Returns: undefined }
      expire_stale_turns: { Args: never; Returns: number }
      export_user_data: { Args: { _user_id: string }; Returns: Json }
      get_feature_flag: { Args: { _key: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_article_like: { Args: { _slug: string }; Returns: undefined }
      increment_article_share: { Args: { _slug: string }; Returns: undefined }
      increment_article_view: { Args: { _slug: string }; Returns: undefined }
      is_joinable_session: { Args: { _session_id: string }; Returns: boolean }
      migrate_session_host: {
        Args: { _idle_seconds?: number; _session_id: string }
        Returns: Json
      }
      owns_session: {
        Args: { _session_id: string; _user_id: string }
        Returns: boolean
      }
      related_articles: {
        Args: { _article_id: string; _limit?: number }
        Returns: {
          author_id: string | null
          body_html: string | null
          body_json: Json | null
          body_markdown: string
          category_id: string | null
          comment_count: number
          created_at: string
          editor_mode: string
          featured_image: string | null
          id: string
          like_count: number
          publish_at: string | null
          reading_time_min: number
          related_ids: string[]
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          share_count: number
          slug: string
          status: Database["public"]["Enums"]["article_status"]
          summary: string | null
          thumbnail: string | null
          title: string
          updated_at: string
          view_count: number
        }[]
        SetofOptions: {
          from: "*"
          to: "articles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      release_mic: { Args: { _session_id: string }; Returns: Json }
      request_mic: {
        Args: { _kind?: string; _session_id: string; _source?: string }
        Returns: Json
      }
    }
    Enums: {
      ad_rotation: "random" | "weighted" | "sequential" | "priority"
      ad_type:
        | "banner"
        | "sidebar"
        | "native"
        | "card"
        | "inline"
        | "sticky_footer"
        | "popup"
        | "video"
      app_role: "admin" | "user" | "instructor" | "editor" | "analyst"
      article_status: "draft" | "scheduled" | "published" | "archived"
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
      ad_rotation: ["random", "weighted", "sequential", "priority"],
      ad_type: [
        "banner",
        "sidebar",
        "native",
        "card",
        "inline",
        "sticky_footer",
        "popup",
        "video",
      ],
      app_role: ["admin", "user", "instructor", "editor", "analyst"],
      article_status: ["draft", "scheduled", "published", "archived"],
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
