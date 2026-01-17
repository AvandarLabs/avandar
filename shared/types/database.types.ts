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
      dashboards: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          owner_id: string
          owner_profile_id: string
          slug: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          config: Json
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          owner_id?: string
          owner_profile_id: string
          slug?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          owner_id?: string
          owner_profile_id?: string
          slug?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboards_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboards_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dataset_columns: {
        Row: {
          column_idx: number
          created_at: string
          data_type: Database["public"]["Enums"]["datasets__ava_data_type"]
          dataset_id: string
          description: string | null
          detected_data_type: Database["public"]["Enums"]["datasets__duckdb_data_type"]
          id: string
          name: string
          original_data_type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          column_idx: number
          created_at?: string
          data_type: Database["public"]["Enums"]["datasets__ava_data_type"]
          dataset_id: string
          description?: string | null
          detected_data_type: Database["public"]["Enums"]["datasets__duckdb_data_type"]
          id?: string
          name: string
          original_data_type: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          column_idx?: number
          created_at?: string
          data_type?: Database["public"]["Enums"]["datasets__ava_data_type"]
          dataset_id?: string
          description?: string | null
          detected_data_type?: Database["public"]["Enums"]["datasets__duckdb_data_type"]
          id?: string
          name?: string
          original_data_type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dataset_columns_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dataset_columns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets: {
        Row: {
          created_at: string
          date_of_last_sync: string | null
          description: string | null
          id: string
          name: string
          owner_id: string
          owner_profile_id: string
          source_type: Database["public"]["Enums"]["datasets__source_type"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          date_of_last_sync?: string | null
          description?: string | null
          id?: string
          name: string
          owner_id?: string
          owner_profile_id: string
          source_type: Database["public"]["Enums"]["datasets__source_type"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          date_of_last_sync?: string | null
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          owner_profile_id?: string
          source_type?: Database["public"]["Enums"]["datasets__source_type"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "datasets_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datasets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets__csv_file: {
        Row: {
          comment_char: string | null
          created_at: string
          dataset_id: string
          date_format: string | null
          delimiter: string
          escape_char: string | null
          has_header: boolean
          id: string
          newline_delimiter: string
          offline_only: boolean
          quote_char: string | null
          rows_to_skip: number
          size_in_bytes: number
          timestamp_format: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          comment_char?: string | null
          created_at?: string
          dataset_id: string
          date_format?: string | null
          delimiter: string
          escape_char?: string | null
          has_header?: boolean
          id?: string
          newline_delimiter?: string
          offline_only?: boolean
          quote_char?: string | null
          rows_to_skip?: number
          size_in_bytes: number
          timestamp_format?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          comment_char?: string | null
          created_at?: string
          dataset_id?: string
          date_format?: string | null
          delimiter?: string
          escape_char?: string | null
          has_header?: boolean
          id?: string
          newline_delimiter?: string
          offline_only?: boolean
          quote_char?: string | null
          rows_to_skip?: number
          size_in_bytes?: number
          timestamp_format?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "datasets__csv_file_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: true
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datasets__csv_file_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets__google_sheets: {
        Row: {
          created_at: string
          dataset_id: string
          google_account_id: string
          google_document_id: string
          id: string
          rows_to_skip: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          dataset_id: string
          google_account_id: string
          google_document_id: string
          id?: string
          rows_to_skip?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          dataset_id?: string
          google_account_id?: string
          google_document_id?: string
          id?: string
          rows_to_skip?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "datasets__google_sheets_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: true
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datasets__google_sheets_google_account_id_fkey"
            columns: ["google_account_id"]
            isOneToOne: false
            referencedRelation: "tokens__google"
            referencedColumns: ["google_account_id"]
          },
          {
            foreignKeyName: "datasets__google_sheets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dexie_dbs: {
        Row: {
          created_at: string
          db_id: string
          id: string
          last_seen_at: string
          user_agent: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          db_id: string
          id?: string
          last_seen_at?: string
          user_agent: string
          user_id?: string
          version: number
        }
        Update: {
          created_at?: string
          db_id?: string
          id?: string
          last_seen_at?: string
          user_agent?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      entities: {
        Row: {
          assigned_to: string | null
          created_at: string
          entity_config_id: string
          external_id: string
          id: string
          name: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          entity_config_id: string
          external_id: string
          id?: string
          name: string
          status: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          entity_config_id?: string
          external_id?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entities_entity_config_id_fkey"
            columns: ["entity_config_id"]
            isOneToOne: false
            referencedRelation: "entity_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_configs: {
        Row: {
          allow_manual_creation: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          allow_manual_creation: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          allow_manual_creation?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_field_configs: {
        Row: {
          allow_manual_edit: boolean
          created_at: string
          data_type: Database["public"]["Enums"]["datasets__ava_data_type"]
          description: string | null
          entity_config_id: string
          id: string
          is_array: boolean
          is_id_field: boolean
          is_title_field: boolean
          name: string
          updated_at: string
          value_extractor_type: Database["public"]["Enums"]["entity_field_configs__value_extractor_type"]
          workspace_id: string
        }
        Insert: {
          allow_manual_edit: boolean
          created_at?: string
          data_type: Database["public"]["Enums"]["datasets__ava_data_type"]
          description?: string | null
          entity_config_id: string
          id?: string
          is_array: boolean
          is_id_field: boolean
          is_title_field: boolean
          name: string
          updated_at?: string
          value_extractor_type: Database["public"]["Enums"]["entity_field_configs__value_extractor_type"]
          workspace_id: string
        }
        Update: {
          allow_manual_edit?: boolean
          created_at?: string
          data_type?: Database["public"]["Enums"]["datasets__ava_data_type"]
          description?: string | null
          entity_config_id?: string
          id?: string
          is_array?: boolean
          is_id_field?: boolean
          is_title_field?: boolean
          name?: string
          updated_at?: string
          value_extractor_type?: Database["public"]["Enums"]["entity_field_configs__value_extractor_type"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_field_configs_entity_config_id_fkey"
            columns: ["entity_config_id"]
            isOneToOne: false
            referencedRelation: "entity_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_field_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          ended_at: string | null
          ends_at: string | null
          feature_plan_type: Database["public"]["Enums"]["subscriptions__feature_plan_type"]
          max_seats_allowed: number
          polar_customer_email: string
          polar_customer_id: string
          polar_product_id: string
          polar_subscription_id: string
          started_at: string | null
          subscription_owner_id: string
          subscription_status: Database["public"]["Enums"]["subscriptions__status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          ended_at?: string | null
          ends_at?: string | null
          feature_plan_type: Database["public"]["Enums"]["subscriptions__feature_plan_type"]
          max_seats_allowed: number
          polar_customer_email: string
          polar_customer_id: string
          polar_product_id: string
          polar_subscription_id: string
          started_at?: string | null
          subscription_owner_id: string
          subscription_status: Database["public"]["Enums"]["subscriptions__status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          ended_at?: string | null
          ends_at?: string | null
          feature_plan_type?: Database["public"]["Enums"]["subscriptions__feature_plan_type"]
          max_seats_allowed?: number
          polar_customer_email?: string
          polar_customer_id?: string
          polar_product_id?: string
          polar_subscription_id?: string
          started_at?: string | null
          subscription_owner_id?: string
          subscription_status?: Database["public"]["Enums"]["subscriptions__status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tokens__google: {
        Row: {
          access_token: string
          created_at: string
          expiry_date: string
          google_account_id: string
          google_email: string
          id: string
          refresh_token: string
          scope: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expiry_date: string
          google_account_id: string
          google_email: string
          id?: string
          refresh_token: string
          scope: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expiry_date?: string
          google_account_id?: string
          google_email?: string
          id?: string
          refresh_token?: string
          scope?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          display_name: string
          full_name: string
          id: string
          membership_id: string
          polar_product_id: string | null
          subscription_id: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          full_name: string
          id?: string
          membership_id: string
          polar_product_id?: string | null
          subscription_id?: string | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          full_name?: string
          id?: string
          membership_id?: string
          polar_product_id?: string | null
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: true
            referencedRelation: "workspace_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          membership_id: string
          role: string
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          membership_id: string
          role: string
          updated_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          membership_id?: string
          role?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: true
            referencedRelation: "workspace_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      value_extractors__dataset_column_value: {
        Row: {
          created_at: string
          dataset_column_id: string
          dataset_id: string
          entity_field_config_id: string
          id: string
          updated_at: string
          value_picker_rule_type: Database["public"]["Enums"]["value_extractors__value_picker_rule_type"]
          workspace_id: string
        }
        Insert: {
          created_at?: string
          dataset_column_id: string
          dataset_id: string
          entity_field_config_id: string
          id?: string
          updated_at?: string
          value_picker_rule_type: Database["public"]["Enums"]["value_extractors__value_picker_rule_type"]
          workspace_id: string
        }
        Update: {
          created_at?: string
          dataset_column_id?: string
          dataset_id?: string
          entity_field_config_id?: string
          id?: string
          updated_at?: string
          value_picker_rule_type?: Database["public"]["Enums"]["value_extractors__value_picker_rule_type"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "value_extractors__dataset_column_va_entity_field_config_id_fkey"
            columns: ["entity_field_config_id"]
            isOneToOne: true
            referencedRelation: "entity_field_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "value_extractors__dataset_column_value_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      value_extractors__manual_entry: {
        Row: {
          created_at: string
          entity_field_config_id: string
          id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          entity_field_config_id: string
          id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          entity_field_config_id?: string
          id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "value_extractors__manual_entry_entity_field_config_id_fkey"
            columns: ["entity_field_config_id"]
            isOneToOne: true
            referencedRelation: "entity_field_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "value_extractors__manual_entry_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_signups: {
        Row: {
          code_is_used: boolean
          created_at: string
          email: string
          id: string
          signup_code: string
        }
        Insert: {
          code_is_used?: boolean
          created_at?: string
          email: string
          id?: string
          signup_code: string
        }
        Update: {
          code_is_used?: boolean
          created_at?: string
          email?: string
          id?: string
          signup_code?: string
        }
        Relationships: []
      }
      workspace_invites: {
        Row: {
          created_at: string
          email: string
          id: string
          invite_status: Database["public"]["Enums"]["workspace_invites__status"]
          invited_by: string
          role: string
          updated_at: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invite_status: Database["public"]["Enums"]["workspace_invites__status"]
          invited_by: string
          role: string
          updated_at?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invite_status?: Database["public"]["Enums"]["workspace_invites__status"]
          invited_by?: string
          role?: string
          updated_at?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_memberships: {
        Row: {
          created_at: string
          id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_memberships_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id?: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      rpc_datasets__add_csv_file_dataset: {
        Args: {
          p_columns: Database["public"]["CompositeTypes"]["dataset_column_input"][]
          p_comment_char: Database["public"]["CompositeTypes"]["util__nullable_text"]
          p_dataset_description: string
          p_dataset_id: string
          p_dataset_name: string
          p_date_format: Database["public"]["CompositeTypes"]["datasets__csv_file__date_format"]
          p_delimiter: string
          p_escape_char: Database["public"]["CompositeTypes"]["util__nullable_text"]
          p_has_header: boolean
          p_newline_delimiter: string
          p_offline_only: boolean
          p_quote_char: Database["public"]["CompositeTypes"]["util__nullable_text"]
          p_rows_to_skip: number
          p_size_in_bytes: number
          p_workspace_id: string
        }
        Returns: {
          created_at: string
          date_of_last_sync: string | null
          description: string | null
          id: string
          name: string
          owner_id: string
          owner_profile_id: string
          source_type: Database["public"]["Enums"]["datasets__source_type"]
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "datasets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_datasets__add_dataset: {
        Args: {
          p_columns: Database["public"]["CompositeTypes"]["dataset_column_input"][]
          p_dataset_description: string
          p_dataset_id: string
          p_dataset_name: string
          p_dataset_source_type: Database["public"]["Enums"]["datasets__source_type"]
          p_workspace_id: string
        }
        Returns: {
          created_at: string
          date_of_last_sync: string | null
          description: string | null
          id: string
          name: string
          owner_id: string
          owner_profile_id: string
          source_type: Database["public"]["Enums"]["datasets__source_type"]
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "datasets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_datasets__add_google_sheets_dataset: {
        Args: {
          p_columns: Database["public"]["CompositeTypes"]["dataset_column_input"][]
          p_dataset_description: string
          p_dataset_id: string
          p_dataset_name: string
          p_google_account_id: string
          p_google_document_id: string
          p_rows_to_skip?: number
          p_workspace_id: string
        }
        Returns: {
          created_at: string
          date_of_last_sync: string | null
          description: string | null
          id: string
          name: string
          owner_id: string
          owner_profile_id: string
          source_type: Database["public"]["Enums"]["datasets__source_type"]
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "datasets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_workspaces__create_with_owner: {
        Args: {
          p_display_name: string
          p_full_name: string
          p_workspace_name: string
          p_workspace_slug: string
        }
        Returns: {
          created_at: string
          id: string
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "workspaces"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      util__get_auth_user_owned_workspaces: { Args: never; Returns: string[] }
      util__get_auth_user_workspaces: { Args: never; Returns: string[] }
      util__get_auth_user_workspaces_by_role: {
        Args: { role: string }
        Returns: string[]
      }
      util__get_user_id_by_email: { Args: { p_email: string }; Returns: string }
      util__get_workspace_members: {
        Args: { workspace_id: string }
        Returns: string[]
      }
    }
    Enums: {
      datasets__ava_data_type:
        | "boolean"
        | "bigint"
        | "double"
        | "time"
        | "date"
        | "timestamp"
        | "varchar"
      datasets__duckdb_data_type:
        | "BOOLEAN"
        | "TINYINT"
        | "SMALLINT"
        | "INTEGER"
        | "BIGINT"
        | "UBIGINT"
        | "UTINYINT"
        | "USMALLINT"
        | "UINTEGER"
        | "FLOAT"
        | "DOUBLE"
        | "DECIMAL"
        | "DATE"
        | "TIME"
        | "TIMESTAMP"
        | "TIMESTAMP_TZ"
        | "TIMESTAMP WITH TIME ZONE"
        | "INTERVAL"
        | "VARCHAR"
        | "BLOB"
        | "UUID"
        | "HUGEINT"
        | "BIT"
        | "ENUM"
        | "MAP"
        | "STRUCT"
        | "LIST"
        | "UNION"
        | "JSON"
        | "GEOMETRY"
      datasets__source_type: "csv_file" | "google_sheets"
      entity_field_configs__value_extractor_type:
        | "dataset_column_value"
        | "manual_entry"
      subscriptions__feature_plan_type: "free" | "basic" | "premium"
      subscriptions__status:
        | "incomplete"
        | "incomplete_expired"
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "unpaid"
      subscriptions__update_status: "pending" | "completed"
      value_extractors__value_picker_rule_type:
        | "most_frequent"
        | "first"
        | "sum"
        | "avg"
        | "count"
        | "max"
        | "min"
      workspace_invites__status: "pending" | "accepted"
    }
    CompositeTypes: {
      dataset_column_input: {
        name: string | null
        description: string | null
        original_data_type: string | null
        detected_data_type:
          | Database["public"]["Enums"]["datasets__duckdb_data_type"]
          | null
        data_type: Database["public"]["Enums"]["datasets__ava_data_type"] | null
        column_idx: number | null
      }
      datasets__csv_file__date_format: {
        date_format: string | null
        timestamp_format: string | null
      }
      util__nullable_text: {
        value: string | null
      }
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
      datasets__ava_data_type: [
        "boolean",
        "bigint",
        "double",
        "time",
        "date",
        "timestamp",
        "varchar",
      ],
      datasets__duckdb_data_type: [
        "BOOLEAN",
        "TINYINT",
        "SMALLINT",
        "INTEGER",
        "BIGINT",
        "UBIGINT",
        "UTINYINT",
        "USMALLINT",
        "UINTEGER",
        "FLOAT",
        "DOUBLE",
        "DECIMAL",
        "DATE",
        "TIME",
        "TIMESTAMP",
        "TIMESTAMP_TZ",
        "TIMESTAMP WITH TIME ZONE",
        "INTERVAL",
        "VARCHAR",
        "BLOB",
        "UUID",
        "HUGEINT",
        "BIT",
        "ENUM",
        "MAP",
        "STRUCT",
        "LIST",
        "UNION",
        "JSON",
        "GEOMETRY",
      ],
      datasets__source_type: ["csv_file", "google_sheets"],
      entity_field_configs__value_extractor_type: [
        "dataset_column_value",
        "manual_entry",
      ],
      subscriptions__feature_plan_type: ["free", "basic", "premium"],
      subscriptions__status: [
        "incomplete",
        "incomplete_expired",
        "trialing",
        "active",
        "past_due",
        "canceled",
        "unpaid",
      ],
      subscriptions__update_status: ["pending", "completed"],
      value_extractors__value_picker_rule_type: [
        "most_frequent",
        "first",
        "sum",
        "avg",
        "count",
        "max",
        "min",
      ],
      workspace_invites__status: ["pending", "accepted"],
    },
  },
} as const

