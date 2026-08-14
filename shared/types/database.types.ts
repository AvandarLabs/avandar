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
      catalog_entries__dataset_column: {
        Row: {
          cast_data_type: Database["public"]["Enums"]["datasets__duckdb_data_type"]
          catalog_entry_id: string
          column_name: string
          created_at: string | null
          display_order: number | null
          id: string
          original_data_type: string
          updated_at: string | null
        }
        Insert: {
          cast_data_type: Database["public"]["Enums"]["datasets__duckdb_data_type"]
          catalog_entry_id: string
          column_name: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          original_data_type: string
          updated_at?: string | null
        }
        Update: {
          cast_data_type?: Database["public"]["Enums"]["datasets__duckdb_data_type"]
          catalog_entry_id?: string
          column_name?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          original_data_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_entries__dataset_column_catalog_entry_id_fkey"
            columns: ["catalog_entry_id"]
            isOneToOne: false
            referencedRelation: "catalog_entries__open_data"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_entries__open_data: {
        Row: {
          canonical_urls: string[] | null
          coverage_end_date: string | null
          coverage_start_date: string | null
          created_at: string
          date_of_last_sync: string | null
          date_of_last_update: string | null
          description: string | null
          display_name: string
          external_dataset_id: string | null
          external_organization_name: string
          external_service_name: string | null
          id: string
          license: string | null
          metadata: Json | null
          notes: string | null
          parquet_file_name: string
          pipeline_name: string
          pipeline_run_id: string
          source_url: string | null
          update_frequency: string | null
          updated_at: string
        }
        Insert: {
          canonical_urls?: string[] | null
          coverage_end_date?: string | null
          coverage_start_date?: string | null
          created_at?: string
          date_of_last_sync?: string | null
          date_of_last_update?: string | null
          description?: string | null
          display_name: string
          external_dataset_id?: string | null
          external_organization_name: string
          external_service_name?: string | null
          id?: string
          license?: string | null
          metadata?: Json | null
          notes?: string | null
          parquet_file_name: string
          pipeline_name: string
          pipeline_run_id: string
          source_url?: string | null
          update_frequency?: string | null
          updated_at?: string
        }
        Update: {
          canonical_urls?: string[] | null
          coverage_end_date?: string | null
          coverage_start_date?: string | null
          created_at?: string
          date_of_last_sync?: string | null
          date_of_last_update?: string | null
          description?: string | null
          display_name?: string
          external_dataset_id?: string | null
          external_organization_name?: string
          external_service_name?: string | null
          id?: string
          license?: string | null
          metadata?: Json | null
          notes?: string | null
          parquet_file_name?: string
          pipeline_name?: string
          pipeline_run_id?: string
          source_url?: string | null
          update_frequency?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dashboards: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          is_restricted: boolean
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
          is_restricted?: boolean
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
          is_restricted?: boolean
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
          original_name: string
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
          original_name: string
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
          original_name?: string
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
          is_restricted: boolean
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
          is_restricted?: boolean
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
          is_restricted?: boolean
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
          is_in_cloud_storage: boolean
          newline_delimiter: string
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
          is_in_cloud_storage?: boolean
          newline_delimiter?: string
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
          is_in_cloud_storage?: boolean
          newline_delimiter?: string
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
      datasets__open_data: {
        Row: {
          catalog_entry_id: string
          created_at: string
          dataset_id: string
          id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          catalog_entry_id: string
          created_at?: string
          dataset_id: string
          id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          catalog_entry_id?: string
          created_at?: string
          dataset_id?: string
          id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "datasets__open_data_catalog_entry_id_fkey"
            columns: ["catalog_entry_id"]
            isOneToOne: false
            referencedRelation: "catalog_entries__open_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datasets__open_data_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: true
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datasets__open_data_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets__virtual: {
        Row: {
          created_at: string
          dataset_id: string
          id: string
          raw_sql: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          dataset_id: string
          id?: string
          raw_sql: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          dataset_id?: string
          id?: string
          raw_sql?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "datasets__virtual_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: true
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datasets__virtual_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets__xlsx_file: {
        Row: {
          created_at: string
          dataset_id: string
          date_format: string | null
          has_header: boolean
          id: string
          is_in_cloud_storage: boolean
          rows_to_skip: number
          sheet_name: string | null
          size_in_bytes: number
          timestamp_format: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          dataset_id: string
          date_format?: string | null
          has_header?: boolean
          id?: string
          is_in_cloud_storage?: boolean
          rows_to_skip?: number
          sheet_name?: string | null
          size_in_bytes: number
          timestamp_format?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          dataset_id?: string
          date_format?: string | null
          has_header?: boolean
          id?: string
          is_in_cloud_storage?: boolean
          rows_to_skip?: number
          sheet_name?: string | null
          size_in_bytes?: number
          timestamp_format?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "datasets__xlsx_file_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: true
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datasets__xlsx_file_workspace_id_fkey"
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
      resource_shares: {
        Row: {
          created_at: string
          id: string
          principal_id: string | null
          principal_type: Database["public"]["Enums"]["share_principal_type"]
          requires_app_access: boolean
          resource_id: string
          resource_type: Database["public"]["Enums"]["resource_type"]
          role: Database["public"]["Enums"]["role_level"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          principal_id?: string | null
          principal_type: Database["public"]["Enums"]["share_principal_type"]
          requires_app_access?: boolean
          resource_id: string
          resource_type: Database["public"]["Enums"]["resource_type"]
          role: Database["public"]["Enums"]["role_level"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          principal_id?: string | null
          principal_type?: Database["public"]["Enums"]["share_principal_type"]
          requires_app_access?: boolean
          resource_id?: string
          resource_type?: Database["public"]["Enums"]["resource_type"]
          role?: Database["public"]["Enums"]["role_level"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_shares_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      role_group_app_roles: {
        Row: {
          app: Database["public"]["Enums"]["app_type"]
          created_at: string
          id: string
          role: Database["public"]["Enums"]["role_level"]
          role_group_id: string
          updated_at: string
        }
        Insert: {
          app: Database["public"]["Enums"]["app_type"]
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["role_level"]
          role_group_id: string
          updated_at?: string
        }
        Update: {
          app?: Database["public"]["Enums"]["app_type"]
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["role_level"]
          role_group_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_group_app_roles_role_group_id_fkey"
            columns: ["role_group_id"]
            isOneToOne: false
            referencedRelation: "role_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      role_groups: {
        Row: {
          created_at: string
          id: string
          is_builtin: boolean
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_builtin?: boolean
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_builtin?: boolean
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_groups_workspace_id_fkey"
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
          id: string
          max_dashboards_allowed: number | null
          max_datasets_allowed: number | null
          max_seats_allowed: number
          max_shareable_dashboards_allowed: number | null
          polar_customer_email: string | null
          polar_customer_id: string | null
          polar_product_id: string | null
          polar_subscription_id: string | null
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
          id?: string
          max_dashboards_allowed?: number | null
          max_datasets_allowed?: number | null
          max_seats_allowed: number
          max_shareable_dashboards_allowed?: number | null
          polar_customer_email?: string | null
          polar_customer_id?: string | null
          polar_product_id?: string | null
          polar_subscription_id?: string | null
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
          id?: string
          max_dashboards_allowed?: number | null
          max_datasets_allowed?: number | null
          max_seats_allowed?: number
          max_shareable_dashboards_allowed?: number | null
          polar_customer_email?: string | null
          polar_customer_id?: string | null
          polar_product_id?: string | null
          polar_subscription_id?: string | null
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
      usage_analytics_events: {
        Row: {
          app: Database["public"]["Enums"]["app_type"] | null
          app_version: string | null
          client: Database["public"]["Enums"]["usage_analytics_events__client"]
          created_at: string
          event_category: Database["public"]["Enums"]["usage_analytics_events__category"]
          event_name: string
          id: string
          payload: Json | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          app?: Database["public"]["Enums"]["app_type"] | null
          app_version?: string | null
          client?: Database["public"]["Enums"]["usage_analytics_events__client"]
          created_at?: string
          event_category?: Database["public"]["Enums"]["usage_analytics_events__category"]
          event_name: string
          id?: string
          payload?: Json | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          app?: Database["public"]["Enums"]["app_type"] | null
          app_version?: string | null
          client?: Database["public"]["Enums"]["usage_analytics_events__client"]
          created_at?: string
          event_category?: Database["public"]["Enums"]["usage_analytics_events__category"]
          event_name?: string
          id?: string
          payload?: Json | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_analytics_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_group_memberships: {
        Row: {
          created_at: string
          id: string
          user_group_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_group_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_group_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_group_memberships_user_group_id_fkey"
            columns: ["user_group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_groups: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_groups_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
          invite_user_group_ids: string[]
          invited_by: string
          role: string
          role_group_id: string | null
          role_overrides: Json
          updated_at: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invite_status: Database["public"]["Enums"]["workspace_invites__status"]
          invite_user_group_ids?: string[]
          invited_by: string
          role: string
          role_group_id?: string | null
          role_overrides?: Json
          updated_at?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invite_status?: Database["public"]["Enums"]["workspace_invites__status"]
          invite_user_group_ids?: string[]
          invited_by?: string
          role?: string
          role_group_id?: string | null
          role_overrides?: Json
          updated_at?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_role_group_id_fkey"
            columns: ["role_group_id"]
            isOneToOne: false
            referencedRelation: "role_groups"
            referencedColumns: ["id"]
          },
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
          role_group_id: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_group_id?: string | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_group_id?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_memberships_role_group_id_fkey"
            columns: ["role_group_id"]
            isOneToOne: false
            referencedRelation: "role_groups"
            referencedColumns: ["id"]
          },
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
          p_is_in_cloud_storage: boolean
          p_newline_delimiter: string
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
          is_restricted: boolean
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
          is_restricted: boolean
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
          is_restricted: boolean
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
      rpc_datasets__add_open_data_dataset: {
        Args: {
          p_catalog_entry_id: string
          p_columns: Database["public"]["CompositeTypes"]["dataset_column_input"][]
          p_dataset_description: string
          p_dataset_id: string
          p_dataset_name: string
          p_workspace_id: string
        }
        Returns: {
          created_at: string
          date_of_last_sync: string | null
          description: string | null
          id: string
          is_restricted: boolean
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
      rpc_datasets__add_virtual_dataset: {
        Args: {
          p_columns: Database["public"]["CompositeTypes"]["dataset_column_input"][]
          p_dataset_description: string
          p_dataset_id: string
          p_dataset_name: string
          p_raw_sql: string
          p_workspace_id: string
        }
        Returns: {
          created_at: string
          date_of_last_sync: string | null
          description: string | null
          id: string
          is_restricted: boolean
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
      rpc_datasets__add_xlsx_file_dataset: {
        Args: {
          p_columns: Database["public"]["CompositeTypes"]["dataset_column_input"][]
          p_dataset_description: string
          p_dataset_id: string
          p_dataset_name: string
          p_date_format: Database["public"]["CompositeTypes"]["datasets__csv_file__date_format"]
          p_has_header: boolean
          p_is_in_cloud_storage: boolean
          p_rows_to_skip: number
          p_sheet_name: Database["public"]["CompositeTypes"]["util__nullable_text"]
          p_size_in_bytes: number
          p_workspace_id: string
        }
        Returns: {
          created_at: string
          date_of_last_sync: string | null
          description: string | null
          id: string
          is_restricted: boolean
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
      rpc_resources__transfer_ownership: {
        Args: {
          p_new_owner_id: string
          p_resource_id: string
          p_resource_type: Database["public"]["Enums"]["resource_type"]
        }
        Returns: undefined
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
      rpc_workspaces__private_resource_counts: {
        Args: { p_workspace_id: string }
        Returns: {
          private_dashboard_count: number
          private_dataset_count: number
          user_id: string
        }[]
      }
      rpc_workspaces__transfer_all_owned_resources: {
        Args: {
          p_from_user_id: string
          p_new_owner_id: string
          p_workspace_id: string
        }
        Returns: number
      }
      util__analytics_event_category: {
        Args: { p_event_name: string }
        Returns: Database["public"]["Enums"]["usage_analytics_events__category"]
      }
      util__auth_user_can_access_resource: {
        Args: {
          p_min_role: Database["public"]["Enums"]["role_level"]
          p_resource_id: string
          p_resource_type: Database["public"]["Enums"]["resource_type"]
        }
        Returns: boolean
      }
      util__auth_user_can_access_resource_in_workspace: {
        Args: {
          p_required_role: Database["public"]["Enums"]["role_level"]
          p_resource_id: string
          p_resource_type: Database["public"]["Enums"]["resource_type"]
          p_workspace_id: string
        }
        Returns: boolean
      }
      util__auth_user_can_delete_resource: {
        Args: {
          p_resource_id: string
          p_resource_type: Database["public"]["Enums"]["resource_type"]
        }
        Returns: boolean
      }
      util__auth_user_can_insert_workspace_resource: {
        Args: {
          p_owner_id: string
          p_resource_type: Database["public"]["Enums"]["resource_type"]
          p_workspace_id: string
        }
        Returns: boolean
      }
      util__auth_user_can_update_resource: {
        Args: {
          p_resource_id: string
          p_resource_type: Database["public"]["Enums"]["resource_type"]
        }
        Returns: boolean
      }
      util__auth_user_may_select_dashboard: {
        Args: { p_dashboard_id: string }
        Returns: boolean
      }
      util__auth_user_may_select_dataset: {
        Args: { p_dataset_id: string }
        Returns: boolean
      }
      util__auth_user_meets_min_app_role: {
        Args: {
          p_app: Database["public"]["Enums"]["app_type"]
          p_min_role: Database["public"]["Enums"]["role_level"]
          p_workspace_id: string
        }
        Returns: boolean
      }
      util__can_manage_workspace_settings: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
      util__get_auth_user_app_role: {
        Args: {
          p_app: Database["public"]["Enums"]["app_type"]
          p_workspace_id: string
        }
        Returns: Database["public"]["Enums"]["role_level"]
      }
      util__get_auth_user_owned_workspaces: { Args: never; Returns: string[] }
      util__get_auth_user_user_group_ids: {
        Args: { p_workspace_id: string }
        Returns: string[]
      }
      util__get_auth_user_workspaces: { Args: never; Returns: string[] }
      util__get_user_id_by_email: { Args: { p_email: string }; Returns: string }
      util__get_workspace_members: {
        Args: { workspace_id: string }
        Returns: string[]
      }
      util__has_non_owner_share: {
        Args: {
          p_owner_id: string
          p_resource_id: string
          p_resource_type: Database["public"]["Enums"]["resource_type"]
          p_workspace_id: string
        }
        Returns: boolean
      }
      util__is_resource_private_to_owner: {
        Args: {
          p_resource_id: string
          p_resource_type: Database["public"]["Enums"]["resource_type"]
        }
        Returns: boolean
      }
      util__is_settings_admin: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
      util__log_analytics_event: {
        Args: {
          p_app?: Database["public"]["Enums"]["app_type"]
          p_event_name: string
          p_payload?: Json
          p_user_id?: string
          p_workspace_id?: string
        }
        Returns: undefined
      }
      util__rank_to_role_level: {
        Args: { p_rank: number }
        Returns: Database["public"]["Enums"]["role_level"]
      }
      util__resource_effective_role: {
        Args: {
          p_resource_id: string
          p_resource_type: Database["public"]["Enums"]["resource_type"]
        }
        Returns: Database["public"]["Enums"]["role_level"]
      }
      util__resource_type_to_app_type: {
        Args: { p_resource_type: Database["public"]["Enums"]["resource_type"] }
        Returns: Database["public"]["Enums"]["app_type"]
      }
      util__role_level_rank: {
        Args: { p_role: Database["public"]["Enums"]["role_level"] }
        Returns: number
      }
      util__seed_builtin_role_groups_for_workspace: {
        Args: { p_workspace_id: string }
        Returns: undefined
      }
      util__storage_object_dataset_id: {
        Args: { p_object_name: string }
        Returns: string
      }
      util__storage_object_workspace_id: {
        Args: { p_object_name: string }
        Returns: string
      }
    }
    Enums: {
      app_type:
        | "data_sources"
        | "data_explorer"
        | "dashboards"
        | "settings"
        | "gis"
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
      datasets__source_type:
        | "csv_file"
        | "google_sheets"
        | "virtual"
        | "open_data"
        | "xlsx_file"
      entity_field_configs__value_extractor_type:
        | "dataset_column_value"
        | "manual_entry"
      resource_type: "dashboard" | "dataset"
      role_level: "viewer" | "editor" | "admin"
      share_principal_type: "user" | "user_group" | "workspace"
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
      usage_analytics_events__category:
        | "acquisition"
        | "activation"
        | "engagement"
        | "expansion"
        | "revenue"
        | "other"
      usage_analytics_events__client: "web" | "desktop" | "server" | "db"
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
        original_name: string | null
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
      app_type: [
        "data_sources",
        "data_explorer",
        "dashboards",
        "settings",
        "gis",
      ],
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
      datasets__source_type: [
        "csv_file",
        "google_sheets",
        "virtual",
        "open_data",
        "xlsx_file",
      ],
      entity_field_configs__value_extractor_type: [
        "dataset_column_value",
        "manual_entry",
      ],
      resource_type: ["dashboard", "dataset"],
      role_level: ["viewer", "editor", "admin"],
      share_principal_type: ["user", "user_group", "workspace"],
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
      usage_analytics_events__category: [
        "acquisition",
        "activation",
        "engagement",
        "expansion",
        "revenue",
        "other",
      ],
      usage_analytics_events__client: ["web", "desktop", "server", "db"],
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
