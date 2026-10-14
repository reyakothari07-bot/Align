export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      brand_profiles: {
        Row: {
          industry_other: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          about: string | null
          audience_age_max: number
          audience_age_min: number
          brand_name: string
          created_at: string
          followers: number
          ig_handle: string
          industry: string
          location: string
          user_id: string
        }
        Insert: {
          industry_other?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          about?: string | null
          audience_age_max: number
          audience_age_min: number
          brand_name: string
          created_at?: string
          followers: number
          ig_handle: string
          industry: string
          location: string
          user_id: string
        }
        Update: {
          industry_other?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          about?: string | null
          audience_age_max?: number
          audience_age_min?: number
          brand_name?: string
          created_at?: string
          followers?: number
          ig_handle?: string
          industry?: string
          location?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          niche_other: string | null
          brand_id: string
          brief: string | null
          budget_bucket: Database["public"]["Enums"]["budget_bucket"]
          comp_type: Database["public"]["Enums"]["comp_type"]
          content_other: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string
          deadline: string
          id: string
          niche: string
          slots: number
          slots_filled: number
          status: Database["public"]["Enums"]["campaign_status"]
          title: string
        }
        Insert: {
          niche_other?: string | null
          brand_id: string
          brief?: string | null
          budget_bucket: Database["public"]["Enums"]["budget_bucket"]
          comp_type: Database["public"]["Enums"]["comp_type"]
          content_other?: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          created_at?: string
          deadline: string
          id?: string
          niche: string
          slots: number
          slots_filled?: number
          status?: Database["public"]["Enums"]["campaign_status"]
          title: string
        }
        Update: {
          niche_other?: string | null
          brand_id?: string
          brief?: string | null
          budget_bucket?: Database["public"]["Enums"]["budget_bucket"]
          comp_type?: Database["public"]["Enums"]["comp_type"]
          content_other?: string | null
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          deadline?: string
          id?: string
          niche?: string
          slots?: number
          slots_filled?: number
          status?: Database["public"]["Enums"]["campaign_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_cards"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      creator_profiles: {
        Row: {
          niche_other: string | null
          niches: string[]
          followers_checked_at: string | null
          age: number
          bio: string | null
          city: string
          content_types: Database["public"]["Enums"]["content_type"][]
          created_at: string
          followers: number
          ig_handle: string
          niche: string
          portfolio: string[]
          other_content: string | null
          rates: Json
          user_id: string
        }
        Insert: {
          niche_other?: string | null
          niches?: string[]
          followers_checked_at?: string | null
          age: number
          bio?: string | null
          city: string
          content_types?: Database["public"]["Enums"]["content_type"][]
          created_at?: string
          followers: number
          ig_handle: string
          niche: string
          portfolio: string[]
          other_content?: string | null
          rates?: Json
          user_id: string
        }
        Update: {
          niche_other?: string | null
          niches?: string[]
          followers_checked_at?: string | null
          age?: number
          bio?: string | null
          city?: string
          content_types?: Database["public"]["Enums"]["content_type"][]
          created_at?: string
          followers?: number
          ig_handle?: string
          niche?: string
          portfolio?: string[]
          other_content?: string | null
          rates?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          dispute_type: string | null
          disputed_by: string | null
          payment_overdue_at: string | null
          amount: number | null
          auto_completed: boolean
          brand_id: string
          comp_type: Database["public"]["Enums"]["comp_type"]
          completed_at: string | null
          created_at: string
          creator_id: string
          dispute_reason: string | null
          disputed_at: string | null
          id: string
          payment_received_at: string | null
          post_url: string | null
          posted_at: string | null
          request_id: string
          status: Database["public"]["Enums"]["deal_status"]
          updated_at: string
        }
        Insert: {
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          dispute_type?: string | null
          disputed_by?: string | null
          payment_overdue_at?: string | null
          amount?: number | null
          auto_completed?: boolean
          brand_id: string
          comp_type: Database["public"]["Enums"]["comp_type"]
          completed_at?: string | null
          created_at?: string
          creator_id: string
          dispute_reason?: string | null
          disputed_at?: string | null
          id?: string
          payment_received_at?: string | null
          post_url?: string | null
          posted_at?: string | null
          request_id: string
          status?: Database["public"]["Enums"]["deal_status"]
          updated_at?: string
        }
        Update: {
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          dispute_type?: string | null
          disputed_by?: string | null
          payment_overdue_at?: string | null
          amount?: number | null
          auto_completed?: boolean
          brand_id?: string
          comp_type?: Database["public"]["Enums"]["comp_type"]
          completed_at?: string | null
          created_at?: string
          creator_id?: string
          dispute_reason?: string | null
          disputed_at?: string | null
          id?: string
          payment_received_at?: string | null
          post_url?: string | null
          posted_at?: string | null
          request_id?: string
          status?: Database["public"]["Enums"]["deal_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_cards"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deals_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deals_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_cards"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deals_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "request_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          deal_id: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          deal_id: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deal_id?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deal_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "request_cards"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          deal_id: string | null
          emailed_at: string | null
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          deal_id?: string | null
          emailed_at?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          deal_id?: string | null
          emailed_at?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deal_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "request_cards"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          brand_agreed_at: string | null
          brand_terms_version: string | null
          amount: number | null
          brand_id: string
          campaign_id: string | null
          comp_type: Database["public"]["Enums"]["comp_type"]
          content_other: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          counter_amount: number | null
          countered_by: string | null
          created_at: string
          creator_id: string
          deadline: string
          deliverable: string
          id: string
          initiated_by: string
          note: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          brand_agreed_at?: string | null
          brand_terms_version?: string | null
          amount?: number | null
          brand_id: string
          campaign_id?: string | null
          comp_type: Database["public"]["Enums"]["comp_type"]
          content_other?: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          counter_amount?: number | null
          countered_by?: string | null
          created_at?: string
          creator_id: string
          deadline: string
          deliverable: string
          id?: string
          initiated_by: string
          note?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          brand_agreed_at?: string | null
          brand_terms_version?: string | null
          amount?: number | null
          brand_id?: string
          campaign_id?: string | null
          comp_type?: Database["public"]["Enums"]["comp_type"]
          content_other?: string | null
          content_type?: Database["public"]["Enums"]["content_type"]
          counter_amount?: number | null
          countered_by?: string | null
          created_at?: string
          creator_id?: string
          deadline?: string
          deliverable?: string
          id?: string
          initiated_by?: string
          note?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_cards"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "requests_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "requests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_countered_by_fkey"
            columns: ["countered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_cards"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "requests_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          reviewee_id: string
          reviewer_id: string
          stars: number
          text: string | null
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          reviewee_id: string
          reviewer_id: string
          stars: number
          text?: string | null
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          reviewee_id?: string
          reviewer_id?: string
          stars?: number
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deal_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "request_cards"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_private: {
        Row: {
          email: string | null
          phone: string | null
          user_id: string
        }
        Insert: {
          email?: string | null
          phone?: string | null
          user_id: string
        }
        Update: {
          email?: string | null
          phone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_private_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"] | null
          suspended: boolean
          violation_count: number
        }
        Insert: {
          created_at?: string
          id: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          suspended?: boolean
          violation_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          suspended?: boolean
          violation_count?: number
        }
        Relationships: []
      }
    }
    Views: {
      brand_cards: {
        Row: {
          industry_other: string | null
          open_payment_reports: number | null
          about: string | null
          audience_age_max: number | null
          audience_age_min: number | null
          avg_stars: number | null
          brand_name: string | null
          contact_name: string | null
          created_at: string | null
          followers: number | null
          ig_handle: string | null
          industry: string | null
          location: string | null
          review_count: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_cards: {
        Row: {
          industry_other: string | null
          niche_other: string | null
          brand_open_payment_reports: number | null
          brand_avg_stars: number | null
          brand_id: string | null
          brand_ig_handle: string | null
          brand_name: string | null
          brand_review_count: number | null
          brief: string | null
          budget_bucket: Database["public"]["Enums"]["budget_bucket"] | null
          comp_type: Database["public"]["Enums"]["comp_type"] | null
          content_other: string | null
          content_type: Database["public"]["Enums"]["content_type"] | null
          created_at: string | null
          deadline: string | null
          id: string | null
          industry: string | null
          location: string | null
          niche: string | null
          slots: number | null
          slots_filled: number | null
          status: Database["public"]["Enums"]["campaign_status"] | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_cards"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      creator_cards: {
        Row: {
          niche_other: string | null
          niches: string[] | null
          age: number | null
          avg_stars: number | null
          bio: string | null
          city: string | null
          content_types: Database["public"]["Enums"]["content_type"][] | null
          created_at: string | null
          followers: number | null
          ig_handle: string | null
          name: string | null
          niche: string | null
          portfolio: string[] | null
          other_content: string | null
          rate_buckets: string[] | null
          rates: Json | null
          review_count: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_cards: {
        Row: {
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          dispute_type: string | null
          disputed_by: string | null
          payment_overdue_at: string | null
          brand_agreed_at: string | null
          brand_terms_version: string | null
          amount: number | null
          auto_completed: boolean | null
          brand_id: string | null
          brand_name: string | null
          campaign_id: string | null
          comp_type: Database["public"]["Enums"]["comp_type"] | null
          completed_at: string | null
          content_other: string | null
          content_type: Database["public"]["Enums"]["content_type"] | null
          created_at: string | null
          creator_id: string | null
          creator_ig_handle: string | null
          creator_name: string | null
          deadline: string | null
          deliverable: string | null
          dispute_reason: string | null
          disputed_at: string | null
          id: string | null
          note: string | null
          payment_received_at: string | null
          post_url: string | null
          posted_at: string | null
          request_id: string | null
          status: Database["public"]["Enums"]["deal_status"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_cards"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deals_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deals_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_cards"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deals_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "request_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      request_cards: {
        Row: {
          brand_agreed_at: string | null
          brand_terms_version: string | null
          amount: number | null
          brand_id: string | null
          brand_name: string | null
          campaign_id: string | null
          campaign_title: string | null
          comp_type: Database["public"]["Enums"]["comp_type"] | null
          content_other: string | null
          content_type: Database["public"]["Enums"]["content_type"] | null
          counter_amount: number | null
          countered_by: string | null
          created_at: string | null
          creator_followers: number | null
          creator_id: string | null
          creator_ig_handle: string | null
          creator_name: string | null
          deadline: string | null
          deal_id: string | null
          deliverable: string | null
          id: string | null
          initiated_by: string | null
          note: string | null
          status: Database["public"]["Enums"]["request_status"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_cards"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "requests_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "requests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_countered_by_fkey"
            columns: ["countered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_cards"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "requests_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ratings: {
        Row: {
          avg_stars: number | null
          review_count: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_brand_terms: { Args: { p_version: string }; Returns: undefined }
      admin_deal_messages: { Args: { p_deal_id: string }; Returns: Json }
      admin_disputes: { Args: never; Returns: Json }
      admin_mark_followers_checked: { Args: { p_user_id: string }; Returns: undefined }
      admin_overview: { Args: never; Returns: Json }
      admin_resolve_dispute: {
        Args: { p_deal_id: string; p_note: string; p_outcome: string }
        Returns: undefined
      }
      admin_set_suspended: {
        Args: { p_suspended: boolean; p_user_id: string }
        Returns: undefined
      }
      admin_users: { Args: { p_filter?: string; p_search?: string }; Returns: Json }
      apply_to_campaign: {
        Args: { p_campaign_id: string; p_note?: string; p_quote: number }
        Returns: string
      }
      assert_active: { Args: never; Returns: string }
      auto_complete_deals: { Args: never; Returns: number }
      brand_has_current_terms: { Args: { p_brand_id: string }; Returns: boolean }
      brand_open_payment_reports: { Args: { p_brand_id: string }; Returns: number }
      brand_terms_version: { Args: never; Returns: string }
      complete_brand_onboarding: {
        Args: {
          p_about: string
          p_audience_age_max: number
          p_audience_age_min: number
          p_brand_name: string
          p_confirm_adult: boolean
          p_email: string
          p_followers: number
          p_ig_handle: string
          p_industry: string
          p_location: string
          p_name: string
          p_accept_terms: boolean
          p_phone?: string
          p_industry_other?: string
        }
        Returns: undefined
      }
      complete_creator_onboarding: {
        Args: {
          p_age: number
          p_bio: string
          p_city: string
          p_content_types: Database["public"]["Enums"]["content_type"][]
          p_email: string
          p_followers: number
          p_ig_handle: string
          p_name: string
          p_niche: string
          p_other_content: string
          p_portfolio: string[]
          p_rates: Json
          p_phone?: string
          p_niche_other?: string
          p_niches?: string[]
        }
        Returns: undefined
      }
      display_name: { Args: { p_user_id: string }; Returns: string }
      flag_overdue_payments: { Args: never; Returns: number }
      has_contact_info: { Args: { txt: string }; Returns: boolean }
      inr: { Args: { p_amount: number }; Returns: string }
      is_active: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      normalize_handle: { Args: { p_handle: string }; Returns: string }
      normalize_in_mobile: { Args: { p: string }; Returns: string }
      notify: {
        Args: {
          p_body: string
          p_deal_id?: string
          p_link: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      respond_request: {
        Args: {
          p_action: string
          p_counter_amount?: number
          p_request_id: string
          p_agree_to_pay?: boolean
        }
        Returns: string
      }
      send_brand_request: {
        Args: {
          p_amount: number
          p_comp_type: Database["public"]["Enums"]["comp_type"]
          p_content_type: Database["public"]["Enums"]["content_type"]
          p_creator_id: string
          p_deadline: string
          p_content_other?: string
          p_deliverable: string
          p_note: string
          p_agree_to_pay?: boolean
        }
        Returns: string
      }
      send_deadline_reminders: { Args: never; Returns: number }
      valid_other: { Args: { p_is_other: boolean; p_text: string }; Returns: boolean }
      valid_rates: {
        Args: { p_rates: Json; p_types: Database["public"]["Enums"]["content_type"][] }
        Returns: boolean
      }
      send_message: {
        Args: { p_body: string; p_deal_id: string }
        Returns: Json
      }
      submit_review: {
        Args: { p_deal_id: string; p_stars: number; p_text?: string }
        Returns: undefined
      }
      update_deal_status: {
        Args: {
          p_deal_id: string
          p_post_url?: string
          p_reason?: string
          p_status: Database["public"]["Enums"]["deal_status"]
        }
        Returns: undefined
      }
    }
    Enums: {
      budget_bucket:
        | "Barter"
        | "₹1K–2K"
        | "₹2K–3K"
        | "₹3K–4K"
        | "₹4K–5K"
        | "₹5K–6K"
        | "₹6K–7K"
        | "₹7K–8K"
        | "₹8K–9K"
        | "₹9K–10K"
        | "₹10K–11K"
        | "₹11K–12K"
        | "₹12K+"
      campaign_status: "open" | "closed"
      comp_type: "paid" | "barter" | "both"
      content_type: "UGC" | "Reel" | "Post" | "Story" | "Other"
      deal_status:
        | "in_progress"
        | "posted"
        | "payment_received"
        | "completed"
        | "disputed"
      request_status: "requested" | "countered" | "accepted" | "declined"
      user_role: "creator" | "brand"
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
    Enums: {
      budget_bucket: [
        "Barter",
        "₹1K–2K",
        "₹2K–3K",
        "₹3K–4K",
        "₹4K–5K",
        "₹5K–6K",
        "₹6K–7K",
        "₹7K–8K",
        "₹8K–9K",
        "₹9K–10K",
        "₹10K–11K",
        "₹11K–12K",
        "₹12K+",
      ],
      campaign_status: ["open", "closed"],
      comp_type: ["paid", "barter", "both"],
      content_type: ["UGC", "Reel", "Post", "Story", "Other"],
      deal_status: [
        "in_progress",
        "posted",
        "payment_received",
        "completed",
        "disputed",
      ],
      request_status: ["requested", "countered", "accepted", "declined"],
      user_role: ["creator", "brand"],
    },
  },
} as const

